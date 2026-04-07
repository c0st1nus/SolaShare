"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { VersionedTransaction } from "@solana/web3.js";
import { CheckCircle2, Loader2, Rocket, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { issuerApi } from "@/lib/api";

interface InitializeOnChainButtonProps {
  assetId: string;
  assetTitle: string;
  onSuccess: () => void;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function InitializeOnChainButton({
  assetId,
  assetTitle,
  onSuccess,
}: InitializeOnChainButtonProps) {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected, connect, select, wallets, wallet } = useWallet();
  const [step, setStep] = useState<
    "idle" | "connecting" | "setup" | "signing" | "confirming" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Auto-select Phantom on mount
  useEffect(() => {
    if (!wallet && wallets.length > 0) {
      const phantomWallet = wallets.find(
        (w) => w.adapter.name === "Phantom" && w.readyState === WalletReadyState.Installed
      );
      if (phantomWallet) {
        select(phantomWallet.adapter.name);
      }
    }
  }, [wallet, wallets, select]);

  async function handleInitialize() {
    setStep("connecting");
    setError("");
    setMessage("");

    try {
      // Step 0: Ensure wallet is connected
      if (!connected || !publicKey) {
        setMessage("Connecting to Phantom wallet...");
        
        if (!wallet) {
          const phantomWallet = wallets.find((w) => w.adapter.name === "Phantom");
          if (!phantomWallet) {
            throw new Error("Phantom wallet not found. Please install Phantom extension.");
          }
          select(phantomWallet.adapter.name);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        
        await connect();
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!publicKey || !signTransaction) {
        throw new Error("Wallet not connected. Please connect your Phantom wallet first.");
      }

      // Step 1: Request onchain setup from backend
      setStep("setup");
      setMessage("Preparing on-chain transaction...");

      const setupRes = await issuerApi.onchainSetup(assetId);

      if (!setupRes.success || !setupRes.serialized_tx) {
        throw new Error("Failed to prepare on-chain setup transaction.");
      }

      // Step 2: Deserialize and sign transaction
      setStep("signing");
      setMessage("Please sign the transaction in Phantom to create the asset on Solana...");

      const txBytes = base64ToBytes(setupRes.serialized_tx);
      const transaction = VersionedTransaction.deserialize(txBytes);

      // Sign the transaction
      const signedTransaction = await signTransaction(transaction);

      // Send the signed transaction
      setMessage("Sending transaction to Solana network...");
      
      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      // Wait for confirmation
      setStep("confirming");
      setMessage("Waiting for transaction confirmation...");

      const confirmation = await connection.confirmTransaction(signature, "confirmed");

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      // Step 3: Confirm with backend
      setMessage("Confirming with backend...");

      const confirmRes = await issuerApi.onchainConfirm(assetId, signature);

      if (!confirmRes.success) {
        throw new Error("Backend confirmation failed.");
      }

      // Success!
      setStep("success");
      setMessage(
        `Asset initialized on Solana! Status: ${confirmRes.resulting_status}, Sale: ${confirmRes.sale_status}`
      );

      // Wait a moment then trigger refresh
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (err) {
      console.error("Initialize on-chain error:", err);
      setStep("error");
      
      if (err instanceof Error) {
        if (err.message.includes("User rejected") || err.message.includes("user rejected")) {
          setError("Transaction was rejected. Please try again when ready.");
        } else if (err.message.includes("Phantom")) {
          setError(err.message);
        } else {
          setError(err.message || "Failed to initialize asset on-chain.");
        }
      } else {
        setError("Failed to initialize asset on-chain. Please try again.");
      }
    }
  }

  const isProcessing = ["connecting", "setup", "signing", "confirming"].includes(step);

  if (step === "success") {
    return (
      <div className="card p-6 border-2 border-[#14F195]" style={{ background: "#14F19508" }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#14F195]/20">
            <CheckCircle2 className="w-6 h-6 text-[#14F195]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-[#14F195] mb-2">
              Asset Initialized on Solana!
            </h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {message}
            </p>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              Investors can now purchase shares. Refreshing page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-5 border-2 border-[#9945FF]/30" style={{ background: "#9945FF08" }}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#9945FF20" }}>
          <Rocket className="w-6 h-6 text-[#9945FF]" />
        </div>
        <div className="flex-1">
          <p className="label-xs mb-1">On-Chain Initialization</p>
          <h3 className="text-xl font-black" style={{ color: "var(--text)" }}>
            Launch Asset on Solana
          </h3>
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: "var(--surface-low)" }}>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          This asset has been verified by admin. Click the button below to create it on the Solana
          blockchain. You will be asked to sign a transaction in Phantom that will:
        </p>
        <ul className="mt-3 space-y-1.5 text-sm" style={{ color: "var(--text)" }}>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9945FF]" />
            Create the on-chain asset account
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9945FF]" />
            Deploy the share token mint
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9945FF]" />
            Initialize the USDC vault for investments
          </li>
        </ul>
      </div>

      {message && step !== "error" && (
        <div
          className="rounded-2xl p-4 text-sm font-medium"
          style={{ background: "#9945FF10", color: "#9945FF" }}
        >
          <div className="flex items-center gap-2">
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            {message}
          </div>
        </div>
      )}

      {error && (
        <div
          className="rounded-2xl p-4 text-sm font-medium flex items-start gap-3"
          style={{ background: "rgba(248,113,113,0.1)" }}
        >
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => {
                setStep("idle");
                setError("");
              }}
              className="text-xs text-red-300 hover:text-red-200 mt-2 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleInitialize}
        disabled={isProcessing}
        className="btn-sol w-full justify-center text-base py-3"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {step === "connecting" && "Connecting wallet..."}
            {step === "setup" && "Preparing transaction..."}
            {step === "signing" && "Sign in Phantom..."}
            {step === "confirming" && "Confirming..."}
          </>
        ) : (
          <>
            <Rocket className="w-5 h-5" />
            Initialize &ldquo;{assetTitle}&rdquo; on Solana
          </>
        )}
      </button>

      <p className="text-xs text-center" style={{ color: "var(--text-faint)" }}>
        You&apos;ll pay a small SOL fee for the transaction. Make sure you have some SOL in your wallet.
      </p>
    </div>
  );
}
