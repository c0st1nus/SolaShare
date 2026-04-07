"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AssetCard, AssetCardSkeleton } from "@/components/AssetCard";
import { EmptyState } from "@/components/EmptyState";
import { assetsApi } from "@/lib/api";
import { ENERGY_META } from "@/lib/utils";
import type { AssetFilters, AssetListItem, AssetStatus, EnergyType, Pagination } from "@/types";

const ENERGY_OPTIONS: { value: EnergyType | ""; label: string }[] = [
  { value: "", label: "All Types" },
  ...Object.entries(ENERGY_META).map(([k, v]) => ({
    value: k as EnergyType,
    label: `${v.emoji} ${v.label}`,
  })),
];

const STATUS_OPTIONS: { value: AssetStatus | ""; label: string }[] = [
  { value: "", label: "Any Status" },
  { value: "active_sale", label: "Active Sale" },
  { value: "verified", label: "Verified" },
  { value: "funded", label: "Funded" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "yield_desc", label: "Highest Yield" },
  { value: "price_asc", label: "Lowest Price" },
];

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<AssetFilters>({
    page: 1,
    limit: 12,
    sort: "newest",
  });

  const fetchAssets = useCallback(async (f: AssetFilters) => {
    setLoading(true);
    setError("");
    try {
      const res = await assetsApi.list(f);
      setAssets(res.items);
      setPagination(res.pagination);
    } catch (err) {
      setAssets([]);
      setPagination(null);
      setError(err instanceof Error ? err.message : "Failed to load assets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets(filters);
  }, [filters, fetchAssets]);

  const updateFilter = (patch: Partial<AssetFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const totalPages = pagination ? Math.ceil(pagination.total / (pagination.limit || 12)) : 1;

  return (
    <div className="max-w-[1440px] mx-auto px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="label-xs mb-2">Marketplace</p>
        <h1 className="text-4xl font-black" style={{ color: "var(--text)" }}>
          Explore Solar Assets
        </h1>
        {pagination && (
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {pagination.total} assets found
          </p>
        )}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        {/* Sort */}
        <select
          value={filters.sort ?? "newest"}
          onChange={(e) => updateFilter({ sort: e.target.value as AssetFilters["sort"] })}
          className="input-new w-auto text-xs py-2 px-3 rounded-full"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Energy type pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {ENERGY_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() =>
                updateFilter({
                  energy_type: (o.value as EnergyType) || undefined,
                })
              }
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                (filters.energy_type ?? "") === o.value
                  ? "bg-[#9945FF]/10 text-[#9945FF] border-[#9945FF]/20"
                  : "border-[var(--border)] hover:border-[#9945FF]/20"
              }`}
              style={(filters.energy_type ?? "") === o.value ? {} : { color: "var(--text-muted)" }}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Status */}
        <select
          value={filters.status ?? ""}
          onChange={(e) =>
            updateFilter({
              status: (e.target.value as AssetStatus) || undefined,
            })
          }
          className="input-new w-auto text-xs py-2 px-3 rounded-full"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Clear */}
        {(filters.energy_type || filters.status) && (
          <button
            onClick={() => setFilters({ page: 1, limit: 12, sort: "newest" })}
            className="text-xs font-bold text-red-400 hover:text-red-500 transition-colors px-2"
          >
            Clear ×
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <AssetCardSkeleton key={i} />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          title={error ? "Assets unavailable" : "No assets found"}
          description={error || "Try adjusting your filters to see more results."}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-10">
          <button
            disabled={!pagination || pagination.page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
            className="p-2 rounded-full border disabled:opacity-40 transition-colors hover:border-[#9945FF]/40"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setFilters((f) => ({ ...f, page: p }))}
              className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                pagination?.page === p
                  ? "sol-gradient text-white"
                  : "border hover:border-[#9945FF]/40"
              }`}
              style={
                pagination?.page === p
                  ? {}
                  : { borderColor: "var(--border)", color: "var(--text-muted)" }
              }
            >
              {p}
            </button>
          ))}

          <button
            disabled={!pagination || pagination.page >= totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
            className="p-2 rounded-full border disabled:opacity-40 transition-colors hover:border-[#9945FF]/40"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
