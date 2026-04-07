"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { CheckCircle2, Loader2, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function WalletBindButton() {
  const { user, refreshUser } = useAuth();
  const { publicKey, connect, connected, signMessage, select, wallets, wallet } = useWallet();
  const [binding, setBinding] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Auto-select Phantom wallet on mount
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

  if (!user) {
    return null;
  }

  const walletBound = Boolean(user.wallet_address);
  const walletAddress = user.wallet_address || publicKey?.toBase58() || null;

  async function handleBind() {
    setBinding(true);
    setError("");
    setMessage("");

    try {
      // Step 0: Ensure Phantom is selected
      if (!wallet) {
        const phantomWallet = wallets.find(
          (w) => w.adapter.name === "Phantom"
        );
        if (!phantomWallet) {
          throw new Error("Phantom wallet not found. Please install Phantom extension.");
        }
        select(phantomWallet.adapter.name);
        // Wait a bit for selection to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 1: Connect wallet if not connected
      if (!connected) {
        setMessage("Connecting to Phantom...");
        await connect();
        // Wait for connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 2: Verify we have a public key
      if (!publicKey) {
        throw new Error("Wallet connection failed. No public key available.");
      }

      const address = publicKey.toBase58();
      setMessage("Wallet connected. Requesting challenge...");

      // Step 3: Request challenge from backend
      const challengeRes = await authApi.walletChallenge(address);
      setMessage("Challenge received. Please sign the message in Phantom...");

      // Step 4: Sign the challenge with Phantom
      if (!signMessage) {
        throw new Error("Wallet does not support message signing.");
      }

      const encodedChallenge = new TextEncoder().encode(challengeRes.challenge);
      const signedMessage = await signMessage(encodedChallenge);
      
      // Handle different signature formats
      const signature = signedMessage instanceof Uint8Array 
        ? bytesToBase64(signedMessage)
        : bytesToBase64((signedMessage as { signature: Uint8Array }).signature);

      setMessage("Signature created. Verifying with backend...");

      // Step 5: Verify signature with backend
      const verifyRes = await authApi.walletVerify(
        address,
        challengeRes.challenge,
        signature,
      );

      if (!verifyRes.success || !verifyRes.verified) {
        throw new Error(verifyRes.error ?? "Wallet verification failed.");
      }

      setMessage("Wallet bound successfully!");
      
      // Step 6: Refresh user data to get updated wallet_address
      await refreshUser();

    } catch (err) {
      console.error("Wallet binding error:", err);
      if (err instanceof Error) {
        if (err.message.includes("User rejected") || err.message.includes("User canceled")) {
          setError("Connection or signature was rejected. Please try again.");
        } else if (err.message.includes("Phantom")) {
          setError(err.message);
        } else {
          setError(err.message || "Failed to bind wallet. Please try again.");
        }
      } else {
        setError("Failed to bind wallet. Please try again.");
      }
      setMessage("");
    } finally {
      setBinding(false);
    }
  }

  if (walletBound) {
    return (
      <div className="rounded-2xl p-4" style={{ background: "var(--surface-low)" }}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#14F195]" />
            <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
              Wallet Status
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-[#14F195]" style={{ background: "#14F19510" }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Bound
          </span>
        </div>
        <p className="text-xs font-mono break-all" style={{ color: "var(--text-faint)" }}>
          {user.wallet_address}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4" style={{ background: "var(--surface-low)" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#9945FF]" />
            <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
              Wallet Status
            </span>
          </div>
          <span className="text-xs font-bold text-[#9945FF]">
            Not Connected
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleBind}
        disabled={binding}
        className="btn-sol w-full justify-center"
      >
        {binding ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4" />
            Connect Phantom Wallet
          </>
        )}
      </button>

      {message && (
        <div
          className="rounded-2xl p-3 text-xs font-medium text-[#14F195]"
          style={{ background: "#14F19510" }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          className="rounded-2xl p-3 text-xs font-medium text-red-400"
          style={{ background: "rgba(248,113,113,0.1)" }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
