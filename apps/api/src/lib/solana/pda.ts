import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { programId } from "./config";
import type {
  AssetAccountSeeds,
  ClaimSeeds,
  PdaDerivation,
  RevenueEpochSeeds,
  VaultSeeds,
} from "./types";

/**
 * Get the program ID as a PublicKey, throwing if not configured
 */
function getProgramId(): PublicKey {
  if (!programId) {
    throw new Error("SOLANA_PROGRAM_ID not configured - cannot derive program PDAs");
  }
  return new PublicKey(programId);
}

/**
 * Solana limits each PDA seed to 32 bytes, while asset IDs are stored as UUID strings.
 * We normalize asset IDs into a fixed 32-byte digest so the same seed scheme works for
 * all assets and remains stable across backend and on-chain code.
 */
export function deriveAssetIdSeed(assetId: string): Buffer {
  return createHash("sha256").update(assetId, "utf8").digest();
}

/**
 * Derive the AssetAccount PDA for a given asset ID
 * Seeds: ["asset", sha256(asset_id)]
 */
export function deriveAssetPDA(seeds: AssetAccountSeeds): PdaDerivation {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("asset"), deriveAssetIdSeed(seeds.assetId)],
    getProgramId(),
  );
  return { publicKey, bump };
}

/**
 * Derive the Vault PDA for a given asset
 * Seeds: ["vault", sha256(asset_id)]
 */
export function deriveVaultPDA(seeds: VaultSeeds): PdaDerivation {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), deriveAssetIdSeed(seeds.assetId)],
    getProgramId(),
  );
  return { publicKey, bump };
}

/**
 * Derive the RevenueEpoch PDA for a given asset and epoch number
 * Seeds: ["revenue", sha256(asset_id), epoch_number_le_bytes]
 */
export function deriveRevenueEpochPDA(seeds: RevenueEpochSeeds): PdaDerivation {
  const epochBuffer = Buffer.alloc(8);
  epochBuffer.writeBigUInt64LE(BigInt(seeds.epochNumber));

  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("revenue"), deriveAssetIdSeed(seeds.assetId), epochBuffer],
    getProgramId(),
  );
  return { publicKey, bump };
}

/**
 * Derive the ClaimRecord PDA for a user's claim on a specific epoch
 * Seeds: ["claim", sha256(asset_id), user_pubkey, epoch_number_le_bytes]
 */
export function deriveClaimPDA(seeds: ClaimSeeds): PdaDerivation {
  const epochBuffer = Buffer.alloc(8);
  epochBuffer.writeBigUInt64LE(BigInt(seeds.epochNumber));

  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("claim"),
      deriveAssetIdSeed(seeds.assetId),
      seeds.userPubkey.toBuffer(),
      epochBuffer,
    ],
    getProgramId(),
  );
  return { publicKey, bump };
}

/**
 * Derive the ShareMint PDA for a given asset
 * Seeds: ["share_mint", sha256(asset_id)]
 */
export function deriveShareMintPDA(assetId: string): PdaDerivation {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("share_mint"), deriveAssetIdSeed(assetId)],
    getProgramId(),
  );
  return { publicKey, bump };
}
