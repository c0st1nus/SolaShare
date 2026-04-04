import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { connection, programId } from "./config";
import {
  deriveAssetPDA,
  deriveVaultPDA,
  deriveRevenueEpochPDA,
  deriveClaimPDA,
  deriveShareMintPDA,
} from "./pda";
import {
  createVersionedTransaction,
  createComputeBudgetInstructions,
  serializeTransaction,
} from "./utils";
import { logger } from "../logger";

const log = logger.child({ module: "solana-transactions" });

/** Default priority fee in micro-lamports */
const DEFAULT_PRIORITY_FEE = 50_000;

/** Default compute unit limit */
const DEFAULT_COMPUTE_UNITS = 200_000;

/** Blockhash validity (~150 blocks, ~1 minute) */
const BLOCKHASH_EXPIRY_MS = 60_000;

/** Instruction discriminators (8-byte Anchor-style) */
const INSTRUCTION_DISCRIMINATORS = {
  buyShares: Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  postRevenue: Buffer.from([0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
  claimYield: Buffer.from([0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
};

/**
 * Standard transaction payload returned by all prepare endpoints
 */
export interface TransactionPayload {
  success: true;
  operation_id: string;
  serialized_tx: string;
  metadata: TransactionMetadata;
  expires_at: number;
  network: "devnet" | "mainnet" | "localnet";
}

export type TransactionMetadata =
  | InvestmentMetadata
  | RevenuePostMetadata
  | ClaimMetadata;

export interface InvestmentMetadata {
  kind: "investment";
  asset_id: string;
  amount_usdc: number;
  shares_to_receive: number;
}

export interface RevenuePostMetadata {
  kind: "revenue_post";
  asset_id: string;
  revenue_epoch_id: string;
  epoch_number: number;
  amount_usdc: number;
}

export interface ClaimMetadata {
  kind: "claim";
  asset_id: string;
  revenue_epoch_id: string;
  epoch_number: number;
  claim_amount_usdc: number;
}

/**
 * Get the program ID as a PublicKey, throwing if not configured
 */
function getProgramId(): PublicKey {
  if (!programId) {
    throw new Error("SOLANA_PROGRAM_ID not configured");
  }
  return new PublicKey(programId);
}

/**
 * Detect current network from RPC URL
 */
function detectNetwork(): "devnet" | "mainnet" | "localnet" {
  const rpcUrl = connection.rpcEndpoint.toLowerCase();
  if (rpcUrl.includes("mainnet")) return "mainnet";
  if (rpcUrl.includes("localhost") || rpcUrl.includes("127.0.0.1")) return "localnet";
  return "devnet";
}

/**
 * Build the buy_shares instruction for an investment
 */
export function buildBuySharesInstruction(params: {
  assetId: string;
  investorPubkey: PublicKey;
  amountUsdc: number;
  sharesToReceive: number;
}): TransactionInstruction {
  const program = getProgramId();
  const { assetId, investorPubkey, amountUsdc, sharesToReceive } = params;

  // Derive PDAs
  const assetPda = deriveAssetPDA({ assetId });
  const vaultPda = deriveVaultPDA({ assetId });
  const shareMintPda = deriveShareMintPDA(assetId);

  // Get investor's associated token account for share tokens
  const investorShareAccount = getAssociatedTokenAddressSync(
    shareMintPda.publicKey,
    investorPubkey,
  );

  // Build instruction data: discriminator + amount (u64) + shares (u64)
  const data = Buffer.alloc(8 + 8 + 8);
  INSTRUCTION_DISCRIMINATORS.buyShares.copy(data, 0);
  data.writeBigUInt64LE(BigInt(Math.round(amountUsdc * 1_000_000)), 8); // USDC has 6 decimals
  data.writeBigUInt64LE(BigInt(Math.round(sharesToReceive * 1_000_000)), 16); // Share decimals

  return new TransactionInstruction({
    programId: program,
    keys: [
      { pubkey: assetPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: vaultPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: shareMintPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: investorPubkey, isSigner: true, isWritable: true },
      { pubkey: investorShareAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build the post_revenue instruction for a revenue epoch
 */
export function buildPostRevenueInstruction(params: {
  assetId: string;
  issuerPubkey: PublicKey;
  epochNumber: number;
  amountUsdc: number;
  reportHash: string;
}): TransactionInstruction {
  const program = getProgramId();
  const { assetId, issuerPubkey, epochNumber, amountUsdc, reportHash } = params;

  // Derive PDAs
  const assetPda = deriveAssetPDA({ assetId });
  const vaultPda = deriveVaultPDA({ assetId });
  const revenueEpochPda = deriveRevenueEpochPDA({ assetId, epochNumber });

  // Build instruction data: discriminator + epoch (u64) + amount (u64) + report_hash (32 bytes)
  const reportHashBytes = Buffer.from(reportHash.slice(0, 64).padEnd(64, "0"), "hex");
  const data = Buffer.alloc(8 + 8 + 8 + 32);
  INSTRUCTION_DISCRIMINATORS.postRevenue.copy(data, 0);
  data.writeBigUInt64LE(BigInt(epochNumber), 8);
  data.writeBigUInt64LE(BigInt(Math.round(amountUsdc * 1_000_000)), 16);
  reportHashBytes.copy(data, 24);

  return new TransactionInstruction({
    programId: program,
    keys: [
      { pubkey: assetPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: vaultPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: revenueEpochPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: issuerPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build the claim_yield instruction for claiming revenue
 */
export function buildClaimYieldInstruction(params: {
  assetId: string;
  claimantPubkey: PublicKey;
  epochNumber: number;
  claimAmountUsdc: number;
}): TransactionInstruction {
  const program = getProgramId();
  const { assetId, claimantPubkey, epochNumber, claimAmountUsdc } = params;

  // Derive PDAs
  const assetPda = deriveAssetPDA({ assetId });
  const vaultPda = deriveVaultPDA({ assetId });
  const revenueEpochPda = deriveRevenueEpochPDA({ assetId, epochNumber });
  const claimPda = deriveClaimPDA({ assetId, userPubkey: claimantPubkey, epochNumber });
  const shareMintPda = deriveShareMintPDA(assetId);

  // Get claimant's share token account (for ownership verification)
  const claimantShareAccount = getAssociatedTokenAddressSync(
    shareMintPda.publicKey,
    claimantPubkey,
  );

  // Build instruction data: discriminator + epoch (u64) + amount (u64)
  const data = Buffer.alloc(8 + 8 + 8);
  INSTRUCTION_DISCRIMINATORS.claimYield.copy(data, 0);
  data.writeBigUInt64LE(BigInt(epochNumber), 8);
  data.writeBigUInt64LE(BigInt(Math.round(claimAmountUsdc * 1_000_000)), 16);

  return new TransactionInstruction({
    programId: program,
    keys: [
      { pubkey: assetPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: vaultPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: revenueEpochPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: claimPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: shareMintPda.publicKey, isSigner: false, isWritable: false },
      { pubkey: claimantPubkey, isSigner: true, isWritable: true },
      { pubkey: claimantShareAccount, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Build a complete transaction payload for client signing
 */
export async function buildTransactionPayload<T extends TransactionMetadata>(
  operationId: string,
  payer: PublicKey,
  instructions: TransactionInstruction[],
  metadata: T,
  priorityFee = DEFAULT_PRIORITY_FEE,
  computeUnits = DEFAULT_COMPUTE_UNITS,
): Promise<TransactionPayload> {
  // Add compute budget instructions for priority
  const computeBudgetIxs = createComputeBudgetInstructions(priorityFee, computeUnits);
  const allInstructions = [...computeBudgetIxs, ...instructions];

  // Build the versioned transaction
  const transaction = await createVersionedTransaction(allInstructions, payer);

  // Serialize for client
  const serializedTx = serializeTransaction(transaction);

  // Calculate expiry
  const expiresAt = Date.now() + BLOCKHASH_EXPIRY_MS;

  log.debug(
    {
      operationId,
      kind: metadata.kind,
      network: detectNetwork(),
      instructionCount: allInstructions.length,
    },
    "Built transaction payload",
  );

  return {
    success: true,
    operation_id: operationId,
    serialized_tx: serializedTx,
    metadata,
    expires_at: expiresAt,
    network: detectNetwork(),
  };
}

/**
 * Prepare an investment transaction for client signing
 */
export async function prepareInvestmentTransaction(params: {
  operationId: string;
  assetId: string;
  investorWalletAddress: string;
  amountUsdc: number;
  sharesToReceive: number;
}): Promise<TransactionPayload> {
  const { operationId, assetId, investorWalletAddress, amountUsdc, sharesToReceive } = params;

  const investorPubkey = new PublicKey(investorWalletAddress);

  const instruction = buildBuySharesInstruction({
    assetId,
    investorPubkey,
    amountUsdc,
    sharesToReceive,
  });

  const metadata: InvestmentMetadata = {
    kind: "investment",
    asset_id: assetId,
    amount_usdc: amountUsdc,
    shares_to_receive: sharesToReceive,
  };

  return buildTransactionPayload(operationId, investorPubkey, [instruction], metadata);
}

/**
 * Prepare a revenue posting transaction for issuer signing
 */
export async function prepareRevenuePostTransaction(params: {
  operationId: string;
  assetId: string;
  issuerWalletAddress: string;
  epochNumber: number;
  amountUsdc: number;
  reportHash: string;
}): Promise<TransactionPayload> {
  const {
    operationId,
    assetId,
    issuerWalletAddress,
    epochNumber,
    amountUsdc,
    reportHash,
  } = params;

  const issuerPubkey = new PublicKey(issuerWalletAddress);

  const instruction = buildPostRevenueInstruction({
    assetId,
    issuerPubkey,
    epochNumber,
    amountUsdc,
    reportHash,
  });

  const metadata: RevenuePostMetadata = {
    kind: "revenue_post",
    asset_id: assetId,
    revenue_epoch_id: operationId,
    epoch_number: epochNumber,
    amount_usdc: amountUsdc,
  };

  return buildTransactionPayload(operationId, issuerPubkey, [instruction], metadata);
}

/**
 * Prepare a claim transaction for investor signing
 */
export async function prepareClaimTransaction(params: {
  operationId: string;
  assetId: string;
  claimantWalletAddress: string;
  epochNumber: number;
  claimAmountUsdc: number;
  revenueEpochId: string;
}): Promise<TransactionPayload> {
  const {
    operationId,
    assetId,
    claimantWalletAddress,
    epochNumber,
    claimAmountUsdc,
    revenueEpochId,
  } = params;

  const claimantPubkey = new PublicKey(claimantWalletAddress);

  const instruction = buildClaimYieldInstruction({
    assetId,
    claimantPubkey,
    epochNumber,
    claimAmountUsdc,
  });

  const metadata: ClaimMetadata = {
    kind: "claim",
    asset_id: assetId,
    revenue_epoch_id: revenueEpochId,
    epoch_number: epochNumber,
    claim_amount_usdc: claimAmountUsdc,
  };

  return buildTransactionPayload(operationId, claimantPubkey, [instruction], metadata);
}
