import { Icon } from "@/components/icons";
import {
  AssetCard,
  CatalogShell,
  EmptyState,
  PageActionLink,
  SectionHeader,
  SurfaceCard,
} from "@/components/site";
import { getAssetCatalog } from "@/lib/api";

export default async function AssetsPage() {
  try {
    const catalog = await getAssetCatalog();
    const liveAssets = catalog.items.filter((asset) => asset.status === "active_sale").length;
    const totalCapacity = catalog.items.reduce((sum, asset) => sum + asset.capacity_kw, 0);

    return (
      <CatalogShell current="assets">
        <SectionHeader
          eyebrow="Asset catalog"
          title="Discover live clean-energy opportunities."
          description="The marketplace reads directly from the public backend catalog. Browse active sales, compare yield targets, and open each asset for documents and revenue history."
          actions={
            <>
              <PageActionLink href="/portfolio">Open portfolio</PageActionLink>
              <PageActionLink href="/issuer/assets/new" tone="secondary">
                Create asset
              </PageActionLink>
            </>
          }
        />
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <SurfaceCard className="space-y-2">
                <p className="eyebrow">Listed assets</p>
                <p className="font-display text-3xl font-semibold tracking-tight text-ink">
                  {catalog.pagination.total}
                </p>
              </SurfaceCard>
              <SurfaceCard className="space-y-2">
                <p className="eyebrow">Live sales</p>
                <p className="font-display text-3xl font-semibold tracking-tight text-ink">
                  {liveAssets}
                </p>
              </SurfaceCard>
              <SurfaceCard className="space-y-2">
                <p className="eyebrow">Tracked capacity</p>
                <p className="font-display text-3xl font-semibold tracking-tight text-ink">
                  {totalCapacity.toLocaleString()} kW
                </p>
              </SurfaceCard>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {catalog.items.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          </div>
          <SurfaceCard className="space-y-4">
            <p className="eyebrow">Marketplace notes</p>
            <div className="space-y-3 text-sm leading-6 text-ink-soft">
              <p>
                Cards are rendered from the public catalog response without local frontend
                fallbacks.
              </p>
              <p>
                Each detail page includes public proof documents, revenue history, and sale terms.
              </p>
              <p>
                Authenticated users can move from the catalog into portfolio, claims, and issuer
                actions.
              </p>
            </div>
          </SurfaceCard>
        </div>
      </CatalogShell>
    );
  } catch (error) {
    return (
      <CatalogShell current="assets">
        <EmptyState
          title="Asset catalog unavailable"
          description={
            error instanceof Error
              ? error.message
              : "The public asset catalog could not be loaded from the backend."
          }
          actions={<PageActionLink href="/">Back to access</PageActionLink>}
          icon={<Icon name="sun" className="size-5" />}
        />
      </CatalogShell>
    );
  }
}
