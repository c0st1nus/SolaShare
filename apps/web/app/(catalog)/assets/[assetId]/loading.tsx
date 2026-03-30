import { CatalogShell, SurfaceCard } from "@/components/site";

export default function AssetDetailLoading() {
  return (
    <CatalogShell current="assets">
      <div className="space-y-8">
        <div className="h-[32rem] animate-pulse rounded-shell bg-surface-soft" />
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-6">
            <SurfaceCard className="h-40 animate-pulse bg-surface-soft">
              <span className="sr-only">Loading summary</span>
            </SurfaceCard>
            <SurfaceCard className="h-72 animate-pulse bg-surface-soft">
              <span className="sr-only">Loading details</span>
            </SurfaceCard>
            <SurfaceCard className="h-72 animate-pulse bg-surface-soft">
              <span className="sr-only">Loading revenue</span>
            </SurfaceCard>
          </div>
          <div className="space-y-6">
            <SurfaceCard className="h-56 animate-pulse bg-surface-soft">
              <span className="sr-only">Loading actions</span>
            </SurfaceCard>
            <SurfaceCard className="h-72 animate-pulse bg-surface-soft">
              <span className="sr-only">Loading API cards</span>
            </SurfaceCard>
          </div>
        </div>
      </div>
    </CatalogShell>
  );
}
