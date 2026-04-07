// Solana integration layer for SolaShare
// Re-exports all public APIs

export {
  challengeExpirySeconds,
  challengeSecret,
  commitment,
  connection,
  getUsdcMintAddress,
  payerKeypair,
  programId,
} from "./config";
// Indexer
export {
  getIndexerStatus,
  handleWebhookTransaction,
  type IndexedTransaction,
  type IndexerConfig,
  type IndexerStatus,
  startPollingIndexer,
  stopPollingIndexer,
  syncTransaction,
  type WebhookTransactionPayload,
} from "./indexer";
export {
  deriveAssetPDA,
  deriveClaimPDA,
  deriveRevenueEpochPDA,
  deriveShareMintPDA,
  deriveVaultPDA,
} from "./pda";
export type {
  AssetSetupMetadata,
  ClaimMetadata,
  InvestmentMetadata,
  RevenuePostMetadata,
  TransactionMetadata,
  TransactionPayload,
} from "./transactions";
export {
  buildActivateSaleInstruction,
  buildBuySharesInstruction,
  buildClaimYieldInstruction,
  buildCreateAssetInstruction,
  buildPostRevenueInstruction,
  buildTransactionPayload,
  prepareAssetSetupTransaction,
  prepareClaimTransaction,
  prepareInvestmentTransaction,
  prepareRevenuePostTransaction,
} from "./transactions";
export type {
  AssetAccountSeeds,
  ChallengeVerificationResult,
  ClaimSeeds,
  PdaDerivation,
  RevenueEpochSeeds,
  VaultSeeds,
  WalletChallenge,
} from "./types";
export {
  createComputeBudgetInstructions,
  createVersionedTransaction,
  deserializeTransaction,
  getLatestBlockhash,
  sendAndConfirmTransaction,
  serializeTransaction,
  signTransaction,
} from "./utils";

// Verification
export type {
  AssetSetupVerificationParams,
  ClaimVerificationParams,
  InvestmentVerificationParams,
  RevenuePostVerificationParams,
  VerificationError,
  VerificationErrorCode,
  VerificationResult,
  VerificationSuccess,
} from "./verification";

export {
  fetchAndVerifyTransaction,
  fetchAndVerifyTransactionWithRetry,
  isValidSignature,
  verifyAccountsMatch,
  verifyAssetSetupTransaction,
  verifyClaimTransaction,
  verifyInvestmentTransaction,
  verifyProgramInvoked,
  verifyRevenuePostTransaction,
  verifyTransactionSigner,
} from "./verification";
export {
  cleanupExpiredChallenges,
  generateWalletChallenge,
  verifyWalletSignature,
} from "./wallet-challenge";
