import { PublicKey } from "@solana/web3.js";
import type { ParsedTransactionWithMeta } from "@solana/web3.js";
import { connection, programId } from "./config";
import {
  deriveAssetPDA,
  deriveVaultPDA,
  deriveRevenueEpochPDA,
  deriveClaimPDA,
  deriveShareMintPDA,
} from "./pda";
import { logger } from "../logger";

const log = logger.child({ module: "solana-verification" });

// ============================================================================
// Configuration
// ============================================================================

/** Maximum retries for waiting for finalization */
const MAX_FINALIZATION_RETRIES = 5;

/** Delay between finalization retry attempts (ms) */
const FINALIZATION_RETRY_DELAY_MS = 2000;

// ============================================================================
// Error Types
// ============================================================================

export type VerificationErrorCode =
  | "TX_NOT_FOUND"
  | "TX_NOT_FINALIZED"
  | "TX_FAILED"
  | "WRONG_PROGRAM"
  | "WRONG_SIGNER"
  | "WRONG_ACCOUNTS"
  | "WRONG_INSTRUCTION"
  | "WRONG_AMOUNT"
  | "ALREADY_CONFIRMED"
  | "SIGNATURE_INVALID"
  | "RPC_ERROR";

export interface VerificationError {
  code: VerificationErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface VerificationSuccess {
  valid: true;
  signature: string;
  slot: number;
  blockTime: number | null;
  fee: number;
  signers: string[];
}

export type VerificationResult =
  | VerificationSuccess
  | { valid: false; error: VerificationError };

// ============================================================================
// Validation Helpers
// ============================================================================

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;

/**
 * Validate a transaction signature format (base58, 64 bytes)
 */
export function isValidSignature(signature: string): boolean {
  return BASE58_REGEX.test(signature);
}

// ============================================================================
// Core Verification Functions
// ============================================================================

/**
 * Fetch and verify a transaction exists on-chain with finalized commitment
 */
export async function fetchAndVerifyTransaction(
  signature: string,
): Promise<{ tx: ParsedTransactionWithMeta; slot: number } | VerificationError> {
  if (!isValidSignature(signature)) {
    return {
      code: "SIGNATURE_INVALID",
      message: `Invalid signature format: ${signature.slice(0, 20)}...`,
    };
  }

  try {
    // Use finalized commitment for security
    const tx = await connection.getParsedTransaction(signature, {
      commitment: "finalized",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      // Check if it exists but not finalized
      const confirmedTx = await connection.getParsedTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (confirmedTx) {
        return {
          code: "TX_NOT_FINALIZED",
          message: "Transaction exists but is not yet finalized. Please wait.",
        };
      }

      return {
        code: "TX_NOT_FOUND",
        message: `Transaction not found on-chain: ${signature}`,
      };
    }

    // Check if transaction succeeded
    if (tx.meta?.err) {
      return {
        code: "TX_FAILED",
        message: `Transaction failed on-chain: ${JSON.stringify(tx.meta.err)}`,
        details: { error: tx.meta.err },
      };
    }

    return { tx, slot: tx.slot };
  } catch (err) {
    // Check for specific RPC errors that indicate the signature is invalid/not found
    const errMsg = err instanceof Error ? err.message : String(err);
    
    // Surfpool and validators return specific errors for invalid signatures
    if (errMsg.includes("Invalid signature") || errMsg.includes("invalid signature")) {
      return {
        code: "TX_NOT_FOUND",
        message: `Transaction not found (invalid signature): ${signature}`,
      };
    }

    log.error({ err, signature }, "RPC error while fetching transaction");
    return {
      code: "RPC_ERROR",
      message: `Failed to fetch transaction: ${errMsg}`,
    };
  }
}

/**
 * Fetch and verify a transaction with automatic retry for finalization
 * Useful when the transaction was just submitted and may not be finalized yet
 */
export async function fetchAndVerifyTransactionWithRetry(
  signature: string,
  maxRetries = MAX_FINALIZATION_RETRIES,
): Promise<{ tx: ParsedTransactionWithMeta; slot: number } | VerificationError> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await fetchAndVerifyTransaction(signature);
    
    // If successful or error is not "not finalized", return immediately
    if (!("code" in result) || result.code !== "TX_NOT_FINALIZED") {
      return result;
    }

    // Transaction exists but not finalized - wait and retry
    if (attempt < maxRetries) {
      log.info(
        { signature, attempt: attempt + 1, maxRetries },
        "Transaction not finalized, waiting to retry"
      );
      await new Promise((resolve) => setTimeout(resolve, FINALIZATION_RETRY_DELAY_MS));
    }
  }

  return {
    code: "TX_NOT_FINALIZED",
    message: `Transaction still not finalized after ${maxRetries} retries: ${signature}`,
  };
}

/**
 * Verify that a specific wallet signed the transaction
 */
export function verifyTransactionSigner(
  tx: ParsedTransactionWithMeta,
  expectedSigner: string,
): VerificationError | null {
  const message = tx.transaction.message;
  const accountKeys = message.accountKeys;

  // Find signers (accounts with signer=true)
  const signers = accountKeys
    .filter((acc) => acc.signer)
    .map((acc) => acc.pubkey.toBase58());

  if (!signers.includes(expectedSigner)) {
    return {
      code: "WRONG_SIGNER",
      message: `Expected signer ${expectedSigner} not found in transaction signers`,
      details: { expectedSigner, actualSigners: signers },
    };
  }

  return null;
}

/**
 * Verify that the correct program was invoked
 */
export function verifyProgramInvoked(
  tx: ParsedTransactionWithMeta,
  expectedProgramId?: string,
): VerificationError | null {
  const targetProgram = expectedProgramId ?? programId;
  if (!targetProgram) {
    return {
      code: "WRONG_PROGRAM",
      message: "No program ID configured for verification",
    };
  }

  const instructions = tx.transaction.message.instructions;

  // Check if any instruction invokes our program
  const programInvoked = instructions.some((ix) => {
    if ("programId" in ix) {
      return ix.programId.toBase58() === targetProgram;
    }
    return false;
  });

  // Also check inner instructions
  const innerInstructions = tx.meta?.innerInstructions ?? [];
  const innerProgramInvoked = innerInstructions.some((inner) =>
    inner.instructions.some((ix) => {
      if ("programId" in ix) {
        return ix.programId.toBase58() === targetProgram;
      }
      return false;
    }),
  );

  if (!programInvoked && !innerProgramInvoked) {
    return {
      code: "WRONG_PROGRAM",
      message: `Expected program ${targetProgram} was not invoked`,
      details: {
        expectedProgram: targetProgram,
        invokedPrograms: instructions.map((ix) =>
          "programId" in ix ? ix.programId.toBase58() : "unknown",
        ),
      },
    };
  }

  return null;
}

/**
 * Extract account keys from a transaction that match expected PDAs
 */
export function verifyAccountsMatch(
  tx: ParsedTransactionWithMeta,
  expectedAccounts: { name: string; pubkey: string }[],
): VerificationError | null {
  const accountKeys = tx.transaction.message.accountKeys.map((acc) =>
    acc.pubkey.toBase58(),
  );

  for (const expected of expectedAccounts) {
    if (!accountKeys.includes(expected.pubkey)) {
      return {
        code: "WRONG_ACCOUNTS",
        message: `Expected account ${expected.name} (${expected.pubkey}) not found in transaction`,
        details: {
          expectedAccount: expected,
          transactionAccounts: accountKeys,
        },
      };
    }
  }

  return null;
}

// ============================================================================
// Transaction-Type-Specific Verification
// ============================================================================

export interface InvestmentVerificationParams {
  expectedSigner: string;
  assetId: string;
  amountUsdc: number;
  sharesToReceive?: number;
}

/**
 * Verify an investment (buy_shares) transaction
 */
export async function verifyInvestmentTransaction(
  signature: string,
  params: InvestmentVerificationParams,
): Promise<VerificationResult> {
  log.info({ signature, params }, "Verifying investment transaction");

  // 1. Fetch and verify transaction exists
  const fetchResult = await fetchAndVerifyTransaction(signature);
  if ("code" in fetchResult) {
    log.warn({ signature, error: fetchResult }, "Transaction fetch failed");
    return { valid: false, error: fetchResult };
  }

  const { tx, slot } = fetchResult;

  // 2. Verify signer
  const signerError = verifyTransactionSigner(tx, params.expectedSigner);
  if (signerError) {
    log.warn({ signature, error: signerError }, "Signer verification failed");
    return { valid: false, error: signerError };
  }

  // 3. Verify program was invoked
  const programError = verifyProgramInvoked(tx);
  if (programError) {
    log.warn({ signature, error: programError }, "Program verification failed");
    return { valid: false, error: programError };
  }

  // 4. Verify expected accounts (PDAs)
  try {
    const assetPda = deriveAssetPDA({ assetId: params.assetId });
    const vaultPda = deriveVaultPDA({ assetId: params.assetId });
    const shareMintPda = deriveShareMintPDA(params.assetId);

    const accountsError = verifyAccountsMatch(tx, [
      { name: "asset", pubkey: assetPda.publicKey.toBase58() },
      { name: "vault", pubkey: vaultPda.publicKey.toBase58() },
      { name: "shareMint", pubkey: shareMintPda.publicKey.toBase58() },
    ]);

    if (accountsError) {
      log.warn({ signature, error: accountsError }, "Accounts verification failed");
      return { valid: false, error: accountsError };
    }
  } catch (err) {
    log.error({ err, signature }, "PDA derivation failed during verification");
    return {
      valid: false,
      error: {
        code: "WRONG_ACCOUNTS",
        message: `PDA derivation failed: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }

  // 5. Success
  const signers = tx.transaction.message.accountKeys
    .filter((acc) => acc.signer)
    .map((acc) => acc.pubkey.toBase58());

  log.info({ signature, slot, signers }, "Investment transaction verified successfully");

  return {
    valid: true,
    signature,
    slot,
    blockTime: tx.blockTime ?? null,
    fee: tx.meta?.fee ?? 0,
    signers,
  };
}

export interface ClaimVerificationParams {
  expectedSigner: string;
  assetId: string;
  epochNumber: number;
  claimAmountUsdc: number;
}

/**
 * Verify a claim (claim_yield) transaction
 */
export async function verifyClaimTransaction(
  signature: string,
  params: ClaimVerificationParams,
): Promise<VerificationResult> {
  log.info({ signature, params }, "Verifying claim transaction");

  // 1. Fetch and verify transaction exists
  const fetchResult = await fetchAndVerifyTransaction(signature);
  if ("code" in fetchResult) {
    log.warn({ signature, error: fetchResult }, "Transaction fetch failed");
    return { valid: false, error: fetchResult };
  }

  const { tx, slot } = fetchResult;

  // 2. Verify signer
  const signerError = verifyTransactionSigner(tx, params.expectedSigner);
  if (signerError) {
    log.warn({ signature, error: signerError }, "Signer verification failed");
    return { valid: false, error: signerError };
  }

  // 3. Verify program was invoked
  const programError = verifyProgramInvoked(tx);
  if (programError) {
    log.warn({ signature, error: programError }, "Program verification failed");
    return { valid: false, error: programError };
  }

  // 4. Verify expected accounts (PDAs)
  try {
    const claimantPubkey = new PublicKey(params.expectedSigner);
    const assetPda = deriveAssetPDA({ assetId: params.assetId });
    const vaultPda = deriveVaultPDA({ assetId: params.assetId });
    const revenueEpochPda = deriveRevenueEpochPDA({
      assetId: params.assetId,
      epochNumber: params.epochNumber,
    });
    const claimPda = deriveClaimPDA({
      assetId: params.assetId,
      userPubkey: claimantPubkey,
      epochNumber: params.epochNumber,
    });

    const accountsError = verifyAccountsMatch(tx, [
      { name: "asset", pubkey: assetPda.publicKey.toBase58() },
      { name: "vault", pubkey: vaultPda.publicKey.toBase58() },
      { name: "revenueEpoch", pubkey: revenueEpochPda.publicKey.toBase58() },
      { name: "claim", pubkey: claimPda.publicKey.toBase58() },
    ]);

    if (accountsError) {
      log.warn({ signature, error: accountsError }, "Accounts verification failed");
      return { valid: false, error: accountsError };
    }
  } catch (err) {
    log.error({ err, signature }, "PDA derivation failed during verification");
    return {
      valid: false,
      error: {
        code: "WRONG_ACCOUNTS",
        message: `PDA derivation failed: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }

  // 5. Success
  const signers = tx.transaction.message.accountKeys
    .filter((acc) => acc.signer)
    .map((acc) => acc.pubkey.toBase58());

  log.info({ signature, slot, signers }, "Claim transaction verified successfully");

  return {
    valid: true,
    signature,
    slot,
    blockTime: tx.blockTime ?? null,
    fee: tx.meta?.fee ?? 0,
    signers,
  };
}

export interface RevenuePostVerificationParams {
  expectedSigner: string;
  assetId: string;
  epochNumber: number;
  amountUsdc?: number;
}

/**
 * Verify a revenue posting (post_revenue) transaction
 */
export async function verifyRevenuePostTransaction(
  signature: string,
  params: RevenuePostVerificationParams,
): Promise<VerificationResult> {
  log.info({ signature, params }, "Verifying revenue post transaction");

  // 1. Fetch and verify transaction exists
  const fetchResult = await fetchAndVerifyTransaction(signature);
  if ("code" in fetchResult) {
    log.warn({ signature, error: fetchResult }, "Transaction fetch failed");
    return { valid: false, error: fetchResult };
  }

  const { tx, slot } = fetchResult;

  // 2. Verify signer
  const signerError = verifyTransactionSigner(tx, params.expectedSigner);
  if (signerError) {
    log.warn({ signature, error: signerError }, "Signer verification failed");
    return { valid: false, error: signerError };
  }

  // 3. Verify program was invoked
  const programError = verifyProgramInvoked(tx);
  if (programError) {
    log.warn({ signature, error: programError }, "Program verification failed");
    return { valid: false, error: programError };
  }

  // 4. Verify expected accounts (PDAs)
  try {
    const assetPda = deriveAssetPDA({ assetId: params.assetId });
    const vaultPda = deriveVaultPDA({ assetId: params.assetId });
    const revenueEpochPda = deriveRevenueEpochPDA({
      assetId: params.assetId,
      epochNumber: params.epochNumber,
    });

    const accountsError = verifyAccountsMatch(tx, [
      { name: "asset", pubkey: assetPda.publicKey.toBase58() },
      { name: "vault", pubkey: vaultPda.publicKey.toBase58() },
      { name: "revenueEpoch", pubkey: revenueEpochPda.publicKey.toBase58() },
    ]);

    if (accountsError) {
      log.warn({ signature, error: accountsError }, "Accounts verification failed");
      return { valid: false, error: accountsError };
    }
  } catch (err) {
    log.error({ err, signature }, "PDA derivation failed during verification");
    return {
      valid: false,
      error: {
        code: "WRONG_ACCOUNTS",
        message: `PDA derivation failed: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }

  // 5. Success
  const signers = tx.transaction.message.accountKeys
    .filter((acc) => acc.signer)
    .map((acc) => acc.pubkey.toBase58());

  log.info({ signature, slot, signers }, "Revenue post transaction verified successfully");

  return {
    valid: true,
    signature,
    slot,
    blockTime: tx.blockTime ?? null,
    fee: tx.meta?.fee ?? 0,
    signers,
  };
}
