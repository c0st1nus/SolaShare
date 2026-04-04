import type { PublicKey } from "@solana/web3.js";

/** Result of a PDA derivation containing the address and bump seed */
export interface PdaDerivation {
  publicKey: PublicKey;
  bump: number;
}

/** Challenge issued for wallet ownership verification */
export interface WalletChallenge {
  /** The full challenge string the wallet must sign */
  challenge: string;
  /** Unique nonce for replay protection */
  nonce: string;
  /** ISO timestamp when this challenge expires */
  expiresAt: string;
  /** Optional operation context (e.g., "wallet_binding", "investment") */
  operation?: string;
}

/** Result of verifying a wallet signature */
export interface ChallengeVerificationResult {
  valid: boolean;
  walletAddress: string;
  nonce: string;
  error?: string;
}

/** Asset account seeds for PDA derivation */
export interface AssetAccountSeeds {
  assetId: string;
}

/** Vault seeds for PDA derivation */
export interface VaultSeeds {
  assetId: string;
}

/** Revenue epoch seeds for PDA derivation */
export interface RevenueEpochSeeds {
  assetId: string;
  epochNumber: number;
}

/** Claim record seeds for PDA derivation */
export interface ClaimSeeds {
  assetId: string;
  userPubkey: PublicKey;
  epochNumber: number;
}
