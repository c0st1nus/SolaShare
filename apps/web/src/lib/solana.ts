import { Connection, VersionedTransaction } from "@solana/web3.js";
import { authApi, investorApi } from "@/lib/api";
import type { PreparedTransactionResponse, TransactionKind } from "@/types";

type SignMessageResult = Uint8Array | { signature: Uint8Array };
type SignAndSendResult = { signature: string } | string;

export interface BrowserWalletProvider {
  isPhantom?: boolean;
  isConnected?: boolean;
  publicKey?: { toString(): string };
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  signMessage: (message: Uint8Array, display?: "utf8" | "hex") => Promise<SignMessageResult>;
  signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
  signAndSendTransaction: (
    transaction: VersionedTransaction,
    options?: { skipPreflight?: boolean; maxRetries?: number },
  ) => Promise<SignAndSendResult>;
}

// Remove global Window type declaration since wallet-adapter handles this
// The wallet adapter types will manage the window.solana interface

function getProvider(): BrowserWalletProvider {
  if (typeof window === "undefined") {
    throw new Error("Wallet is only available in the browser.");
  }

  // Use type assertion to handle wallet adapter types
  const provider = (window as any).phantom?.solana ?? (window as any).solana;

  if (!provider) {
    throw new Error("No Solana wallet provider found. Install Phantom or a compatible wallet.");
  }

  return provider as BrowserWalletProvider;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function normalizeSignedMessage(result: SignMessageResult): Uint8Array {
  return result instanceof Uint8Array ? result : result.signature;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown wallet error";
  }
}

function extractErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause:
        typeof error.cause === "object" && error.cause !== null
          ? JSON.parse(JSON.stringify(error.cause))
          : error.cause,
    };
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as Record<string, unknown>;

    return {
      message: typeof candidate.message === "string" ? candidate.message : undefined,
      code: candidate.code,
      logs: candidate.logs,
      data: candidate.data,
      details: candidate.details,
      raw: JSON.parse(JSON.stringify(candidate)),
    };
  }

  return {
    value: error,
  };
}

function stringifyErrorDetails(details: Record<string, unknown>): string {
  try {
    return JSON.stringify(details);
  } catch {
    return "Unable to serialize error details";
  }
}

export async function connectWallet(): Promise<string> {
  const provider = getProvider();
  const response = await provider.connect();
  return response.publicKey.toString();
}

export async function ensureWalletBound(): Promise<string> {
  const provider = getProvider();
  const walletAddress = provider.publicKey?.toString() ?? (await connectWallet());
  const challenge = await authApi.walletChallenge(walletAddress);
  const encodedChallenge = new TextEncoder().encode(challenge.challenge);
  const signed = await provider.signMessage(encodedChallenge, "utf8");
  const signature = bytesToBase64(normalizeSignedMessage(signed));
  const result = await authApi.walletVerify(walletAddress, challenge.challenge, signature);

  if (!result.success || !result.verified) {
    throw new Error(result.error ?? "Wallet verification failed.");
  }

  return walletAddress;
}

export async function sendIssuerTransaction(payload: PreparedTransactionResponse): Promise<string> {
  try {
    const provider = getProvider();
    await connectWallet();
    const transaction = VersionedTransaction.deserialize(base64ToBytes(payload.serialized_tx));

    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "http://127.0.0.1:8899";
    const connection = new Connection(rpcUrl, "confirmed");

    const signedTransaction = await provider.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
      maxRetries: 3,
    });

    return signature;
  } catch (error) {
    console.error("sendIssuerTransaction FAILED:", error);
    throw new Error(extractErrorMessage(error));
  }
}

export async function sendPreparedTransaction(
  payload: PreparedTransactionResponse,
  kind: TransactionKind,
): Promise<{ signature: string; sync_status: string }> {
  try {
    const provider = getProvider();
    await connectWallet();
    const transaction = VersionedTransaction.deserialize(base64ToBytes(payload.serialized_tx));

    console.info("Prepared transaction received", {
      operationId: payload.operation_id,
      kind,
      network: payload.network,
      metadata: payload.metadata,
    });

    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "http://127.0.0.1:8899";
    const connection = new Connection(rpcUrl, "confirmed");

    const signedTransaction = await provider.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
      maxRetries: 3,
    });

    console.info("Wallet signed and sent transaction", {
      operationId: payload.operation_id,
      kind,
      signature,
    });

    const confirmation = await investorApi.confirmTransaction(
      signature,
      kind,
      payload.operation_id,
    );

    console.info("Backend transaction confirmation completed", {
      operationId: payload.operation_id,
      kind,
      signature,
      syncStatus: confirmation.sync_status,
    });

    return {
      signature,
      sync_status: confirmation.sync_status,
    };
  } catch (error) {
    const errorDetails = extractErrorDetails(error);

    console.error("Prepared transaction flow failed", {
      operationId: payload.operation_id,
      kind,
      network: payload.network,
      metadata: payload.metadata,
      errorDetails,
      error,
    });
    console.error("Prepared transaction flow failed details", errorDetails);

    throw new Error(`${extractErrorMessage(error)} | ${stringifyErrorDetails(errorDetails)}`);
  }
}
