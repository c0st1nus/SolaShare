import { PublicKey } from "@solana/web3.js";
import { programId } from "./config";
import type {
  PdaDerivation,
  AssetAccountSeeds,
  VaultSeeds,
  RevenueEpochSeeds,
  ClaimSeeds,
} from "./types";

/**
 * Get the program ID as a PublicKey, throwing if not configured
 */
function getProgramId(): PublicKey {
  if (!programId) {
    throw new Error(
      "SOLANA_PROGRAM_ID not configured - cannot derive program PDAs",
    );
  }
  return new PublicKey(programId);
}

/**
 * Derive the AssetAccount PDA for a given asset ID
 * Seeds: ["asset", asset_id]
 */
export function deriveAssetPDA(seeds: AssetAccountSeeds): PdaDerivation {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("asset"), Buffer.from(seeds.assetId)],
    getProgramId(),
  );
  return { publicKey, bump };
}

/**
 * Derive the Vault PDA for a given asset
 * Seeds: ["vault", asset_id]
 */
export function deriveVaultPDA(seeds: VaultSeeds): PdaDerivation {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), Buffer.from(seeds.assetId)],
    getProgramId(),
  );
  return { publicKey, bump };
}

/**
 * Derive the RevenueEpoch PDA for a given asset and epoch number
 * Seeds: ["revenue", asset_id, epoch_number_le_bytes]
 */
export function deriveRevenueEpochPDA(seeds: RevenueEpochSeeds): PdaDerivation {
  const epochBuffer = Buffer.alloc(8);
  epochBuffer.writeBigUInt64LE(BigInt(seeds.epochNumber));

  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("revenue"), Buffer.from(seeds.assetId), epochBuffer],
    getProgramId(),
  );
  return { publicKey, bump };
}

/**
 * Derive the ClaimRecord PDA for a user's claim on a specific epoch
 * Seeds: ["claim", asset_id, user_pubkey, epoch_number_le_bytes]
 */
export function deriveClaimPDA(seeds: ClaimSeeds): PdaDerivation {
  const epochBuffer = Buffer.alloc(8);
  epochBuffer.writeBigUInt64LE(BigInt(seeds.epochNumber));

  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("claim"),
      Buffer.from(seeds.assetId),
      seeds.userPubkey.toBuffer(),
      epochBuffer,
    ],
    getProgramId(),
  );
  return { publicKey, bump };
}

/**
 * Derive the ShareMint PDA for a given asset
 * Seeds: ["share_mint", asset_id]
 */
export function deriveShareMintPDA(assetId: string): PdaDerivation {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("share_mint"), Buffer.from(assetId)],
    getProgramId(),
  );
  return { publicKey, bump };
}
