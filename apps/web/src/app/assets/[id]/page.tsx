"use client";

import { ArrowLeft, ExternalLink, FileText, MapPin, Shield, TrendingUp, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { InvestorSetupCard } from "@/components/InvestorSetupCard";
import { StatusBadge } from "@/components/StatusBadge";
import { adminApi, assetsApi, investorApi, issuerApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { sendPreparedTransaction } from "@/lib/solana";
import {
  ENERGY_META,
  formatDate,
  formatNumber,
  formatPercent,
  formatUSDC,
  shortAddress,
} from "@/lib/utils";
import type {
  AssetDetail,
  AssetDocument,
  HoldersSummary,
  IssuerAssetDetail,
  RevenueEpoch,
} from "@/types";

type Tab = "overview" | "documents" | "revenue" | "holders";

const ASSET_COVER_FALLBACK: Record<string, string> = {
  solar: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=1200&q=80",
  wind: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&q=80",
  hydro: "https://images.unsplash.com/photo-1548075791-7c7e6b5c0f44?w=1200&q=80",
  ev_charging: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200&q=80",
  other: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200&q=80",
};

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [asset, setAsset] = useState<AssetDetail | IssuerAssetDetail | null>(null);
  const [holders, setHolders] = useState<HoldersSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueEpoch[]>([]);
  const [documents, setDocuments] = useState<AssetDocument[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPrivatePreview, setIsPrivatePreview] = useState(false);

  const [investAmount, setInvestAmount] = useState("");
  const [quote, setQuote] = useState<{
    shares_to_receive: number;
    fees_usdc: number;
  } | null>(null);
  const [investing, setInvesting] = useState(false);
  const [investMsg, setInvestMsg] = useState("");

  useEffect(() => {
    if (!id || authLoading) return;

    setLoading(true);
    setError("");
    setIsPrivatePreview(false);

    const loadAsset = async () => {
      try {
        return await assetsApi.get(id);
      } catch (publicError) {
        if (user?.role === "issuer") {
          setIsPrivatePreview(true);
          return issuerApi.getAsset(id);
        }

        if (user?.role === "admin") {
          setIsPrivatePreview(true);
          return adminApi.getAsset(id);
        }

        throw publicError;
      }
    };

    Promise.all([
      loadAsset(),
      assetsApi.holdersSummary(id).catch(() => null),
      assetsApi.revenue(id).catch(() => ({ items: [] })),
      assetsApi.documents(id).catch(() => ({ items: [] })),
    ])
      .then(([assetRes, holdersRes, revenueRes, documentsRes]) => {
        setAsset(assetRes);
        setHolders(holdersRes);
        setRevenue(revenueRes.items);
        setDocuments("public_documents" in assetRes ? documentsRes.items : assetRes.documents);
      })
      .catch((err) => {
        setAsset(null);
        setError(err instanceof Error ? err.message : "Failed to load asset.");
      })
      .finally(() => setLoading(false));
  }, [authLoading, id, user?.role]);

  async function handleQuote() {
    if (!asset || !investAmount) return;

    try {
      const q = await investorApi.quote(asset.id, parseFloat(investAmount));
      setQuote(q);
      setInvestMsg("");
    } catch (err) {
      setQuote(null);
      setInvestMsg(err instanceof Error ? err.message : "Failed to get quote.");
    }
  }

  async function handleInvest() {
    if (!asset || !investAmount) return;

    setInvesting(true);

    try {
      const res = await investorApi.prepare(asset.id, parseFloat(investAmount));
      const confirmation = await sendPreparedTransaction(res, "investment");
      setInvestMsg(`Investment submitted: ${confirmation.signature} (${confirmation.sync_status})`);
    } catch (err) {
      console.error("Investment flow failed", {
        assetId: asset.id,
        investAmount,
        errorMessage: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : undefined,
        error: err,
      });
      setInvestMsg(err instanceof Error ? err.message : "Failed to prepare investment.");
    } finally {
      setInvesting(false);
    }
  }

  if (loading || authLoading) return <AssetDetailSkeleton />;

  if (!asset) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20">
        <EmptyState title="Asset unavailable" description={error || "Asset not found."} />
      </div>
    );
  }

  const energy = ENERGY_META[asset.energy_type];
  const fundedPct = holders?.funded_percent ?? 0;
  const issuerDisplayName = "issuer" in asset ? asset.issuer.display_name : "Issuer";
  const visibleDocuments = "public_documents" in asset ? documents : asset.documents;
  const saleTerms = asset.sale_terms;
  const isSaleLive = asset.status === "active_sale" && saleTerms?.sale_status === "live";
  const coverImage =
    asset.cover_image_url ?? ASSET_COVER_FALLBACK[asset.energy_type] ?? ASSET_COVER_FALLBACK.other;
  const revenueSummary =
    "revenue_summary" in asset
      ? asset.revenue_summary
      : { total_epochs: revenue.length, last_posted_epoch: revenue[0]?.epoch_number ?? null };

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "documents", label: `Documents (${visibleDocuments.length})` },
    { key: "revenue", label: `Revenue (${revenue.length})` },
    { key: "holders", label: "Holders" },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-8 py-8 animate-fade-in">
      <Link
        href="/assets"
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 hover:text-[#9945FF] transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft className="w-4 h-4" /> Back to marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-7">
            <div className="relative mb-6 h-72 overflow-hidden rounded-[2rem]">
              <Image
                src={coverImage}
                alt={asset.title}
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute left-6 top-6">
                <StatusBadge status={asset.status} />
              </div>
            </div>
            {isPrivatePreview && (
              <div
                className="mb-4 rounded-2xl px-4 py-3 text-sm font-medium text-amber-300"
                style={{ background: "rgba(251, 191, 36, 0.12)" }}
              >
                Private preview. This asset is not public yet.
              </div>
            )}
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: "var(--surface-low)" }}
                >
                  {energy.emoji}
                </div>
                <div>
                  <p className="label-xs">{energy.label}</p>
                  <h1 className="text-2xl font-black" style={{ color: "var(--text)" }}>
                    {asset.title}
                  </h1>
                </div>
              </div>
            </div>

            <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-muted)" }}>
              {asset.short_description}
            </p>

            <div className="flex flex-wrap gap-4 text-sm" style={{ color: "var(--text-muted)" }}>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#9945FF]" />
                {asset.location.city ?? "Unknown city"}, {asset.location.country}
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" style={{ color: "var(--accent-green-ui)" }} />
                {formatNumber(asset.capacity_kw)} kW capacity
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#9945FF]" />
                Issuer: {issuerDisplayName}
              </span>
            </div>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 py-3.5 px-3 text-sm font-semibold transition-colors whitespace-nowrap ${
                    tab === t.key
                      ? "text-[#9945FF] border-b-2 border-[#9945FF]"
                      : "hover:bg-[var(--surface-low)]"
                  }`}
                  style={tab === t.key ? {} : { color: "var(--text-muted)" }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {tab === "overview" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-black mb-2" style={{ color: "var(--text)" }}>
                      About this asset
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {asset.full_description}
                    </p>
                  </div>

                  {"onchain_refs" in asset && asset.onchain_refs.onchain_asset_pubkey && (
                    <div>
                      <h3 className="font-black mb-3" style={{ color: "var(--text)" }}>
                        On-chain references
                      </h3>
                      <div className="space-y-2">
                        {[
                          {
                            label: "Asset Account",
                            val: asset.onchain_refs.onchain_asset_pubkey,
                          },
                          {
                            label: "Share Mint",
                            val: asset.onchain_refs.share_mint_pubkey,
                          },
                          {
                            label: "Vault",
                            val: asset.onchain_refs.vault_pubkey,
                          },
                        ]
                          .filter(
                            (r): r is { label: string; val: string } => typeof r.val === "string",
                          )
                          .map((r) => (
                            <div
                              key={r.label}
                              className="flex items-center justify-between p-3 rounded-2xl"
                              style={{ background: "var(--surface-low)" }}
                            >
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {r.label}
                              </span>
                              <span className="font-mono text-xs text-[#9945FF]">
                                {shortAddress(r.val)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "documents" && (
                <div className="space-y-3">
                  {visibleDocuments.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      No documents available yet.
                    </p>
                  ) : (
                    visibleDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 rounded-2xl border transition-all hover:border-[#9945FF]/20"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: "var(--surface-low)" }}
                          >
                            <FileText className="w-4 h-4 text-[#9945FF]" />
                          </div>
                          <div>
                            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                              {doc.title}
                            </p>
                            <p
                              className="text-xs capitalize"
                              style={{ color: "var(--text-faint)" }}
                            >
                              {doc.type.replace(/_/g, " ")} · {doc.storage_provider}
                            </p>
                          </div>
                        </div>
                        <a
                          href={doc.storage_uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl transition-colors hover:bg-[#9945FF]/5 hover:text-[#9945FF]"
                          style={{ color: "var(--text-faint)" }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === "revenue" && (
                <div className="space-y-3">
                  {revenue.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      No revenue epochs posted yet.
                    </p>
                  ) : (
                    revenue.map((epoch) => (
                      <div
                        key={epoch.id}
                        className="p-4 rounded-2xl border space-y-3"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black" style={{ color: "var(--text)" }}>
                            Epoch #{epoch.epoch_number}
                          </span>
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-bold ${
                              epoch.posting_status === "posted"
                                ? "text-[var(--accent-green-ui)] bg-[rgb(var(--accent-green-ui-rgb)/0.10)]"
                                : epoch.posting_status === "settled"
                                  ? "text-[#9945FF] bg-[#9945FF]/10"
                                  : "bg-[var(--surface-low)]"
                            }`}
                            style={
                              epoch.posting_status === "draft" ? { color: "var(--text-muted)" } : {}
                            }
                          >
                            {epoch.posting_status}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                          {formatDate(epoch.period_start)} — {formatDate(epoch.period_end)}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {
                              label: "Gross",
                              val: formatUSDC(epoch.gross_revenue_usdc),
                              accent: false,
                            },
                            {
                              label: "Net",
                              val: formatUSDC(epoch.net_revenue_usdc),
                              accent: false,
                            },
                            {
                              label: "Distributable",
                              val: formatUSDC(epoch.distributable_revenue_usdc),
                              accent: true,
                            },
                          ].map((s) => (
                            <div
                              key={s.label}
                              className="text-center p-2 rounded-xl"
                              style={{ background: "var(--surface-low)" }}
                            >
                              <p className="text-xs mb-0.5" style={{ color: "var(--text-faint)" }}>
                                {s.label}
                              </p>
                              <p
                                className={`text-sm font-bold ${s.accent ? "text-[#9945FF]" : ""}`}
                                style={s.accent ? {} : { color: "var(--text)" }}
                              >
                                {s.val}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === "holders" && holders && (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      label: "Total Investors",
                      val: formatNumber(holders.total_investors),
                      color: "text-[var(--accent-green-ui)]",
                    },
                    {
                      label: "Funded",
                      val: formatPercent(holders.funded_percent),
                      color: "text-[#9945FF]",
                    },
                    {
                      label: "Total Distributed",
                      val: formatUSDC(holders.total_distributed_usdc),
                      color: "text-[#00693e]",
                    },
                    {
                      label: "Total Claimed",
                      val: formatUSDC(holders.total_claimed_usdc),
                      color: "text-[#9945FF]",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="p-4 rounded-2xl"
                      style={{ background: "var(--surface-low)" }}
                    >
                      <p className="text-xs mb-1 label-xs">{s.label}</p>
                      <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-6 space-y-4">
            <h3 className="font-black" style={{ color: "var(--text)" }}>
              Sale Terms
            </h3>

            <div>
              <div
                className="flex justify-between text-xs mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                <span>Funded</span>
                <span className="font-bold text-[var(--accent-green-ui)]">
                  {formatPercent(fundedPct)}
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: "var(--surface-low)" }}
              >
                <div
                  className="h-full rounded-full sol-gradient transition-all duration-700"
                  style={{ width: `${Math.min(fundedPct, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-2.5">
              {saleTerms ? (
                [
                  {
                    label: "Valuation",
                    val: formatUSDC(parseFloat(saleTerms.valuation_usdc)),
                  },
                  {
                    label: "Total Shares",
                    val: formatNumber(saleTerms.total_shares),
                  },
                  {
                    label: "Price / Share",
                    val: formatUSDC(parseFloat(saleTerms.price_per_share_usdc)),
                  },
                  {
                    label: "Min. Buy",
                    val: formatUSDC(parseFloat(saleTerms.minimum_buy_amount_usdc)),
                  },
                  {
                    label: "Target Raise",
                    val: formatUSDC(parseFloat(saleTerms.target_raise_usdc)),
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
                    <span className="font-bold" style={{ color: "var(--text)" }}>
                      {row.val}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Sale terms are not available yet.
                </p>
              )}
            </div>

            <div
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl"
              style={{ background: "var(--surface-low)" }}
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#9945FF]" />
              <span className="text-sm font-black text-[#9945FF]">
                {asset.expected_annual_yield_percent === null
                  ? "Expected APY TBD"
                  : `${formatPercent(asset.expected_annual_yield_percent)} Expected APY`}
              </span>
            </div>
          </div>

          {saleTerms &&
            (!isSaleLive ? (
              <div className="card p-6 space-y-3">
                <h3 className="font-black" style={{ color: "var(--text)" }}>
                  Investment unavailable
                </h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  The buy action appears only after the asset enters
                  <span className="font-semibold text-[var(--text)]"> active_sale </span>
                  and sale status becomes
                  <span className="font-semibold text-[var(--text)]"> live</span>.
                </p>
                <div
                  className="rounded-2xl px-4 py-3 text-xs font-medium"
                  style={{ background: "var(--surface-low)", color: "var(--text-muted)" }}
                >
                  Current asset status: {asset.status}. Current sale status: {saleTerms.sale_status}
                  .
                </div>
              </div>
            ) : !user ? (
              <div className="card p-6 space-y-3">
                <h3 className="font-black" style={{ color: "var(--text)" }}>
                  Invest
                </h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Sign in with an investor account to complete KYC, link a wallet, and invest in
                  this asset.
                </p>
                <Link href="/login" className="btn-sol w-full text-center">
                  Log In To Continue
                </Link>
              </div>
            ) : user.kyc_status !== "approved" || !user.wallet_address ? (
              <InvestorSetupCard />
            ) : (
              <div className="card p-6 space-y-4">
                <h3 className="font-black" style={{ color: "var(--text)" }}>
                  Invest
                </h3>
                <div>
                  <label className="label-xs block mb-2">Amount (USDC)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="0.00"
                      min="0"
                      value={investAmount}
                      onChange={(e) => {
                        setInvestAmount(e.target.value);
                        setQuote(null);
                        setInvestMsg("");
                      }}
                      className="input-new flex-1"
                    />
                    <button
                      onClick={handleQuote}
                      disabled={!investAmount}
                      className="btn-outline text-xs px-3 py-2"
                    >
                      Quote
                    </button>
                  </div>
                </div>

                {quote && (
                  <div
                    className="rounded-2xl p-3 space-y-1.5 text-sm"
                    style={{ background: "var(--surface-low)" }}
                  >
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-muted)" }}>Shares to receive</span>
                      <span className="font-black text-[var(--accent-green-ui)]">
                        {formatNumber(quote.shares_to_receive)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-muted)" }}>Fees</span>
                      <span className="font-medium" style={{ color: "var(--text)" }}>
                        {formatUSDC(quote.fees_usdc)}
                      </span>
                    </div>
                  </div>
                )}

                {investMsg && (
                  <div
                    className="rounded-2xl p-3 text-xs font-medium text-[#9945FF]"
                    style={{ background: "#9945FF10" }}
                  >
                    {investMsg}
                  </div>
                )}

                <button
                  onClick={handleInvest}
                  disabled={investing || !investAmount}
                  className="btn-sol w-full"
                >
                  {investing ? "Preparing…" : "Invest Now"}
                </button>
                <p className="text-xs text-center" style={{ color: "var(--text-faint)" }}>
                  Prepared transaction is signed and sent via your Solana wallet.
                </p>
              </div>
            ))}

          <div className="card p-5">
            <h3 className="font-black text-sm mb-3" style={{ color: "var(--text)" }}>
              Revenue Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div
                className="text-center p-3 rounded-2xl"
                style={{ background: "var(--surface-low)" }}
              >
                <p className="text-2xl font-black text-[var(--accent-green-ui)]">
                  {revenueSummary.total_epochs}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                  Total Epochs
                </p>
              </div>
              <div
                className="text-center p-3 rounded-2xl"
                style={{ background: "var(--surface-low)" }}
              >
                <p className="text-2xl font-black text-[#9945FF]">
                  {revenueSummary.last_posted_epoch ?? "—"}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                  Last Epoch
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetDetailSkeleton() {
  return (
    <div className="max-w-[1440px] mx-auto px-8 py-8 animate-pulse space-y-6">
      <div className="h-4 rounded-xl w-32" style={{ background: "var(--surface-low)" }} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-7 space-y-4">
            <div className="h-6 rounded-xl w-1/2" style={{ background: "var(--surface-low)" }} />
            <div className="h-4 rounded-xl w-3/4" style={{ background: "var(--surface-low)" }} />
          </div>
          <div className="card h-64" />
        </div>
        <div className="space-y-5">
          <div className="card h-52" />
          <div className="card h-40" />
        </div>
      </div>
    </div>
  );
}
