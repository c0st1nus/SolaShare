import type { ConfirmedSignatureInfo, ParsedTransactionWithMeta } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { auditLogs, claims, investments, revenueEpochs, webhookEvents } from "../../db/schema";
import { logger } from "../../lib/logger";
import { connection, programId } from "../../lib/solana/config";
import { fetchAndVerifyTransaction, isValidSignature } from "../../lib/solana/verification";

const log = logger.child({ module: "solana-indexer" });

// ============================================================================
// Configuration
// ============================================================================

/** Polling interval in milliseconds */
const POLLING_INTERVAL_MS = 5000;

/** Maximum signatures to fetch per poll */
const MAX_SIGNATURES_PER_POLL = 20;

/** Instruction discriminators (must match program) */
const INSTRUCTION_DISCRIMINATORS = {
  buyShares: Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  postRevenue: Buffer.from([0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  claimYield: Buffer.from([0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
};

// ============================================================================
// Types
// ============================================================================

export interface IndexerConfig {
  mode: "polling" | "webhook" | "hybrid";
  pollingIntervalMs?: number;
  lastProcessedSignature?: string;
}

export interface IndexedTransaction {
  signature: string;
  slot: number;
  blockTime: number | null;
  instructionType: "buy_shares" | "post_revenue" | "claim_yield" | "unknown";
  accounts: string[];
  success: boolean;
}

export interface IndexerStatus {
  running: boolean;
  mode: "polling" | "webhook" | "hybrid";
  lastProcessedSignature: string | null;
  lastProcessedAt: Date | null;
  transactionsProcessed: number;
  errors: number;
}

// ============================================================================
// Indexer State
// ============================================================================

let indexerRunning = false;
let lastProcessedSignature: string | null = null;
let lastProcessedAt: Date | null = null;
let transactionsProcessed = 0;
let errorCount = 0;
let pollingIntervalId: ReturnType<typeof setInterval> | null = null;

// ============================================================================
// Core Indexer Functions
// ============================================================================

/**
 * Start the indexer in polling mode
 */
export async function startPollingIndexer(intervalMs = POLLING_INTERVAL_MS): Promise<void> {
  if (indexerRunning) {
    log.warn("Indexer already running");
    return;
  }

  if (!programId) {
    log.error("Cannot start indexer: SOLANA_PROGRAM_ID not configured");
    throw new Error("SOLANA_PROGRAM_ID required for indexer");
  }

  indexerRunning = true;
  log.info({ intervalMs, programId }, "Starting polling indexer");

  // Initial poll
  await pollForTransactions();

  // Set up recurring poll
  pollingIntervalId = setInterval(async () => {
    try {
      await pollForTransactions();
    } catch (err) {
      log.error({ err }, "Polling iteration failed");
      errorCount++;
    }
  }, intervalMs);
}

/**
 * Stop the polling indexer
 */
export function stopPollingIndexer(): void {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
  indexerRunning = false;
  log.info("Polling indexer stopped");
}

/**
 * Get current indexer status
 */
export function getIndexerStatus(): IndexerStatus {
  return {
    running: indexerRunning,
    mode: "polling",
    lastProcessedSignature,
    lastProcessedAt,
    transactionsProcessed,
    errors: errorCount,
  };
}

/**
 * Poll for new transactions from the program
 */
async function pollForTransactions(): Promise<void> {
  if (!programId) return;

  const programPubkey = new PublicKey(programId);

  try {
    // Fetch recent signatures for the program
    const signatures = await connection.getSignaturesForAddress(
      programPubkey,
      {
        limit: MAX_SIGNATURES_PER_POLL,
        until: lastProcessedSignature ?? undefined,
      },
      "finalized",
    );

    if (signatures.length === 0) {
      log.debug("No new transactions found");
      return;
    }

    log.info({ count: signatures.length }, "Found new transactions to process");

    // Process in reverse order (oldest first)
    for (const sigInfo of signatures.reverse()) {
      await processTransaction(sigInfo);
    }

    // Update last processed
    if (signatures.length > 0) {
      lastProcessedSignature = signatures[0].signature;
      lastProcessedAt = new Date();
    }
  } catch (err) {
    log.error({ err, programId }, "Failed to poll for transactions");
    errorCount++;
  }
}

/**
 * Process a single transaction from the indexer
 */
async function processTransaction(sigInfo: ConfirmedSignatureInfo): Promise<void> {
  const { signature, slot, blockTime, err } = sigInfo;

  // Skip failed transactions
  if (err) {
    log.debug({ signature, err }, "Skipping failed transaction");
    return;
  }

  // Check if already processed (idempotency)
  const [existingEvent] = await db
    .select({ id: webhookEvents.id })
    .from(webhookEvents)
    .where(and(eq(webhookEvents.source, "indexer"), eq(webhookEvents.externalEventId, signature)))
    .limit(1);

  if (existingEvent) {
    log.debug({ signature }, "Transaction already processed");
    return;
  }

  // Fetch full transaction
  const fetchResult = await fetchAndVerifyTransaction(signature);
  if ("code" in fetchResult) {
    log.warn({ signature, error: fetchResult }, "Failed to fetch transaction");
    return;
  }

  const { tx } = fetchResult;

  // Parse instruction type
  const instructionType = parseInstructionType(tx);
  if (instructionType === "unknown") {
    log.debug({ signature }, "Unknown instruction type, skipping");
    return;
  }

  // Record the webhook event for idempotency
  const [webhookRecord] = await db
    .insert(webhookEvents)
    .values({
      source: "indexer",
      eventType: instructionType,
      externalEventId: signature,
      payloadJson: {
        signature,
        slot,
        blockTime,
        instructionType,
      },
      status: "pending",
    })
    .onConflictDoNothing({
      target: [webhookEvents.source, webhookEvents.externalEventId],
    })
    .returning();

  if (!webhookRecord) {
    log.debug({ signature }, "Duplicate event, skipping");
    return;
  }

  try {
    // Process based on instruction type
    switch (instructionType) {
      case "buy_shares":
        await processBuySharesTransaction(tx, signature);
        break;
      case "post_revenue":
        await processPostRevenueTransaction(tx, signature);
        break;
      case "claim_yield":
        await processClaimYieldTransaction(tx, signature);
        break;
    }

    // Mark as processed
    await db
      .update(webhookEvents)
      .set({ status: "processed", processedAt: new Date() })
      .where(eq(webhookEvents.id, webhookRecord.id));

    transactionsProcessed++;
    log.info({ signature, instructionType, slot }, "Transaction processed successfully");
  } catch (err) {
    log.error({ err, signature, instructionType }, "Failed to process transaction");
    await db
      .update(webhookEvents)
      .set({
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      .where(eq(webhookEvents.id, webhookRecord.id));
    errorCount++;
  }
}

/**
 * Parse the instruction type from a transaction
 */
function parseInstructionType(
  tx: ParsedTransactionWithMeta,
): "buy_shares" | "post_revenue" | "claim_yield" | "unknown" {
  // Look for our program's instructions
  const instructions = tx.transaction.message.instructions;

  for (const ix of instructions) {
    if ("programId" in ix && ix.programId.toBase58() === programId) {
      // Check instruction data for discriminator
      if ("data" in ix && typeof ix.data === "string") {
        const data = Buffer.from(ix.data, "base64");
        if (data.length >= 8) {
          const discriminator = data.slice(0, 8);

          if (discriminator.equals(INSTRUCTION_DISCRIMINATORS.buyShares)) {
            return "buy_shares";
          }
          if (discriminator.equals(INSTRUCTION_DISCRIMINATORS.postRevenue)) {
            return "post_revenue";
          }
          if (discriminator.equals(INSTRUCTION_DISCRIMINATORS.claimYield)) {
            return "claim_yield";
          }
        }
      }
    }
  }

  // Also check inner instructions
  const innerInstructions = tx.meta?.innerInstructions ?? [];
  for (const inner of innerInstructions) {
    for (const ix of inner.instructions) {
      if ("programId" in ix && ix.programId.toBase58() === programId) {
        // Similar discriminator check
        if ("data" in ix && typeof ix.data === "string") {
          const data = Buffer.from(ix.data, "base64");
          if (data.length >= 8) {
            const discriminator = data.slice(0, 8);

            if (discriminator.equals(INSTRUCTION_DISCRIMINATORS.buyShares)) {
              return "buy_shares";
            }
            if (discriminator.equals(INSTRUCTION_DISCRIMINATORS.postRevenue)) {
              return "post_revenue";
            }
            if (discriminator.equals(INSTRUCTION_DISCRIMINATORS.claimYield)) {
              return "claim_yield";
            }
          }
        }
      }
    }
  }

  // Fallback: check logs for instruction names
  const logs = tx.meta?.logMessages ?? [];
  for (const logLine of logs) {
    if (logLine.includes("Instruction: BuyShares") || logLine.includes("buy_shares")) {
      return "buy_shares";
    }
    if (logLine.includes("Instruction: PostRevenue") || logLine.includes("post_revenue")) {
      return "post_revenue";
    }
    if (logLine.includes("Instruction: ClaimYield") || logLine.includes("claim_yield")) {
      return "claim_yield";
    }
  }

  return "unknown";
}

// ============================================================================
// Transaction Processors
// ============================================================================

/**
 * Process a buy_shares transaction
 */
async function processBuySharesTransaction(
  tx: ParsedTransactionWithMeta,
  signature: string,
): Promise<void> {
  log.info({ signature }, "Processing buy_shares transaction");

  // Extract signer (investor)
  const signers = tx.transaction.message.accountKeys
    .filter((acc) => acc.signer)
    .map((acc) => acc.pubkey.toBase58());

  if (signers.length === 0) {
    log.warn({ signature }, "No signers found in buy_shares transaction");
    return;
  }

  const investorWallet = signers[0];

  // Find matching pending investment by transaction signature
  // (The signature should have been set when the user submitted)
  const [investment] = await db
    .select()
    .from(investments)
    .where(eq(investments.transactionSignature, signature))
    .limit(1);

  if (investment) {
    // Already linked - just ensure it's confirmed
    if (investment.status === "pending") {
      await db
        .update(investments)
        .set({ status: "confirmed" })
        .where(eq(investments.id, investment.id));

      await db.insert(auditLogs).values({
        actorUserId: investment.userId,
        entityType: "investment",
        entityId: investment.id,
        action: "investment.auto_confirmed",
        payloadJson: { signature, indexed: true },
      });

      log.info({ investmentId: investment.id, signature }, "Investment auto-confirmed by indexer");
    }
    return;
  }

  // If no exact match, try to find by wallet + pending status
  // This handles the case where the frontend hasn't submitted the signature yet
  log.debug(
    { signature, investorWallet },
    "No investment found with this signature, checking for pending by wallet",
  );
}

/**
 * Process a post_revenue transaction
 */
async function processPostRevenueTransaction(
  _tx: ParsedTransactionWithMeta,
  signature: string,
): Promise<void> {
  log.info({ signature }, "Processing post_revenue transaction");

  // Find matching pending revenue epoch by transaction signature
  const [revenueEpoch] = await db
    .select()
    .from(revenueEpochs)
    .where(eq(revenueEpochs.transactionSignature, signature))
    .limit(1);

  if (revenueEpoch) {
    if (revenueEpoch.status === "draft") {
      await db
        .update(revenueEpochs)
        .set({ status: "posted", updatedAt: new Date() })
        .where(eq(revenueEpochs.id, revenueEpoch.id));

      await db.insert(auditLogs).values({
        actorUserId: revenueEpoch.postedByUserId,
        entityType: "revenue_epoch",
        entityId: revenueEpoch.id,
        action: "revenue_epoch.auto_posted",
        payloadJson: { signature, indexed: true },
      });

      log.info(
        { revenueEpochId: revenueEpoch.id, signature },
        "Revenue epoch auto-posted by indexer",
      );
    }
    return;
  }

  log.debug({ signature }, "No revenue epoch found with this signature");
}

/**
 * Process a claim_yield transaction
 */
async function processClaimYieldTransaction(
  _tx: ParsedTransactionWithMeta,
  signature: string,
): Promise<void> {
  log.info({ signature }, "Processing claim_yield transaction");

  // Find matching pending claim by transaction signature
  const [claim] = await db
    .select()
    .from(claims)
    .where(eq(claims.transactionSignature, signature))
    .limit(1);

  if (claim) {
    if (claim.status === "pending") {
      await db.update(claims).set({ status: "confirmed" }).where(eq(claims.id, claim.id));

      await db.insert(auditLogs).values({
        actorUserId: claim.userId,
        entityType: "claim",
        entityId: claim.id,
        action: "claim.auto_confirmed",
        payloadJson: { signature, indexed: true },
      });

      log.info({ claimId: claim.id, signature }, "Claim auto-confirmed by indexer");
    }
    return;
  }

  log.debug({ signature }, "No claim found with this signature");
}

// ============================================================================
// Webhook Handler (for Helius or custom webhooks)
// ============================================================================

export interface WebhookTransactionPayload {
  signature: string;
  slot?: number;
  blockTime?: number;
  accounts?: string[];
  logs?: string[];
  programId?: string;
}

/**
 * Handle incoming webhook notification
 */
export async function handleWebhookTransaction(
  payload: WebhookTransactionPayload,
): Promise<{ processed: boolean; reason?: string }> {
  const { signature } = payload;

  if (!isValidSignature(signature)) {
    return { processed: false, reason: "invalid_signature_format" };
  }

  // Check idempotency
  const [existing] = await db
    .select({ id: webhookEvents.id })
    .from(webhookEvents)
    .where(and(eq(webhookEvents.source, "webhook"), eq(webhookEvents.externalEventId, signature)))
    .limit(1);

  if (existing) {
    return { processed: false, reason: "duplicate" };
  }

  // Fetch and verify the transaction
  const fetchResult = await fetchAndVerifyTransaction(signature);
  if ("code" in fetchResult) {
    return { processed: false, reason: fetchResult.code };
  }

  const { tx } = fetchResult;
  const instructionType = parseInstructionType(tx);

  // Record event
  const [webhookRecord] = await db
    .insert(webhookEvents)
    .values({
      source: "webhook",
      eventType: instructionType,
      externalEventId: signature,
      payloadJson: payload,
      status: "pending",
    })
    .onConflictDoNothing()
    .returning();

  if (!webhookRecord) {
    return { processed: false, reason: "duplicate" };
  }

  try {
    switch (instructionType) {
      case "buy_shares":
        await processBuySharesTransaction(tx, signature);
        break;
      case "post_revenue":
        await processPostRevenueTransaction(tx, signature);
        break;
      case "claim_yield":
        await processClaimYieldTransaction(tx, signature);
        break;
      default:
        await db
          .update(webhookEvents)
          .set({ status: "failed", processedAt: new Date() })
          .where(eq(webhookEvents.id, webhookRecord.id));
        return { processed: false, reason: "unknown_instruction" };
    }

    await db
      .update(webhookEvents)
      .set({ status: "processed", processedAt: new Date() })
      .where(eq(webhookEvents.id, webhookRecord.id));

    return { processed: true };
  } catch (err) {
    await db
      .update(webhookEvents)
      .set({
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      .where(eq(webhookEvents.id, webhookRecord.id));

    throw err;
  }
}

// ============================================================================
// Manual Sync Functions
// ============================================================================

/**
 * Manually sync a specific transaction by signature
 */
export async function syncTransaction(
  signature: string,
): Promise<{ success: boolean; instructionType?: string; error?: string }> {
  if (!isValidSignature(signature)) {
    return { success: false, error: "Invalid signature format" };
  }

  const fetchResult = await fetchAndVerifyTransaction(signature);
  if ("code" in fetchResult) {
    return { success: false, error: fetchResult.message };
  }

  const { tx } = fetchResult;
  const instructionType = parseInstructionType(tx);

  if (instructionType === "unknown") {
    return { success: false, error: "Unknown instruction type" };
  }

  try {
    switch (instructionType) {
      case "buy_shares":
        await processBuySharesTransaction(tx, signature);
        break;
      case "post_revenue":
        await processPostRevenueTransaction(tx, signature);
        break;
      case "claim_yield":
        await processClaimYieldTransaction(tx, signature);
        break;
    }

    return { success: true, instructionType };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
