import { createHmac, randomBytes } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { sign } from "tweetnacl";
import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "../../db";
import { walletChallenges } from "../../db/schema";
import { challengeSecret, challengeExpirySeconds } from "./config";
import type { WalletChallenge, ChallengeVerificationResult } from "./types";
import { logger } from "../logger";

const log = logger.child({ module: "wallet-challenge" });

const CHALLENGE_PREFIX = "SolaShare wallet verification";

/**
 * Generate a secure wallet challenge for ownership verification.
 * The challenge includes a nonce and expiry for anti-replay protection.
 */
export async function generateWalletChallenge(
  walletPubkey: string,
  operation = "wallet_binding",
): Promise<WalletChallenge> {
  // Validate wallet address format
  try {
    new PublicKey(walletPubkey);
  } catch {
    throw new Error(`Invalid wallet address: ${walletPubkey}`);
  }

  const nonce = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + challengeExpirySeconds * 1000);

  // Build the challenge message
  const challenge = buildChallengeMessage(walletPubkey, nonce, operation);
  const challengeHash = hashChallenge(challenge);

  // Store in database for verification
  await db.insert(walletChallenges).values({
    nonce,
    walletAddress: walletPubkey,
    operation,
    challengeHash,
    expiresAt,
  });

  log.debug(
    { walletAddress: walletPubkey, operation, nonce: nonce.slice(0, 8) },
    "Generated wallet challenge",
  );

  return {
    challenge,
    nonce,
    expiresAt: expiresAt.toISOString(),
    operation,
  };
}

/**
 * Verify a wallet signature against a previously issued challenge.
 * Implements anti-replay protection by checking expiry and marking as used.
 */
export async function verifyWalletSignature(
  challenge: string,
  signatureBase64: string,
  walletPubkey: string,
): Promise<ChallengeVerificationResult> {
  const errorResult = (error: string): ChallengeVerificationResult => ({
    valid: false,
    walletAddress: walletPubkey,
    nonce: "",
    error,
  });

  // Validate wallet address
  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(walletPubkey);
  } catch {
    return errorResult("Invalid wallet address format");
  }

  // Extract nonce from challenge
  const nonce = extractNonceFromChallenge(challenge);
  if (!nonce) {
    return errorResult("Invalid challenge format - cannot extract nonce");
  }

  // Look up the challenge in the database
  const [storedChallenge] = await db
    .select()
    .from(walletChallenges)
    .where(
      and(
        eq(walletChallenges.nonce, nonce),
        eq(walletChallenges.walletAddress, walletPubkey),
        eq(walletChallenges.status, "pending"),
        isNull(walletChallenges.usedAt),
      ),
    )
    .limit(1);

  if (!storedChallenge) {
    log.warn(
      { walletAddress: walletPubkey, nonce: nonce.slice(0, 8) },
      "Challenge not found or already used",
    );
    return errorResult("Challenge not found, already used, or invalid");
  }

  // Check expiry
  if (new Date() > storedChallenge.expiresAt) {
    await db
      .update(walletChallenges)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(walletChallenges.id, storedChallenge.id));

    log.warn(
      { walletAddress: walletPubkey, nonce: nonce.slice(0, 8) },
      "Challenge expired",
    );
    return errorResult("Challenge has expired");
  }

  // Verify the challenge hash matches what we stored
  const expectedHash = hashChallenge(challenge);
  if (expectedHash !== storedChallenge.challengeHash) {
    log.warn(
      { walletAddress: walletPubkey, nonce: nonce.slice(0, 8) },
      "Challenge hash mismatch",
    );
    return errorResult("Challenge has been tampered with");
  }

  // Verify the Ed25519 signature
  let signatureValid: boolean;
  try {
    const signatureBytes = Buffer.from(signatureBase64, "base64");
    const messageBytes = new TextEncoder().encode(challenge);

    signatureValid = sign.detached.verify(
      messageBytes,
      signatureBytes,
      pubkey.toBytes(),
    );
  } catch (err) {
    log.warn(
      { err, walletAddress: walletPubkey },
      "Signature verification error",
    );
    return errorResult("Signature verification failed");
  }

  if (!signatureValid) {
    log.warn(
      { walletAddress: walletPubkey, nonce: nonce.slice(0, 8) },
      "Invalid signature",
    );
    return errorResult("Signature does not match wallet");
  }

  // Mark challenge as used (anti-replay)
  await db
    .update(walletChallenges)
    .set({
      status: "verified",
      usedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(walletChallenges.id, storedChallenge.id));

  log.info(
    { walletAddress: walletPubkey, nonce: nonce.slice(0, 8) },
    "Wallet signature verified successfully",
  );

  return {
    valid: true,
    walletAddress: walletPubkey,
    nonce,
  };
}

/**
 * Clean up expired challenges (call periodically)
 */
export async function cleanupExpiredChallenges(): Promise<number> {
  const result = await db
    .update(walletChallenges)
    .set({ status: "expired", updatedAt: new Date() })
    .where(
      and(
        eq(walletChallenges.status, "pending"),
        lt(walletChallenges.expiresAt, new Date()),
      ),
    );

  const count = result.rowCount ?? 0;
  if (count > 0) {
    log.info({ count }, "Cleaned up expired wallet challenges");
  }
  return count;
}

/**
 * Build the challenge message that the wallet will sign
 */
function buildChallengeMessage(
  walletAddress: string,
  nonce: string,
  operation: string,
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return `${CHALLENGE_PREFIX}\n\nWallet: ${walletAddress}\nOperation: ${operation}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}

/**
 * Extract nonce from a challenge message
 */
function extractNonceFromChallenge(challenge: string): string | null {
  const match = challenge.match(/Nonce: ([a-f0-9]{64})/);
  return match ? match[1] : null;
}

/**
 * Create HMAC hash of a challenge for integrity verification
 */
function hashChallenge(challenge: string): string {
  return createHmac("sha256", challengeSecret).update(challenge).digest("hex");
}
