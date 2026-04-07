import Image from "next/image";
import Link from "next/link";
import { ENERGY_META, formatNumber, formatPercent, formatUSDC } from "@/lib/utils";
import type { AssetListItem } from "@/types";
import { StatusBadge } from "./StatusBadge";

const ASSET_IMAGES: Record<string, string> = {
  solar: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=600&q=80",
  wind: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=600&q=80",
  hydro: "https://images.unsplash.com/photo-1548075791-7c7e6b5c0f44?w=600&q=80",
  ev_charging: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80",
  other: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=80",
};

export function AssetCard({ asset }: { asset: AssetListItem }) {
  const energy = ENERGY_META[asset.energy_type];
  const img = asset.cover_image_url ?? ASSET_IMAGES[asset.energy_type] ?? ASSET_IMAGES.other;

  return (
    <Link
      href={`/assets/${asset.id}`}
      className="block rounded-[40px] overflow-hidden border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300 group"
      style={{ background: "var(--surface)" }}
    >
      {/* Image */}
      <div className="relative h-56 overflow-hidden">
        <Image
          src={img}
          alt={asset.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {/* APY badge */}
        <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/70 backdrop-blur px-4 py-1.5 rounded-full">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#9945FF]">
            {formatPercent(asset.expected_annual_yield_percent)} APY
          </span>
        </div>
        {/* Status */}
        <div className="absolute top-4 left-4">
          <StatusBadge status={asset.status} />
        </div>
      </div>

      {/* Body */}
      <div className="p-7">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-black" style={{ color: "var(--text)" }}>
              {asset.title}
            </h3>
            <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
              {energy.emoji} {energy.label}
            </p>
          </div>
          <span className="font-black text-[#00693e] dark:text-[#14F195]">
            {formatUSDC(asset.price_per_share_usdc)}
            <span className="text-[10px] font-bold ml-1" style={{ color: "var(--text-faint)" }}>
              / share
            </span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl p-3" style={{ background: "var(--surface-low)" }}>
            <p className="label-xs mb-1">Capacity</p>
            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
              {formatNumber(asset.capacity_kw)} kW
            </p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: "var(--surface-low)" }}>
            <p className="label-xs mb-1">Min. buy</p>
            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
              {formatUSDC(asset.price_per_share_usdc * 5)}
            </p>
          </div>
        </div>

        <div className="btn-dark w-full text-center">Invest Now</div>
      </div>
    </Link>
  );
}

export function AssetCardSkeleton() {
  return (
    <div
      className="rounded-[40px] overflow-hidden border animate-pulse"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="h-56" style={{ background: "var(--surface-low)" }} />
      <div className="p-7 space-y-4">
        <div className="h-5 rounded-xl w-3/4" style={{ background: "var(--surface-low)" }} />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-14 rounded-2xl" style={{ background: "var(--surface-low)" }} />
          <div className="h-14 rounded-2xl" style={{ background: "var(--surface-low)" }} />
        </div>
        <div className="h-11 rounded-full" style={{ background: "var(--surface-low)" }} />
      </div>
    </div>
  );
}
