import { Connection, Keypair, type Commitment } from "@solana/web3.js";
import { env } from "../../config/env";
import { logger } from "../logger";

const log = logger.child({ module: "solana-config" });

/** Solana RPC connection with configured commitment */
export const connection = new Connection(env.SOLANA_RPC_URL, {
  commitment: env.SOLANA_COMMITMENT as Commitment,
});

/** Optional payer keypair for testing/development (loaded from SOLANA_PAYER_KEY) */
export const payerKeypair: Keypair | null = (() => {
  if (!env.SOLANA_PAYER_KEY) {
    log.debug("SOLANA_PAYER_KEY not set, payer keypair unavailable");
    return null;
  }

  try {
    const secretKey = Uint8Array.from(
      Buffer.from(env.SOLANA_PAYER_KEY, "base64"),
    );
    return Keypair.fromSecretKey(secretKey);
  } catch {
    log.warn(
      "Failed to parse SOLANA_PAYER_KEY as base64, trying JSON array format",
    );
    try {
      const parsed = JSON.parse(env.SOLANA_PAYER_KEY);
      if (Array.isArray(parsed)) {
        return Keypair.fromSecretKey(Uint8Array.from(parsed));
      }
      throw new Error("SOLANA_PAYER_KEY is not a valid array");
    } catch (err) {
      log.error(
        { err },
        "Failed to parse SOLANA_PAYER_KEY, payer keypair unavailable",
      );
      return null;
    }
  }
})();

/** Program ID for the SolaShare on-chain program */
export const programId: string | null = env.SOLANA_PROGRAM_ID ?? null;

/** Secret used for HMAC-signing wallet challenges */
export const challengeSecret: string = env.CHALLENGE_SECRET;

/** Challenge expiry time in seconds */
export const challengeExpirySeconds: number = env.CHALLENGE_EXPIRY_SECONDS;

/** Configured commitment level */
export const commitment: Commitment = env.SOLANA_COMMITMENT as Commitment;

log.info(
  {
    rpcUrl: env.SOLANA_RPC_URL,
    commitment: env.SOLANA_COMMITMENT,
    hasPayer: payerKeypair !== null,
    hasProgramId: programId !== null,
  },
  "Solana config initialized",
);
