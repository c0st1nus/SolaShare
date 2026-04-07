import { createHash } from "node:crypto";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  type VersionedTransaction,
} from "@solana/web3.js";
import { ApiError } from "../api-error";
import { logger } from "../logger";
import { connection, getUsdcMintAddress, payerKeypair, programId } from "./config";
import {
  deriveAssetPDA,
  deriveClaimPDA,
  deriveRevenueEpochPDA,
  deriveShareMintPDA,
  deriveVaultPDA,
} from "./pda";
import { resolveTokenProgramForMint, tokenProgramLabel } from "./token-program";
import {
  createComputeBudgetInstructions,
  createVersionedTransaction,
  serializeTransaction,
  signTransaction,
} from "./utils";

const log = logger.child({ module: "solana-transactions" });

const DEFAULT_PRIORITY_FEE = 50_000;
const DEFAULT_COMPUTE_UNITS = 200_000;
const BLOCKHASH_EXPIRY_MS = 60_000;
const USDC_DECIMALS = 6;
const SHARE_DECIMALS = 6;

function anchorDiscriminator(name: string): Buffer {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

const INSTRUCTION_DISCRIMINATORS = {
  createAsset: anchorDiscriminator("create_asset"),
  activateSale: anchorDiscriminator("activate_sale"),
  buyShares: anchorDiscriminator("buy_shares"),
  postRevenue: anchorDiscriminator("post_revenue"),
  claimYield: anchorDiscriminator("claim_yield"),
  withdrawFunds: anchorDiscriminator("withdraw_funds"),
};

export interface TransactionPayload {
  success: true;
  operation_id: string;
  serialized_tx: string;
  metadata: TransactionMetadata;
  expires_at: number;
  network: "devnet" | "mainnet" | "localnet";
}

export type TransactionMetadata =
  | AssetSetupMetadata
  | InvestmentMetadata
  | RevenuePostMetadata
  | ClaimMetadata
  | WithdrawMetadata;

export interface AssetSetupMetadata {
  kind: "asset_setup";
  asset_id: string;
  metadata_uri: string;
  total_shares: number;
  price_per_share_usdc: number;
  activate_sale: boolean;
}

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

export interface WithdrawMetadata {
  kind: "withdraw";
  asset_id: string;
  amount_usdc: number;
}

function getProgramId(): PublicKey {
  if (!programId) {
    throw new ApiError(500, "SOLANA_PROGRAM_ID_MISSING", "Solana program is not configured");
  }

  try {
    return new PublicKey(programId);
  } catch {
    throw new ApiError(500, "SOLANA_PROGRAM_ID_INVALID", "Solana program configuration is invalid");
  }
}

function getUsdcMintPubkey(): PublicKey {
  const usdcMintAddress = getUsdcMintAddress();
  if (!usdcMintAddress) {
    throw new ApiError(
      500,
      "SOLANA_USDC_MINT_MISSING",
      "SOLANA_USDC_MINT_ADDRESS is required for on-chain investment flows",
    );
  }

  try {
    return new PublicKey(usdcMintAddress);
  } catch {
    throw new ApiError(
      500,
      "SOLANA_USDC_MINT_INVALID",
      "SOLANA_USDC_MINT_ADDRESS is not a valid public key",
    );
  }
}

function parseWalletPublicKey(walletAddress: string, fieldLabel: string): PublicKey {
  try {
    return new PublicKey(walletAddress);
  } catch {
    throw new ApiError(
      409,
      "INVALID_WALLET_ADDRESS",
      `${fieldLabel} is not a valid Solana wallet address`,
    );
  }
}

function detectNetwork(): "devnet" | "mainnet" | "localnet" {
  const rpcUrl = connection.rpcEndpoint.toLowerCase();
  if (rpcUrl.includes("mainnet")) return "mainnet";
  if (rpcUrl.includes("localhost") || rpcUrl.includes("127.0.0.1")) return "localnet";
  return "devnet";
}

function encodeU64(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
}

function encodeString(value: string): Buffer {
  const bytes = Buffer.from(value, "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([length, bytes]);
}

function encodeCreateAssetData(params: {
  assetId: string;
  metadataUri: string;
  totalSharesAtomic: bigint;
  pricePerShareAtomic: bigint;
}) {
  return Buffer.concat([
    INSTRUCTION_DISCRIMINATORS.createAsset,
    encodeString(params.assetId),
    encodeString(params.metadataUri),
    encodeU64(params.totalSharesAtomic),
    encodeU64(params.pricePerShareAtomic),
  ]);
}

function encodeBuySharesData(amountUsdcAtomic: bigint, sharesToReceiveAtomic: bigint) {
  return Buffer.concat([
    INSTRUCTION_DISCRIMINATORS.buyShares,
    encodeU64(amountUsdcAtomic),
    encodeU64(sharesToReceiveAtomic),
  ]);
}

function encodePostRevenueData(epochNumber: number, amountUsdcAtomic: bigint, reportHash: Buffer) {
  return Buffer.concat([
    INSTRUCTION_DISCRIMINATORS.postRevenue,
    encodeU64(BigInt(epochNumber)),
    encodeU64(amountUsdcAtomic),
    reportHash,
  ]);
}

function encodeClaimYieldData(epochNumber: number, claimAmountUsdcAtomic: bigint) {
  return Buffer.concat([
    INSTRUCTION_DISCRIMINATORS.claimYield,
    encodeU64(BigInt(epochNumber)),
    encodeU64(claimAmountUsdcAtomic),
  ]);
}

function encodeWithdrawData(amountUsdcAtomic: bigint) {
  return Buffer.concat([INSTRUCTION_DISCRIMINATORS.withdrawFunds, encodeU64(amountUsdcAtomic)]);
}

function toAtomicUnits(value: number, decimals: number): bigint {
  return BigInt(Math.round(value * 10 ** decimals));
}

function reportHashToBuffer(reportHash: string): Buffer {
  const normalized = reportHash.startsWith("sha256:")
    ? reportHash.slice("sha256:".length)
    : reportHash;

  if (/^[a-f0-9]{64}$/i.test(normalized)) {
    return Buffer.from(normalized, "hex");
  }

  return createHash("sha256").update(reportHash, "utf8").digest();
}

function maybeSignWithPayer(transaction: VersionedTransaction): VersionedTransaction {
  if (!payerKeypair) {
    return transaction;
  }

  signTransaction(transaction, [payerKeypair]);
  return transaction;
}

export function buildCreateAssetInstruction(params: {
  assetId: string;
  issuerPubkey: PublicKey;
  metadataUri: string;
  totalShares: number;
  pricePerShareUsdc: number;
  tokenProgramPubkey?: PublicKey;
}): TransactionInstruction {
  const program = getProgramId();
  const paymentMint = getUsdcMintPubkey();
  const tokenProgram = params.tokenProgramPubkey ?? TOKEN_PROGRAM_ID;
  const { assetId, issuerPubkey, metadataUri, totalShares, pricePerShareUsdc } = params;
  const assetPda = deriveAssetPDA({ assetId });
  const shareMintPda = deriveShareMintPDA(assetId);
  const vaultPda = deriveVaultPDA({ assetId });

  return new TransactionInstruction({
    programId: program,
    keys: [
      { pubkey: issuerPubkey, isSigner: true, isWritable: true },
      { pubkey: assetPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: shareMintPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: vaultPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: paymentMint, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: encodeCreateAssetData({
      assetId,
      metadataUri,
      totalSharesAtomic: toAtomicUnits(totalShares, SHARE_DECIMALS),
      pricePerShareAtomic: toAtomicUnits(pricePerShareUsdc, USDC_DECIMALS),
    }),
  });
}

export function buildActivateSaleInstruction(params: {
  assetId: string;
  issuerPubkey: PublicKey;
}): TransactionInstruction {
  const program = getProgramId();
  const assetPda = deriveAssetPDA({ assetId: params.assetId });

  return new TransactionInstruction({
    programId: program,
    keys: [
      { pubkey: params.issuerPubkey, isSigner: true, isWritable: true },
      { pubkey: assetPda.publicKey, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(INSTRUCTION_DISCRIMINATORS.activateSale),
  });
}

export function buildBuySharesInstruction(params: {
  assetId: string;
  investorPubkey: PublicKey;
  amountUsdc: number;
  sharesToReceive: number;
  assetPubkey?: PublicKey;
  vaultPubkey?: PublicKey;
  shareMintPubkey?: PublicKey;
  paymentMintPubkey?: PublicKey;
  tokenProgramPubkey?: PublicKey;
}): TransactionInstruction {
  const program = getProgramId();
  const paymentMint = params.paymentMintPubkey ?? getUsdcMintPubkey();
  const tokenProgram = params.tokenProgramPubkey ?? TOKEN_PROGRAM_ID;
  const assetPda = params.assetPubkey ?? deriveAssetPDA({ assetId: params.assetId }).publicKey;
  const vaultPda = params.vaultPubkey ?? deriveVaultPDA({ assetId: params.assetId }).publicKey;
  const shareMintPda = params.shareMintPubkey ?? deriveShareMintPDA(params.assetId).publicKey;
  const investorShareAccount = getAssociatedTokenAddressSync(
    shareMintPda,
    params.investorPubkey,
    false,
    tokenProgram,
  );
  const investorUsdcAccount = getAssociatedTokenAddressSync(
    paymentMint,
    params.investorPubkey,
    false,
    tokenProgram,
  );

  return new TransactionInstruction({
    programId: program,
    keys: [
      { pubkey: params.investorPubkey, isSigner: true, isWritable: true },
      { pubkey: assetPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: shareMintPda, isSigner: false, isWritable: true },
      { pubkey: investorShareAccount, isSigner: false, isWritable: true },
      { pubkey: investorUsdcAccount, isSigner: false, isWritable: true },
      { pubkey: paymentMint, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ],
    data: encodeBuySharesData(
      toAtomicUnits(params.amountUsdc, USDC_DECIMALS),
      toAtomicUnits(params.sharesToReceive, SHARE_DECIMALS),
    ),
  });
}

export function buildPostRevenueInstruction(params: {
  assetId: string;
  issuerPubkey: PublicKey;
  epochNumber: number;
  amountUsdc: number;
  reportHash: string;
}): TransactionInstruction {
  const program = getProgramId();
  const assetPda = deriveAssetPDA({ assetId: params.assetId });
  const revenueEpochPda = deriveRevenueEpochPDA({
    assetId: params.assetId,
    epochNumber: params.epochNumber,
  });

  return new TransactionInstruction({
    programId: program,
    keys: [
      { pubkey: params.issuerPubkey, isSigner: true, isWritable: true },
      { pubkey: assetPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: revenueEpochPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: encodePostRevenueData(
      params.epochNumber,
      toAtomicUnits(params.amountUsdc, USDC_DECIMALS),
      reportHashToBuffer(params.reportHash),
    ),
  });
}

export function buildWithdrawInstruction(params: {
  assetId: string;
  issuerPubkey: PublicKey;
  amountUsdc: number;
  paymentMintPubkey?: PublicKey;
  tokenProgramPubkey?: PublicKey;
}): TransactionInstruction {
  const programId = getProgramId();
  const paymentMint = params.paymentMintPubkey ?? getUsdcMintPubkey();
  const tokenProgram = params.tokenProgramPubkey ?? TOKEN_PROGRAM_ID;
  const assetPda = deriveAssetPDA({ assetId: params.assetId }).publicKey;
  const vaultPda = deriveVaultPDA({ assetId: params.assetId }).publicKey;
  const issuerUsdcAccount = getAssociatedTokenAddressSync(
    paymentMint,
    params.issuerPubkey,
    false,
    tokenProgram,
  );

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: params.issuerPubkey, isSigner: true, isWritable: true },
      { pubkey: assetPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: issuerUsdcAccount, isSigner: false, isWritable: true },
      { pubkey: paymentMint, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
    ],
    data: encodeWithdrawData(toAtomicUnits(params.amountUsdc, USDC_DECIMALS)),
  });
}

export function buildClaimYieldInstruction(params: {
  assetId: string;
  claimantPubkey: PublicKey;
  epochNumber: number;
  claimAmountUsdc: number;
  paymentMintPubkey?: PublicKey;
  tokenProgramPubkey?: PublicKey;
}): TransactionInstruction {
  const program = getProgramId();
  const paymentMint = params.paymentMintPubkey ?? getUsdcMintPubkey();
  const tokenProgram = params.tokenProgramPubkey ?? TOKEN_PROGRAM_ID;
  const assetPda = deriveAssetPDA({ assetId: params.assetId });
  const vaultPda = deriveVaultPDA({ assetId: params.assetId });
  const revenueEpochPda = deriveRevenueEpochPDA({
    assetId: params.assetId,
    epochNumber: params.epochNumber,
  });
  const claimPda = deriveClaimPDA({
    assetId: params.assetId,
    userPubkey: params.claimantPubkey,
    epochNumber: params.epochNumber,
  });
  const claimantUsdcAccount = getAssociatedTokenAddressSync(
    paymentMint,
    params.claimantPubkey,
    false,
    tokenProgram,
  );

  return new TransactionInstruction({
    programId: program,
    keys: [
      { pubkey: params.claimantPubkey, isSigner: true, isWritable: true },
      { pubkey: assetPda.publicKey, isSigner: false, isWritable: false },
      { pubkey: revenueEpochPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: claimPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: vaultPda.publicKey, isSigner: false, isWritable: true },
      { pubkey: claimantUsdcAccount, isSigner: false, isWritable: true },
      { pubkey: paymentMint, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: encodeClaimYieldData(
      params.epochNumber,
      toAtomicUnits(params.claimAmountUsdc, USDC_DECIMALS),
    ),
  });
}

export async function buildTransactionPayload<T extends TransactionMetadata>(
  operationId: string,
  payer: PublicKey,
  instructions: TransactionInstruction[],
  metadata: T,
  priorityFee = DEFAULT_PRIORITY_FEE,
  computeUnits = DEFAULT_COMPUTE_UNITS,
): Promise<TransactionPayload> {
  const computeBudgetIxs = createComputeBudgetInstructions(priorityFee, computeUnits);
  const transaction = await createVersionedTransaction(
    [...computeBudgetIxs, ...instructions],
    payer,
  );
  const signedTransaction = maybeSignWithPayer(transaction);
  const serializedTx = serializeTransaction(signedTransaction);
  const expiresAt = Date.now() + BLOCKHASH_EXPIRY_MS;

  log.debug(
    {
      operationId,
      kind: metadata.kind,
      network: detectNetwork(),
      instructionCount: instructions.length,
      feePayer: payer.toBase58(),
      payerPreSigned: payerKeypair !== null,
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

export async function prepareAssetSetupTransaction(params: {
  operationId: string;
  assetId: string;
  issuerWalletAddress: string;
  metadataUri: string;
  totalShares: number;
  pricePerShareUsdc: number;
  activateSale: boolean;
}): Promise<TransactionPayload> {
  const issuerPubkey = parseWalletPublicKey(params.issuerWalletAddress, "Issuer wallet address");
  const paymentMint = getUsdcMintPubkey();
  const tokenProgram = await resolveTokenProgramForMint(paymentMint, "Payment", connection);
  const instructions = [
    buildCreateAssetInstruction({
      assetId: params.assetId,
      issuerPubkey,
      metadataUri: params.metadataUri,
      totalShares: params.totalShares,
      pricePerShareUsdc: params.pricePerShareUsdc,
      tokenProgramPubkey: tokenProgram,
    }),
  ];

  if (params.activateSale) {
    instructions.push(
      buildActivateSaleInstruction({
        assetId: params.assetId,
        issuerPubkey,
      }),
    );
  }

  const metadata: AssetSetupMetadata = {
    kind: "asset_setup",
    asset_id: params.assetId,
    metadata_uri: params.metadataUri,
    total_shares: params.totalShares,
    price_per_share_usdc: params.pricePerShareUsdc,
    activate_sale: params.activateSale,
  };

  return buildTransactionPayload(
    params.operationId,
    payerKeypair?.publicKey ?? issuerPubkey,
    instructions,
    metadata,
  );
}

export async function prepareInvestmentTransaction(params: {
  operationId: string;
  assetId: string;
  investorWalletAddress: string;
  amountUsdc: number;
  sharesToReceive: number;
  assetPubkey?: string;
  vaultPubkey?: string;
  shareMintPubkey?: string;
}): Promise<TransactionPayload> {
  const investorPubkey = parseWalletPublicKey(
    params.investorWalletAddress,
    "Investor wallet address",
  );
  const shareMintPubkey =
    params.shareMintPubkey !== undefined ? new PublicKey(params.shareMintPubkey) : undefined;
  const paymentMint = getUsdcMintPubkey();
  const paymentTokenProgram = await resolveTokenProgramForMint(paymentMint, "Payment", connection);
  const shareMint = shareMintPubkey ?? deriveShareMintPDA(params.assetId).publicKey;
  const shareTokenProgram = await resolveTokenProgramForMint(shareMint, "Share", connection);

  if (!shareTokenProgram.equals(paymentTokenProgram)) {
    throw new ApiError(
      409,
      "TOKEN_PROGRAM_MISMATCH",
      `Share mint uses ${tokenProgramLabel(shareTokenProgram)} but payment mint uses ${tokenProgramLabel(paymentTokenProgram)}`,
    );
  }

  const investorShareAccount = getAssociatedTokenAddressSync(
    shareMint,
    investorPubkey,
    false,
    shareTokenProgram,
  );
  const investorUsdcAccount = getAssociatedTokenAddressSync(
    paymentMint,
    investorPubkey,
    false,
    paymentTokenProgram,
  );
  const instructions: TransactionInstruction[] = [
    createAssociatedTokenAccountIdempotentInstruction(
      payerKeypair?.publicKey ?? investorPubkey,
      investorUsdcAccount,
      investorPubkey,
      paymentMint,
      paymentTokenProgram,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      payerKeypair?.publicKey ?? investorPubkey,
      investorShareAccount,
      investorPubkey,
      shareMint,
      shareTokenProgram,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
  ];

  instructions.push(
    buildBuySharesInstruction({
      assetId: params.assetId,
      investorPubkey,
      amountUsdc: params.amountUsdc,
      sharesToReceive: params.sharesToReceive,
      assetPubkey: params.assetPubkey ? new PublicKey(params.assetPubkey) : undefined,
      vaultPubkey: params.vaultPubkey ? new PublicKey(params.vaultPubkey) : undefined,
      shareMintPubkey,
      paymentMintPubkey: paymentMint,
      tokenProgramPubkey: shareTokenProgram,
    }),
  );

  const metadata: InvestmentMetadata = {
    kind: "investment",
    asset_id: params.assetId,
    amount_usdc: params.amountUsdc,
    shares_to_receive: params.sharesToReceive,
  };

  return buildTransactionPayload(
    params.operationId,
    payerKeypair?.publicKey ?? investorPubkey,
    instructions,
    metadata,
  );
}

export async function prepareRevenuePostTransaction(params: {
  operationId: string;
  assetId: string;
  issuerWalletAddress: string;
  epochNumber: number;
  amountUsdc: number;
  reportHash: string;
}): Promise<TransactionPayload> {
  const issuerPubkey = parseWalletPublicKey(params.issuerWalletAddress, "Issuer wallet address");
  const instruction = buildPostRevenueInstruction({
    assetId: params.assetId,
    issuerPubkey,
    epochNumber: params.epochNumber,
    amountUsdc: params.amountUsdc,
    reportHash: params.reportHash,
  });

  const metadata: RevenuePostMetadata = {
    kind: "revenue_post",
    asset_id: params.assetId,
    revenue_epoch_id: params.operationId,
    epoch_number: params.epochNumber,
    amount_usdc: params.amountUsdc,
  };

  return buildTransactionPayload(
    params.operationId,
    payerKeypair?.publicKey ?? issuerPubkey,
    [instruction],
    metadata,
  );
}

export async function prepareWithdrawTransaction(params: {
  operationId: string;
  assetId: string;
  issuerWalletAddress: string;
  amountUsdc: number;
}): Promise<TransactionPayload> {
  const issuerPubkey = parseWalletPublicKey(params.issuerWalletAddress, "Issuer wallet address");
  const paymentMint = getUsdcMintPubkey();
  const tokenProgram = await resolveTokenProgramForMint(paymentMint, "Payment", connection);
  const issuerUsdcAccount = getAssociatedTokenAddressSync(
    paymentMint,
    issuerPubkey,
    false,
    tokenProgram,
  );

  const instructions: TransactionInstruction[] = [
    createAssociatedTokenAccountIdempotentInstruction(
      payerKeypair?.publicKey ?? issuerPubkey,
      issuerUsdcAccount,
      issuerPubkey,
      paymentMint,
      tokenProgram,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
    buildWithdrawInstruction({
      assetId: params.assetId,
      issuerPubkey,
      amountUsdc: params.amountUsdc,
      paymentMintPubkey: paymentMint,
      tokenProgramPubkey: tokenProgram,
    }),
  ];

  const metadata: WithdrawMetadata = {
    kind: "withdraw",
    asset_id: params.assetId,
    amount_usdc: params.amountUsdc,
  };

  return buildTransactionPayload(
    params.operationId,
    payerKeypair?.publicKey ?? issuerPubkey,
    instructions,
    metadata,
  );
}

export async function prepareClaimTransaction(params: {
  operationId: string;
  assetId: string;
  claimantWalletAddress: string;
  epochNumber: number;
  claimAmountUsdc: number;
  revenueEpochId: string;
}): Promise<TransactionPayload> {
  const claimantPubkey = parseWalletPublicKey(
    params.claimantWalletAddress,
    "Claimant wallet address",
  );
  const paymentMint = getUsdcMintPubkey();
  const tokenProgram = await resolveTokenProgramForMint(paymentMint, "Payment", connection);
  const instruction = buildClaimYieldInstruction({
    assetId: params.assetId,
    claimantPubkey,
    epochNumber: params.epochNumber,
    claimAmountUsdc: params.claimAmountUsdc,
    paymentMintPubkey: paymentMint,
    tokenProgramPubkey: tokenProgram,
  });

  const metadata: ClaimMetadata = {
    kind: "claim",
    asset_id: params.assetId,
    revenue_epoch_id: params.revenueEpochId,
    epoch_number: params.epochNumber,
    claim_amount_usdc: params.claimAmountUsdc,
  };

  return buildTransactionPayload(
    params.operationId,
    payerKeypair?.publicKey ?? claimantPubkey,
    [instruction],
    metadata,
  );
}
