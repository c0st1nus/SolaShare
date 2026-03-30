import { notFound } from "next/navigation";

import { Icon } from "@/components/icons";
import {
  AssetMiniFacts,
  CatalogShell,
  CompactStatList,
  DetailHero,
  DetailStatsGrid,
  DocumentsList,
  PageActionLink,
  RevenueTable,
  SectionHeader,
  SurfaceCard,
  TimelineList,
} from "@/components/site";
import { getAssetDetail, getAssetDocuments, getAssetRevenue } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/format";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;
  const [asset, documents, revenue] = await Promise.all([
    getAssetDetail(assetId),
    getAssetDocuments(assetId),
    getAssetRevenue(assetId),
  ]);

  if (!asset) {
    notFound();
  }

  const actionStats = [
    {
      label: "Minimum buy",
      value: formatCurrency(Number(asset.sale_terms.minimum_buy_amount_usdc)),
      tone: "brand" as const,
    },
    {
      label: "Share price",
      value: formatCurrency(Number(asset.sale_terms.price_per_share_usdc)),
      tone: "neutral" as const,
    },
    {
      label: "Est. annual yield",
      value: formatPercent(asset.expected_annual_yield_percent),
      tone: "accent" as const,
    },
    {
      label: "Issuer",
      value: asset.issuer.display_name,
      tone: "neutral" as const,
    },
  ];

  return (
    <CatalogShell current="assets">
      <DetailHero asset={asset} />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-8">
          <SectionHeader
            eyebrow={`/api/v1/assets/${asset.id}`}
            title="Asset detail, proofs, and investment preparation"
            description={asset.full_description}
          />
          <DetailStatsGrid asset={asset} />
          <AssetMiniFacts asset={asset} />
          <SurfaceCard className="space-y-4">
            <p className="eyebrow">Public proof bundle</p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
              Documents
            </h2>
            <DocumentsList documents={documents.items} />
          </SurfaceCard>
          <SurfaceCard className="space-y-4">
            <p className="eyebrow">Revenue history</p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
              Revenue epochs
            </h2>
            <RevenueTable items={revenue.items} />
          </SurfaceCard>
          <TimelineList
            title="How investors use this asset page"
            steps={[
              {
                title: "Review public proof",
                detail:
                  "Inspect documents, location context, and sale terms before committing capital.",
              },
              {
                title: "Track revenue cadence",
                detail: "Revenue epochs show what has already been posted publicly for this asset.",
              },
              {
                title: "Enter from the investor session",
                detail:
                  "Authenticated users move from this page into portfolio, wallet binding, and later transaction confirmation flows.",
              },
              {
                title: "Return for later claims",
                detail:
                  "Once revenue is distributed, future claim actions still originate from the authenticated investor workspace.",
              },
            ]}
          />
        </div>
        <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <SurfaceCard className="space-y-5">
            <div className="space-y-2">
              <p className="eyebrow">Action panel</p>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Investment snapshot
              </h2>
            </div>
            <CompactStatList items={actionStats} />
            <div className="flex flex-wrap gap-3">
              <PageActionLink href="/portfolio">
                Review holdings
                <Icon name="arrow-right" className="size-4" />
              </PageActionLink>
              <PageActionLink href="/assets" tone="secondary">
                Back to catalog
              </PageActionLink>
            </div>
          </SurfaceCard>
          <SurfaceCard className="space-y-4">
            <p className="eyebrow">On-chain references</p>
            <div className="space-y-3 text-sm leading-6 text-ink-soft">
              <p>
                Asset account:{" "}
                <span className="font-medium text-ink">
                  {asset.onchain_refs.onchain_asset_pubkey ?? "Pending issuance"}
                </span>
              </p>
              <p>
                Share mint:{" "}
                <span className="font-medium text-ink">
                  {asset.onchain_refs.share_mint_pubkey ?? "Pending issuance"}
                </span>
              </p>
              <p>
                Vault:{" "}
                <span className="font-medium text-ink">
                  {asset.onchain_refs.vault_pubkey ?? "Pending issuance"}
                </span>
              </p>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </CatalogShell>
  );
}
