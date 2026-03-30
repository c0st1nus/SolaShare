"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import {
  AppShell,
  EmptyState,
  LoadingState,
  MetricCard,
  PageActionLink,
  StatusNotice,
  SurfaceCard,
  TimelineList,
  ValuePairGrid,
} from "@/components/site";
import { getClaims, getPortfolio } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { executeWithSession, useStoredSession } from "@/lib/session";
import type { ClaimsResponse, PortfolioResponse } from "@/lib/types";

export default function DashboardPage() {
  const { ready, session } = useStoredSession();
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [claims, setClaims] = useState<ClaimsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let active = true;

    void executeWithSession(async (token) => {
      const [portfolioResult, claimsResult] = await Promise.all([
        getPortfolio(token),
        getClaims(token),
      ]);

      return {
        portfolioResult,
        claimsResult,
      };
    })
      .then((result) => {
        if (!active) {
          return;
        }

        setPortfolio(result.portfolioResult);
        setClaims(result.claimsResult);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Could not load dashboard.");
      });

    return () => {
      active = false;
    };
  }, [session]);

  if (!ready) {
    return (
      <AppShell
        current="dashboard"
        eyebrow="Investor workspace"
        title="Loading dashboard"
        description="Checking your session and loading the latest portfolio data."
      >
        <LoadingState />
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell
        current="dashboard"
        eyebrow="Investor workspace"
        title="Sign in to access the dashboard"
        description="Portfolio balances, claims, and wallet actions are available only for authenticated users."
      >
        <EmptyState
          title="No active session"
          description="Sign in first, then return here to review portfolio balances and claim activity."
          actions={<PageActionLink href="/auth/login">Sign in</PageActionLink>}
          icon={<Icon name="dashboard" className="size-5" />}
        />
      </AppShell>
    );
  }

  if (errorMessage) {
    return (
      <AppShell
        current="dashboard"
        eyebrow="Investor workspace"
        title="Dashboard unavailable"
        description="The backend rejected the dashboard request or the session needs to be refreshed."
      >
        <StatusNotice title="Could not load dashboard" tone="danger">
          {errorMessage}
        </StatusNotice>
      </AppShell>
    );
  }

  if (!portfolio || !claims) {
    return (
      <AppShell
        current="dashboard"
        eyebrow="Investor workspace"
        title="Loading dashboard"
        description="Fetching portfolio balances and claims."
      >
        <LoadingState />
      </AppShell>
    );
  }

  return (
    <AppShell
      current="dashboard"
      eyebrow="Investor workspace"
      title={`Welcome back, ${session.user.display_name}`}
      description="This overview is populated from your live portfolio and claim read models."
      actions={
        <>
          <PageActionLink href="/portfolio">View portfolio</PageActionLink>
          <PageActionLink href="/assets" tone="secondary">
            Browse assets
          </PageActionLink>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard
          label="Total invested"
          value={formatCurrency(portfolio.total_invested_usdc)}
          meta="Based on your current asset positions"
          tone="brand"
        />
        <MetricCard
          label="Claimed yield"
          value={formatCurrency(portfolio.total_claimed_usdc)}
          meta={`${claims.items.length} completed claim records`}
          tone="accent"
        />
        <MetricCard
          label="Ready to claim"
          value={formatCurrency(portfolio.total_unclaimed_usdc)}
          meta="Available for the next claim flow"
          tone="neutral"
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <ValuePairGrid positions={portfolio.positions} />
          <TimelineList
            title="Claim workflow"
            steps={[
              {
                title: "Review claimable balances",
                detail: "Start with the live portfolio and claim history loaded from your session.",
              },
              {
                title: "Prepare a claim",
                detail: "Use the selected asset and revenue epoch to create a claim payload.",
              },
              {
                title: "Confirm the transaction",
                detail:
                  "Submit the resulting signature so the claim appears in the ledger immediately.",
              },
            ]}
          />
        </div>
        <SurfaceCard className="space-y-4">
          <div className="space-y-2">
            <p className="eyebrow">Recent claims</p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
              Claim ledger
            </h2>
          </div>
          <div className="space-y-3">
            {claims.items.length ? (
              claims.items.map((claim) => (
                <div
                  key={claim.claim_id}
                  className="flex flex-col gap-2 rounded-3xl border border-line/60 bg-surface-soft px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{claim.asset_id}</p>
                    <p className="text-sm text-ink-soft">
                      {formatCurrency(claim.claim_amount_usdc)} • {claim.status}
                    </p>
                  </div>
                  <span className="token-pill">
                    <Icon name="link" className="size-3.5" />
                    {claim.transaction_signature ?? "pending"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-ink-soft">
                No claim activity yet. Once claimable revenue is posted, new claim records will
                appear here.
              </p>
            )}
          </div>
        </SurfaceCard>
      </div>
    </AppShell>
  );
}
