import {
  ComputeBudgetProgram,
  type Connection,
  type Keypair,
  type PublicKey,
  type TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { commitment, connection } from "./config";

/**
 * Get the latest blockhash with configured commitment
 */
export async function getLatestBlockhash(conn: Connection = connection) {
  return conn.getLatestBlockhash(commitment);
}

/**
 * Create a VersionedTransaction (V0) from instructions
 */
export async function createVersionedTransaction(
  instructions: TransactionInstruction[],
  payer: PublicKey,
  conn: Connection = connection,
): Promise<VersionedTransaction> {
  const { blockhash } = await getLatestBlockhash(conn);

  const messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

/**
 * Add compute budget instructions for priority fees
 * @param microLamports - Price per compute unit in micro-lamports
 * @param units - Compute unit limit (default 200_000)
 */
export function createComputeBudgetInstructions(
  microLamports: number,
  units = 200_000,
): TransactionInstruction[] {
  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports }),
  ];
}

/**
 * Sign a versioned transaction with a keypair
 */
export function signTransaction(
  transaction: VersionedTransaction,
  signers: Keypair[],
): VersionedTransaction {
  transaction.sign(signers);
  return transaction;
}

/**
 * Serialize a transaction for client signing
 */
export function serializeTransaction(transaction: VersionedTransaction): string {
  return Buffer.from(transaction.serialize()).toString("base64");
}

/**
 * Deserialize a transaction from base64
 */
export function deserializeTransaction(base64Transaction: string): VersionedTransaction {
  const buffer = Buffer.from(base64Transaction, "base64");
  return VersionedTransaction.deserialize(buffer);
}

/**
 * Send and confirm a signed transaction
 */
export async function sendAndConfirmTransaction(
  transaction: VersionedTransaction,
  conn: Connection = connection,
): Promise<string> {
  const signature = await conn.sendTransaction(transaction, {
    skipPreflight: false,
    preflightCommitment: commitment,
  });

  const { blockhash, lastValidBlockHeight } = await getLatestBlockhash(conn);

  await conn.confirmTransaction(
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    commitment,
  );

  return signature;
}
