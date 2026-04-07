"use client";

import { CheckCircle2, LogOut, Wallet } from "lucide-react";
import { useState } from "react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { connectWallet, ensureWalletBound } from "@/lib/solana";

export function WalletSetupCard() {
  const { user, refreshUser } = useAuth();
  const [bindingWallet, setBindingWallet] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!user) {
    return null;
  }

  const walletBound = Boolean(user.wallet_address);

  async function handleWalletBind() {
    setBindingWallet(true);
    setError("");
    setMessage("");

    try {
      await connectWallet();
      const walletAddress = await ensureWalletBound();
      await refreshUser();
      setMessage(`Wallet connected: ${walletAddress}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet.");
    } finally {
      setBindingWallet(false);
    }
  }

  async function handleWalletUnbind() {
    setBindingWallet(true);
    setError("");
    setMessage("");

    try {
      await authApi.unlinkWallet();
      await refreshUser();
      setMessage("Wallet disconnected successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect wallet.");
    } finally {
      setBindingWallet(false);
    }
  }

  return (
    <div className="card p-6 space-y-5">
      <div>
        <p className="label-xs mb-2">Wallet</p>
        <h3 className="text-xl font-black" style={{ color: "var(--text)" }}>
          Solana wallet connection
        </h3>
      </div>

      <div className="rounded-2xl p-4" style={{ background: "var(--surface-low)" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Wallet className="h-4 w-4 shrink-0" style={{ color: "var(--wallet-accent)" }} />
            <span className="min-w-0 text-sm font-bold" style={{ color: "var(--text)" }}>
              Status
            </span>
          </div>
          <span
            className="shrink-0 text-right text-xs font-bold"
            style={{ color: walletBound ? "var(--accent-green-ui)" : "#9945FF" }}
          >
            {walletBound ? "Connected" : "Not connected"}
          </span>
        </div>
        {user.wallet_address && (
          <p className="mt-2 text-xs font-mono break-all" style={{ color: "var(--text-faint)" }}>
            {user.wallet_address}
          </p>
        )}
      </div>

      {!walletBound && (
        <button
          type="button"
          onClick={handleWalletBind}
          disabled={bindingWallet}
          className="btn-dark w-full"
        >
          {bindingWallet ? "Connecting Wallet..." : "Connect Solana Wallet"}
        </button>
      )}

      {walletBound && (
        <div className="flex flex-col gap-3">
          <div
            className="rounded-2xl p-4 text-sm font-medium"
            style={{
              color: "var(--accent-green-ui)",
              background: "rgb(var(--accent-green-ui-rgb) / 0.1)",
            }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Wallet is ready for signing transactions.
            </div>
          </div>
          <button
            type="button"
            onClick={handleWalletUnbind}
            disabled={bindingWallet}
            className="btn-outline w-full text-red-400 hover:text-red-300 border-red-400/20 hover:border-red-400/40 hover:bg-red-400/10"
          >
            <LogOut className="w-4 h-4" />{" "}
            {bindingWallet ? "Disconnecting..." : "Disconnect Wallet"}
          </button>
        </div>
      )}

      {message && (
        <div
          className="rounded-2xl p-3 text-xs font-medium"
          style={{
            color: "var(--accent-green-ui)",
            background: "rgb(var(--accent-green-ui-rgb) / 0.1)",
          }}
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
