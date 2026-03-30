"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import {
  AppShell,
  EmptyState,
  LoadingState,
  MetricCard,
  PageActionLink,
  PortfolioPositionCard,
  StatusNotice,
  SurfaceCard,
} from "@/components/site";
import { getClaims, getPortfolio } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { executeWithSession, useStoredSession } from "@/lib/session";
import type { ClaimsResponse, PortfolioResponse } from "@/lib/types";

export default function PortfolioPage() {
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

        setErrorMessage(error instanceof Error ? error.message : "Could not load portfolio.");
      });

    return () => {
      active = false;
    };
  }, [session]);

  if (!ready) {
    return (
      <AppShell
        current="portfolio"
        eyebrow="Portfolio"
        title="Loading portfolio"
        description="Checking your session and fetching live positions."
      >
        <LoadingState />
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell
        current="portfolio"
        eyebrow="Portfolio"
        title="Sign in to view positions"
        description="Your holdings and claimable balances require an authenticated session."
      >
        <EmptyState
          title="No active session"
          description="Sign in first to see live holdings and claim activity."
          actions={<PageActionLink href="/auth/login">Sign in</PageActionLink>}
          icon={<Icon name="portfolio" className="size-5" />}
        />
      </AppShell>
    );
  }

  if (errorMessage) {
    return (
      <AppShell
        current="portfolio"
        eyebrow="Portfolio"
        title="Portfolio unavailable"
        description="The portfolio request failed or your session could not be refreshed."
      >
        <StatusNotice title="Could not load portfolio" tone="danger">
          {errorMessage}
        </StatusNotice>
      </AppShell>
    );
  }

  if (!portfolio || !claims) {
    return (
      <AppShell
        current="portfolio"
        eyebrow="Portfolio"
        title="Loading portfolio"
        description="Fetching current positions and claim history."
      >
        <LoadingState />
      </AppShell>
    );
  }

  return (
    <AppShell
      current="portfolio"
      eyebrow="Portfolio"
      title="Your live holdings"
      description="Positions, totals, and claimable balances are loaded from the authenticated portfolio read model."
      actions={
        <>
          <PageActionLink href="/dashboard">Back to dashboard</PageActionLink>
          <PageActionLink href="/assets" tone="secondary">
            Browse assets
          </PageActionLink>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard
          label="Portfolio value"
          value={formatCurrency(portfolio.total_invested_usdc)}
          meta="Current invested capital"
          tone="brand"
        />
        <MetricCard
          label="Yield accrued"
          value={formatCurrency(portfolio.total_unclaimed_usdc)}
          meta="Claimable balance across all positions"
          tone="accent"
        />
        <MetricCard
          label="Claim records"
          value={String(claims.items.length)}
          meta="Completed claim events"
          tone="neutral"
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-6 md:grid-cols-2">
          {portfolio.positions.length ? (
            portfolio.positions.map((position) => (
              <PortfolioPositionCard
                key={position.asset_id}
                position={position}
                href={`/assets/${position.asset_id}`}
              />
            ))
          ) : (
            <div className="md:col-span-2">
              <EmptyState
                title="No positions yet"
                description="Once you invest in an asset, the position and its claimable balance will appear here."
                actions={<PageActionLink href="/assets">Explore asset catalog</PageActionLink>}
                icon={<Icon name="sun" className="size-5" />}
              />
            </div>
          )}
        </div>
        <SurfaceCard className="space-y-4">
          <p className="eyebrow">Portfolio notes</p>
          <div className="space-y-3 text-sm leading-6 text-ink-soft">
            <p>
              Holdings link directly into the public asset pages for issuer and revenue context.
            </p>
            <p>Claimable balance is refreshed from the backend each time this screen loads.</p>
            <p>Wallet binding and claim submission continue from the authenticated session.</p>
          </div>
        </SurfaceCard>
      </div>
    </AppShell>
  );
}
