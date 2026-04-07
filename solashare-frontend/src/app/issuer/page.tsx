"use client";

import { ArrowUpRight, BarChart2, Plus, RefreshCw, Send, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { WalletSetupCard } from "@/components/WalletSetupCard";
import { WalletBindButton } from "@/components/wallet/WalletBindButton";
import { BASE, issuerApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ensureWalletBound, sendIssuerTransaction } from "@/lib/solana";
import { ENERGY_META, formatNumber, formatUSDC } from "@/lib/utils";
import type { IssuerAssetListItem } from "@/types";

export default function IssuerPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [assets, setAssets] = useState<IssuerAssetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "issuer") {
      setLoading(false);
      return;
    }

    setError("");

    issuerApi
      .listAssets({ limit: 50 })
      .then((r) => setAssets(r.items))
      .catch((err) => {
        setAssets([]);
        setError(err instanceof Error ? err.message : "Failed to load issuer assets.");
      })
      .finally(() => setLoading(false));
  }, [user]);

  async function handleSubmit(assetId: string) {
    setSubmitting(assetId);
    setMsg("");

    try {
      const targetAsset = assets.find((a) => a.id === assetId);

      if (targetAsset?.status === "verified") {
        setMsg("Preparing on-chain transaction...");
        await ensureWalletBound();

        const payload = await issuerApi.prepareOnchainSetup(assetId, {
          // @ts-expect-error
          metadata_uri: targetAsset.assetMetadataUri || `${BASE}/api/v1/assets/${assetId}/metadata`,
        });

        setMsg("Please sign the transaction in your wallet...");
        const signature = await sendIssuerTransaction(payload);

        setMsg("Confirming transaction on-chain...");
        await issuerApi.confirmOnchainSetup(assetId, signature);

        setMsg("Asset initialized on-chain. Submitting for sale activation...");
      }

      const res = await issuerApi.submit(assetId);
      setMsg(`Asset submitted → ${res.next_status}`);
      setAssets((prev) =>
        prev.map((a) =>
          a.id === assetId ? { ...a, status: res.next_status as IssuerAssetListItem["status"] } : a,
        ),
      );
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to submit asset.");
    } finally {
      setSubmitting(null);
    }
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-3xl sol-gradient flex items-center justify-center mx-auto mb-6">
          <BarChart2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-black mb-3" style={{ color: "var(--text)" }}>
          Issuer Dashboard
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Sign in as an issuer to manage your solar assets.
        </p>
        <Link href="/login" className="btn-sol px-8">
          Go to Login
        </Link>
      </div>
    );
  }

  if (user.role !== "issuer") {
    return (
      <div
        className="max-w-2xl mx-auto px-6 py-24 text-center"
        style={{ color: "var(--text-muted)" }}
      >
        Access restricted to issuers.
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="max-w-[1440px] mx-auto px-8 py-10 animate-pulse">
        <div className="card h-24" />
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-8 py-10 animate-fade-in space-y-8">
      {!user.wallet_address && (
        <div className="mb-6">
          <WalletSetupCard />
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="label-xs mb-2">Issuer Dashboard</p>
          <h1 className="text-4xl font-black" style={{ color: "var(--text)" }}>
            My Assets
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:block">
            <WalletBindButton />
          </div>
          <Link href="/issuer/new" className="btn-sol">
            <Plus className="w-4 h-4" /> New Asset
          </Link>
        </div>
      </div>

      <div className="lg:hidden">
        <div className="card p-4">
          <WalletBindButton />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Draft",
            count: assets.filter((a) => a.status === "draft").length,
            color: "text-[var(--text-muted)]",
          },
          {
            label: "Under Review",
            count: assets.filter((a) => a.status === "pending_review").length,
            color: "text-[#9945FF]",
          },
          {
            label: "Active Sale",
            count: assets.filter((a) => a.status === "active_sale").length,
            color: "text-[var(--accent-green-ui)]",
          },
          {
            label: "Funded",
            count: assets.filter((a) => a.status === "funded").length,
            color: "text-[#00693e]",
          },
        ].map((s) => (
          <div key={s.label} className="card p-5 text-center">
            <p className={`text-3xl font-black ${s.color}`}>{s.count}</p>
            <p className="label-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {msg && (
        <div
          className="rounded-2xl px-5 py-3 text-sm font-medium text-[#9945FF]"
          style={{ background: "#9945FF10" }}
        >
          {msg}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {["issuer-loading-1", "issuer-loading-2", "issuer-loading-3"].map((key) => (
            <div key={key} className="card h-24 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="card">
          <EmptyState title="Issuer assets unavailable" description={error} />
        </div>
      ) : assets.length === 0 ? (
        <div className="card p-12 text-center">
          <Zap className="w-8 h-8 mx-auto mb-4" style={{ color: "var(--text-faint)" }} />
          <p className="mb-6" style={{ color: "var(--text-muted)" }}>
            No assets yet. Create your first one.
          </p>
          <Link href="/issuer/new" className="btn-sol">
            <Plus className="w-4 h-4" /> Create Asset
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {assets.map((a) => {
            const energy = ENERGY_META[a.energy_type];
            const canSubmit = a.status === "draft" || a.status === "verified";

            return (
              <div key={a.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: "var(--surface-low)" }}
                    >
                      {energy.emoji}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black truncate" style={{ color: "var(--text)" }}>
                        {a.title}
                      </h3>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {energy.label} · {formatNumber(a.capacity_kw)} kW ·{" "}
                        {a.price_per_share_usdc === null
                          ? "pricing pending"
                          : `${formatUSDC(a.price_per_share_usdc)}/share`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={a.status} />

                    <span
                      className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-[#9945FF]"
                      style={{ background: "#9945FF10" }}
                    >
                      {a.valuation_usdc === null ? "Draft Pricing" : formatUSDC(a.valuation_usdc)}
                    </span>

                    <Link href={`/issuer/assets/${a.id}`} className="btn-outline text-xs px-3 py-2">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Manage
                    </Link>

                    {canSubmit && (
                      <button
                        type="button"
                        onClick={() => handleSubmit(a.id)}
                        disabled={submitting === a.id}
                        className="btn-dark text-xs px-3 py-2"
                      >
                        {submitting === a.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />{" "}
                            {a.status === "verified" ? "Activate" : "Submit"}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
