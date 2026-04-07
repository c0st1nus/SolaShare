import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  type ParsedTransactionWithMeta,
  type PartiallyDecodedInstruction,
  PublicKey,
} from "@solana/web3.js";
import { logger } from "../logger";
import { connection, programId, getUsdcMintAddress as readUsdcMintAddress } from "./config";
import {
  deriveAssetPDA,
  deriveClaimPDA,
  deriveRevenueEpochPDA,
  deriveShareMintPDA,
  deriveVaultPDA,
} from "./pda";
import { resolveTokenProgramForMint } from "./token-program";

const log = logger.child({ module: "solana-verification" });

const MAX_FINALIZATION_RETRIES = 15;
const FINALIZATION_RETRY_DELAY_MS = 2000;
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;

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

export type VerificationResult = VerificationSuccess | { valid: false; error: VerificationError };

export function isValidSignature(signature: string): boolean {
  return BASE58_REGEX.test(signature);
}

function getProgramId(): string | null {
  return programId;
}

function getUsdcMintAddress(): string | null {
  return readUsdcMintAddress();
}

function getProgramInstructions(tx: ParsedTransactionWithMeta): PartiallyDecodedInstruction[] {
  const targetProgram = getProgramId();
  if (!targetProgram) {
    return [];
  }

  return tx.transaction.message.instructions.filter(
    (instruction): instruction is PartiallyDecodedInstruction =>
      "programId" in instruction && instruction.programId.toBase58() === targetProgram,
  );
}

function verifyInstructionAccounts(
  instruction: PartiallyDecodedInstruction,
  expectedAccounts: { name: string; pubkey: string }[],
): VerificationError | null {
  for (const [index, expected] of expectedAccounts.entries()) {
    const actual = instruction.accounts[index];
    const actualPubkey = actual ? actual.toBase58() : undefined;
    if (actualPubkey !== expected.pubkey) {
      return {
        code: "WRONG_ACCOUNTS",
        message: `Expected account ${expected.name} at index ${index} to be ${expected.pubkey}, got ${actualPubkey ?? "missing"}`,
        details: {
          expectedAccounts,
          actualAccounts: instruction.accounts.map((account) => account.toBase58()),
        },
      };
    }
  }

  return null;
}

function getTokenBalanceAmount(
  tx: ParsedTransactionWithMeta,
  pubkey: string,
  mint?: string,
): bigint {
  const accountIndex = tx.transaction.message.accountKeys.findIndex(
    (key) => key.pubkey.toBase58() === pubkey,
  );

  if (accountIndex === -1) {
    return 0n;
  }

  const resolveAmount = (
    balances:
      | NonNullable<ParsedTransactionWithMeta["meta"]>["preTokenBalances"]
      | NonNullable<ParsedTransactionWithMeta["meta"]>["postTokenBalances"],
  ) => {
    const match = balances?.find(
      (balance) =>
        balance.accountIndex === accountIndex && (mint === undefined || balance.mint === mint),
    );

    return BigInt(match?.uiTokenAmount.amount ?? "0");
  };

  return resolveAmount(tx.meta?.postTokenBalances) - resolveAmount(tx.meta?.preTokenBalances);
}

async function tokenAccountForOwnerAndMint(owner: string, mint: string) {
  const mintPubkey = new PublicKey(mint);
  const tokenProgram = await resolveTokenProgramForMint(mintPubkey, "Token", connection);

  return getAssociatedTokenAddressSync(
    mintPubkey,
    new PublicKey(owner),
    false,
    tokenProgram,
  ).toBase58();
}

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
    const tx = await connection.getParsedTransaction(signature, {
      commitment: (connection.commitment === "processed" ? "confirmed" : connection.commitment) as
        | "confirmed"
        | "finalized",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
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

    if (tx.meta?.err) {
      return {
        code: "TX_FAILED",
        message: `Transaction failed on-chain: ${JSON.stringify(tx.meta.err)}`,
        details: { error: tx.meta.err },
      };
    }

    return { tx, slot: tx.slot };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);

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

export async function fetchAndVerifyTransactionWithRetry(
  signature: string,
  maxRetries = MAX_FINALIZATION_RETRIES,
): Promise<{ tx: ParsedTransactionWithMeta; slot: number } | VerificationError> {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const result = await fetchAndVerifyTransaction(signature);

    if (
      !("code" in result) ||
      (result.code !== "TX_NOT_FINALIZED" && result.code !== "TX_NOT_FOUND")
    ) {
      return result;
    }

    if (attempt < maxRetries) {
      log.info(
        { signature, attempt: attempt + 1, maxRetries, code: result.code },
        "Transaction not finalized or not found, waiting to retry",
      );
      await new Promise((resolve) => setTimeout(resolve, FINALIZATION_RETRY_DELAY_MS));
    }
  }

  return {
    code: "TX_NOT_FINALIZED",
    message: `Transaction still not finalized or found after ${maxRetries} retries: ${signature}`,
  };
}

export function verifyTransactionSigner(
  tx: ParsedTransactionWithMeta,
  expectedSigner: string,
): VerificationError | null {
  const signers = tx.transaction.message.accountKeys
    .filter((account) => account.signer)
    .map((account) => account.pubkey.toBase58());

  if (!signers.includes(expectedSigner)) {
    return {
      code: "WRONG_SIGNER",
      message: `Expected signer ${expectedSigner} not found in transaction signers`,
      details: { expectedSigner, actualSigners: signers },
    };
  }

  return null;
}

export function verifyProgramInvoked(
  tx: ParsedTransactionWithMeta,
  expectedProgramId?: string,
): VerificationError | null {
  const targetProgram = expectedProgramId ?? getProgramId();
  if (!targetProgram) {
    return {
      code: "WRONG_PROGRAM",
      message: "No program ID configured for verification",
    };
  }

  const instructions = getProgramInstructions(tx);
  if (instructions.length === 0) {
    return {
      code: "WRONG_PROGRAM",
      message: `Expected program ${targetProgram} was not invoked`,
      details: {
        invokedPrograms: tx.transaction.message.instructions.map((ix) =>
          "programId" in ix ? ix.programId.toBase58() : "unknown",
        ),
      },
    };
  }

  return null;
}

export function verifyAccountsMatch(
  tx: ParsedTransactionWithMeta,
  expectedAccounts: { name: string; pubkey: string }[],
): VerificationError | null {
  const accountKeys = tx.transaction.message.accountKeys.map((account) =>
    account.pubkey.toBase58(),
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

function successResult(
  signature: string,
  tx: ParsedTransactionWithMeta,
  slot: number,
): VerificationSuccess {
  return {
    valid: true,
    signature,
    slot,
    blockTime: tx.blockTime ?? null,
    fee: tx.meta?.fee ?? 0,
    signers: tx.transaction.message.accountKeys
      .filter((account) => account.signer)
      .map((account) => account.pubkey.toBase58()),
  };
}

export interface AssetSetupVerificationParams {
  expectedSigner: string;
  assetId: string;
  activateSale: boolean;
}

export async function verifyAssetSetupTransaction(
  signature: string,
  params: AssetSetupVerificationParams,
): Promise<VerificationResult> {
  const fetchResult = await fetchAndVerifyTransactionWithRetry(signature);
  if ("code" in fetchResult) {
    return { valid: false, error: fetchResult };
  }

  const { tx, slot } = fetchResult;
  const signerError = verifyTransactionSigner(tx, params.expectedSigner);
  if (signerError) {
    return { valid: false, error: signerError };
  }

  const programError = verifyProgramInvoked(tx);
  if (programError) {
    return { valid: false, error: programError };
  }

  const usdcMint = getUsdcMintAddress();
  if (!usdcMint) {
    return {
      valid: false,
      error: {
        code: "WRONG_ACCOUNTS",
        message: "SOLANA_USDC_MINT_ADDRESS must be configured to verify asset setup",
      },
    };
  }

  const assetPda = deriveAssetPDA({ assetId: params.assetId });
  const shareMintPda = deriveShareMintPDA(params.assetId);
  const vaultPda = deriveVaultPDA({ assetId: params.assetId });
  const instructions = getProgramInstructions(tx);

  if (instructions.length < 1) {
    return {
      valid: false,
      error: {
        code: "WRONG_INSTRUCTION",
        message: "Expected at least one Solashare program instruction",
      },
    };
  }

  const createAssetAccountsError = verifyInstructionAccounts(instructions[0], [
    { name: "issuer", pubkey: params.expectedSigner },
    { name: "asset", pubkey: assetPda.publicKey.toBase58() },
    { name: "share_mint", pubkey: shareMintPda.publicKey.toBase58() },
    { name: "vault", pubkey: vaultPda.publicKey.toBase58() },
    { name: "payment_mint", pubkey: usdcMint },
  ]);
  if (createAssetAccountsError) {
    return { valid: false, error: createAssetAccountsError };
  }

  if (params.activateSale) {
    const activateSaleInstruction = instructions[1];
    if (!activateSaleInstruction) {
      return {
        valid: false,
        error: {
          code: "WRONG_INSTRUCTION",
          message: "Asset setup transaction is missing activate_sale",
        },
      };
    }

    const activateSaleAccountsError = verifyInstructionAccounts(activateSaleInstruction, [
      { name: "issuer", pubkey: params.expectedSigner },
      { name: "asset", pubkey: assetPda.publicKey.toBase58() },
    ]);
    if (activateSaleAccountsError) {
      return { valid: false, error: activateSaleAccountsError };
    }
  }

  return successResult(signature, tx, slot);
}

export interface InvestmentVerificationParams {
  expectedSigner: string;
  assetId: string;
  amountUsdc: number;
  sharesToReceive?: number;
}

export async function verifyInvestmentTransaction(
  signature: string,
  params: InvestmentVerificationParams,
): Promise<VerificationResult> {
  log.info({ signature, params }, "Verifying investment transaction");
  const fetchResult = await fetchAndVerifyTransactionWithRetry(signature);
  if ("code" in fetchResult) {
    return { valid: false, error: fetchResult };
  }

  const { tx, slot } = fetchResult;
  const signerError = verifyTransactionSigner(tx, params.expectedSigner);
  if (signerError) {
    return { valid: false, error: signerError };
  }

  const programError = verifyProgramInvoked(tx);
  if (programError) {
    return { valid: false, error: programError };
  }

  const usdcMint = getUsdcMintAddress();
  if (!usdcMint) {
    return {
      valid: false,
      error: {
        code: "WRONG_ACCOUNTS",
        message: "SOLANA_USDC_MINT_ADDRESS must be configured to verify investments",
      },
    };
  }

  const assetPda = deriveAssetPDA({ assetId: params.assetId });
  const vaultPda = deriveVaultPDA({ assetId: params.assetId });
  const shareMintPda = deriveShareMintPDA(params.assetId);
  const investorShareAccount = await tokenAccountForOwnerAndMint(
    params.expectedSigner,
    shareMintPda.publicKey.toBase58(),
  );
  const investorUsdcAccount = await tokenAccountForOwnerAndMint(params.expectedSigner, usdcMint);
  const instructions = getProgramInstructions(tx);
  const instruction = instructions[instructions.length - 1];

  if (!instruction) {
    return {
      valid: false,
      error: {
        code: "WRONG_INSTRUCTION",
        message: "Expected buy_shares instruction was not found",
      },
    };
  }

  const accountsError = verifyInstructionAccounts(instruction, [
    { name: "investor", pubkey: params.expectedSigner },
    { name: "asset", pubkey: assetPda.publicKey.toBase58() },
    { name: "vault", pubkey: vaultPda.publicKey.toBase58() },
    { name: "share_mint", pubkey: shareMintPda.publicKey.toBase58() },
    { name: "investor_share_account", pubkey: investorShareAccount },
    { name: "investor_usdc_account", pubkey: investorUsdcAccount },
    { name: "payment_mint", pubkey: usdcMint },
  ]);
  if (accountsError) {
    return { valid: false, error: accountsError };
  }

  const expectedUsdcAmount = BigInt(Math.round(params.amountUsdc * 1_000_000));
  const investorUsdcDelta = getTokenBalanceAmount(tx, investorUsdcAccount, usdcMint);
  const vaultUsdcDelta = getTokenBalanceAmount(tx, vaultPda.publicKey.toBase58(), usdcMint);

  if (investorUsdcDelta !== -expectedUsdcAmount || vaultUsdcDelta !== expectedUsdcAmount) {
    return {
      valid: false,
      error: {
        code: "WRONG_AMOUNT",
        message: "USDC transfer amount does not match expected investment amount",
        details: {
          expectedUsdcAmount: expectedUsdcAmount.toString(),
          investorUsdcDelta: investorUsdcDelta.toString(),
          vaultUsdcDelta: vaultUsdcDelta.toString(),
        },
      },
    };
  }

  if (params.sharesToReceive !== undefined) {
    const expectedShareAmount = BigInt(Math.round(params.sharesToReceive * 1_000_000));
    const investorShareDelta = getTokenBalanceAmount(
      tx,
      investorShareAccount,
      shareMintPda.publicKey.toBase58(),
    );

    if (investorShareDelta !== expectedShareAmount) {
      return {
        valid: false,
        error: {
          code: "WRONG_AMOUNT",
          message: "Minted share amount does not match expected investment fill",
          details: {
            expectedShareAmount: expectedShareAmount.toString(),
            investorShareDelta: investorShareDelta.toString(),
          },
        },
      };
    }
  }

  return successResult(signature, tx, slot);
}

export interface ClaimVerificationParams {
  expectedSigner: string;
  assetId: string;
  epochNumber: number;
  claimAmountUsdc: number;
}

export async function verifyClaimTransaction(
  signature: string,
  params: ClaimVerificationParams,
): Promise<VerificationResult> {
  const fetchResult = await fetchAndVerifyTransactionWithRetry(signature);
  if ("code" in fetchResult) {
    return { valid: false, error: fetchResult };
  }

  const { tx, slot } = fetchResult;
  const signerError = verifyTransactionSigner(tx, params.expectedSigner);
  if (signerError) {
    return { valid: false, error: signerError };
  }

  const programError = verifyProgramInvoked(tx);
  if (programError) {
    return { valid: false, error: programError };
  }

  const usdcMint = getUsdcMintAddress();
  if (!usdcMint) {
    return {
      valid: false,
      error: {
        code: "WRONG_ACCOUNTS",
        message: "SOLANA_USDC_MINT_ADDRESS must be configured to verify claims",
      },
    };
  }

  const assetPda = deriveAssetPDA({ assetId: params.assetId });
  const vaultPda = deriveVaultPDA({ assetId: params.assetId });
  const revenueEpochPda = deriveRevenueEpochPDA({
    assetId: params.assetId,
    epochNumber: params.epochNumber,
  });
  const claimPda = deriveClaimPDA({
    assetId: params.assetId,
    userPubkey: new PublicKey(params.expectedSigner),
    epochNumber: params.epochNumber,
  });
  const claimantUsdcAccount = await tokenAccountForOwnerAndMint(params.expectedSigner, usdcMint);
  const instruction = getProgramInstructions(tx)[0];

  if (!instruction) {
    return {
      valid: false,
      error: {
        code: "WRONG_INSTRUCTION",
        message: "Expected claim_yield instruction was not found",
      },
    };
  }

  const accountsError = verifyInstructionAccounts(instruction, [
    { name: "claimant", pubkey: params.expectedSigner },
    { name: "asset", pubkey: assetPda.publicKey.toBase58() },
    { name: "revenue_epoch", pubkey: revenueEpochPda.publicKey.toBase58() },
    { name: "claim_record", pubkey: claimPda.publicKey.toBase58() },
    { name: "vault", pubkey: vaultPda.publicKey.toBase58() },
    { name: "claimant_usdc_account", pubkey: claimantUsdcAccount },
    { name: "payment_mint", pubkey: usdcMint },
  ]);
  if (accountsError) {
    return { valid: false, error: accountsError };
  }

  return successResult(signature, tx, slot);
}

export interface RevenuePostVerificationParams {
  expectedSigner: string;
  assetId: string;
  epochNumber: number;
  amountUsdc?: number;
}

export async function verifyRevenuePostTransaction(
  signature: string,
  params: RevenuePostVerificationParams,
): Promise<VerificationResult> {
  const fetchResult = await fetchAndVerifyTransactionWithRetry(signature);
  if ("code" in fetchResult) {
    return { valid: false, error: fetchResult };
  }

  const { tx, slot } = fetchResult;
  const signerError = verifyTransactionSigner(tx, params.expectedSigner);
  if (signerError) {
    return { valid: false, error: signerError };
  }

  const programError = verifyProgramInvoked(tx);
  if (programError) {
    return { valid: false, error: programError };
  }

  const assetPda = deriveAssetPDA({ assetId: params.assetId });
  const revenueEpochPda = deriveRevenueEpochPDA({
    assetId: params.assetId,
    epochNumber: params.epochNumber,
  });
  const instruction = getProgramInstructions(tx)[0];

  if (!instruction) {
    return {
      valid: false,
      error: {
        code: "WRONG_INSTRUCTION",
        message: "Expected post_revenue instruction was not found",
      },
    };
  }

  const accountsError = verifyInstructionAccounts(instruction, [
    { name: "issuer", pubkey: params.expectedSigner },
    { name: "asset", pubkey: assetPda.publicKey.toBase58() },
    { name: "revenue_epoch", pubkey: revenueEpochPda.publicKey.toBase58() },
  ]);
  if (accountsError) {
    return { valid: false, error: accountsError };
  }

  return successResult(signature, tx, slot);
}
