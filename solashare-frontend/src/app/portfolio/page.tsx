"use client";

import { ArrowUpRight, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { investorApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatNumber, formatPercent, formatUSDC } from "@/lib/utils";
import type { Portfolio } from "@/types";

export default function PortfolioPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    investorApi
      .portfolio()
      .then((portfolioRes) => {
        setPortfolio(portfolioRes);
      })
      .catch((err) => {
        setPortfolio(null);
        setError(err instanceof Error ? err.message : "Failed to load portfolio.");
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 sol-gradient">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-black mb-3" style={{ color: "var(--text)" }}>
          Connect to view your portfolio
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Sign in to see your positions, yield, and claims.
        </p>
        <Link href="/login" className="btn-sol px-8">
          Go to Login
        </Link>
      </div>
    );
  }

  if (authLoading || loading) return <PortfolioSkeleton />;

  if (!portfolio) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20">
        <EmptyState
          title="Portfolio unavailable"
          description={error || "Unable to load portfolio."}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-8 py-10 animate-fade-in space-y-8">
      <div>
        <p className="label-xs mb-2">My Portfolio</p>
        <h1 className="text-4xl font-black" style={{ color: "var(--text)" }}>
          Purchased asset shares
        </h1>
        <p className="text-sm mt-3" style={{ color: "var(--text-muted)" }}>
          This page now shows only the asset positions you already own.
        </p>
      </div>

      <div>
        <h2 className="text-2xl font-black mb-4" style={{ color: "var(--text)" }}>
          Active Positions
        </h2>
        {portfolio.positions.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="mb-4" style={{ color: "var(--text-muted)" }}>
              No positions yet.
            </p>
            <Link href="/assets" className="btn-sol text-sm">
              Browse Assets
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {portfolio.positions.map((pos) => (
              <div key={pos.asset_id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black text-lg mb-1" style={{ color: "var(--text)" }}>
                      {pos.title}
                    </h3>
                    <div className="flex gap-4 text-sm" style={{ color: "var(--text-muted)" }}>
                      <span>{formatNumber(pos.shares_amount)} shares</span>
                      <span>{formatPercent(pos.shares_percentage)} of total</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {pos.unclaimed_usdc > 0 && (
                      <div className="text-right">
                        <p className="text-[#9945FF] font-black text-lg">
                          {formatUSDC(pos.unclaimed_usdc)}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                          Unclaimed
                        </p>
                      </div>
                    )}

                    <Link
                      href={`/assets/${pos.asset_id}`}
                      className="btn-outline text-xs px-3 py-2"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" /> View
                    </Link>
                  </div>
                </div>

                <div className="mt-4">
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--surface-low)" }}
                  >
                    <div
                      className="h-full rounded-full sol-gradient"
                      style={{
                        width: `${Math.min(pos.shares_percentage * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="max-w-[1440px] mx-auto px-8 py-10 space-y-8 animate-pulse">
      <div className="h-10 rounded-2xl w-64" style={{ background: "var(--surface-low)" }} />
      <div className="grid grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-28" />
        ))}
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
    </div>
  );
}
