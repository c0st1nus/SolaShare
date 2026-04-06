// Solana integration layer for SolaShare
// Re-exports all public APIs

export {
  connection,
  payerKeypair,
  programId,
  challengeSecret,
  challengeExpirySeconds,
  commitment,
} from "./config";

export type {
  PdaDerivation,
  WalletChallenge,
  ChallengeVerificationResult,
  AssetAccountSeeds,
  VaultSeeds,
  RevenueEpochSeeds,
  ClaimSeeds,
} from "./types";

export {
  getLatestBlockhash,
  createVersionedTransaction,
  createComputeBudgetInstructions,
  signTransaction,
  serializeTransaction,
  deserializeTransaction,
  sendAndConfirmTransaction,
} from "./utils";

export {
  deriveAssetPDA,
  deriveVaultPDA,
  deriveRevenueEpochPDA,
  deriveClaimPDA,
  deriveShareMintPDA,
} from "./pda";

export {
  generateWalletChallenge,
  verifyWalletSignature,
  cleanupExpiredChallenges,
} from "./wallet-challenge";

export type {
  TransactionPayload,
  TransactionMetadata,
  InvestmentMetadata,
  RevenuePostMetadata,
  ClaimMetadata,
} from "./transactions";

export {
  buildBuySharesInstruction,
  buildPostRevenueInstruction,
  buildClaimYieldInstruction,
  buildTransactionPayload,
  prepareInvestmentTransaction,
  prepareRevenuePostTransaction,
  prepareClaimTransaction,
} from "./transactions";

// Verification
export type {
  VerificationErrorCode,
  VerificationError,
  VerificationSuccess,
  VerificationResult,
  InvestmentVerificationParams,
  ClaimVerificationParams,
  RevenuePostVerificationParams,
} from "./verification";

export {
  isValidSignature,
  fetchAndVerifyTransaction,
  fetchAndVerifyTransactionWithRetry,
  verifyTransactionSigner,
  verifyProgramInvoked,
  verifyAccountsMatch,
  verifyInvestmentTransaction,
  verifyClaimTransaction,
  verifyRevenuePostTransaction,
} from "./verification";

// Indexer
export {
  startPollingIndexer,
  stopPollingIndexer,
  getIndexerStatus,
  handleWebhookTransaction,
  syncTransaction,
  type IndexerConfig,
  type IndexerStatus,
  type IndexedTransaction,
  type WebhookTransactionPayload,
} from "./indexer";
