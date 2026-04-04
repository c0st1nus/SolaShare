import Image from "next/image";
import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Icon } from "@/components/icons";
import { SessionBadge } from "@/components/session-badge";
import { cn } from "@/lib/cn";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDateRange,
  formatPercent,
  formatStatus,
} from "@/lib/format";
import type {
  AssetDetail,
  AssetDocument,
  AssetListItem,
  PortfolioPosition,
  RevenueEpoch,
} from "@/lib/types";

type NavKey = "home" | "assets" | "dashboard" | "portfolio" | "issuer" | "settings";

const appNav = [
  { key: "home", href: "/", label: "Auth", icon: "home" as const },
  {
    key: "assets",
    href: "/assets",
    label: "Asset Catalog",
    icon: "sun" as const,
  },
  {
    key: "portfolio",
    href: "/portfolio",
    label: "Portfolio",
    icon: "portfolio" as const,
  },
  {
    key: "dashboard",
    href: "/dashboard",
    label: "Dashboard",
    icon: "dashboard" as const,
  },
  {
    key: "issuer",
    href: "/issuer/assets/new",
    label: "Issuer",
    icon: "layers" as const,
  },
  {
    key: "settings",
    href: "/settings",
    label: "Settings",
    icon: "settings" as const,
  },
];

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-brand-mint),var(--color-brand-violet))] text-white shadow-float">
        <Icon name="spark" className="size-5" />
      </span>
      <span>
        <span className="block font-display text-lg font-semibold tracking-tight text-ink">
          SolaShare
        </span>
        {!compact ? (
          <span className="eyebrow block text-[0.6rem] text-ink-soft">
            Tokenized clean-energy yield
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function HeaderNav({ current }: { current: NavKey }) {
  return (
    <nav className="hidden items-center gap-1 rounded-full border border-line/60 bg-white/75 p-1 md:flex">
      {appNav.map((item) => {
        const active = item.key === current;

        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink",
              active && "bg-ink text-white shadow-soft hover:text-white",
            )}
          >
            <Icon name={item.icon} className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl space-y-3">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function PageActionLink({
  href,
  children,
  tone = "primary",
}: {
  href: string;
  children: ReactNode;
  tone?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold",
        tone === "primary"
          ? "bg-[linear-gradient(135deg,var(--color-brand-mint),var(--color-brand-violet))] text-white shadow-float hover:-translate-y-0.5"
          : "border border-line/70 bg-white/70 text-ink shadow-soft hover:border-brand-violet/30 hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

export function SurfaceCard({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("surface-panel p-6 sm:p-8", className)}>{children}</div>;
}

export function MetricCard({
  label,
  value,
  meta,
  tone = "neutral",
}: {
  label: string;
  value: string;
  meta: string;
  tone?: "neutral" | "brand" | "accent";
}) {
  return (
    <SurfaceCard className="space-y-4">
      <p className="eyebrow">{label}</p>
      <p className="font-display text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p
        className={cn(
          "text-sm font-medium",
          tone === "brand" && "text-brand",
          tone === "accent" && "text-brand-violet",
          tone === "neutral" && "text-ink-soft",
        )}
      >
        {meta}
      </p>
    </SurfaceCard>
  );
}

export function SignalCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="surface-panel flex items-start gap-4 p-5">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-soft text-brand">
        {icon}
      </span>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="text-sm leading-6 text-ink-soft">{description}</p>
      </div>
    </div>
  );
}

export function ProgressStepper({ steps, active }: { steps: string[]; active: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {steps.map((step, index) => {
        const isActive = index === active;
        const isComplete = index < active;

        return (
          <div key={step} className="space-y-2">
            <div
              className={cn(
                "h-1 rounded-full bg-surface-muted",
                (isActive || isComplete) &&
                  "bg-[linear-gradient(135deg,var(--color-brand-mint),var(--color-brand-violet))]",
              )}
            />
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border border-line/60 bg-white text-xs font-semibold text-ink-soft",
                  isActive && "border-brand-mint text-brand",
                  isComplete && "border-brand bg-brand text-white",
                )}
              >
                {isComplete ? <Icon name="check" className="size-3.5" /> : index + 1}
              </span>
              <span className={cn("text-sm font-medium text-ink-soft", isActive && "text-ink")}>
                {step}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TimelineList({
  title,
  steps,
}: {
  title: string;
  steps: Array<{ title: string; detail: string }>;
}) {
  return (
    <SurfaceCard className="space-y-5">
      <div className="space-y-2">
        <p className="eyebrow">Workflow map</p>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">{title}</h2>
      </div>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.title} className="flex gap-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-soft text-sm font-semibold text-brand">
              {index + 1}
            </span>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
              <p className="text-sm leading-6 text-ink-soft">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

export function AssetCard({ asset }: { asset: AssetListItem }) {
  const imageUrl =
    asset.image_url ??
    "https://images.unsplash.com/photo-1509391366360-feaffa6021fb?q=80&w=1600&auto=format&fit=crop";

  return (
    <Link href={`/assets/${asset.id}`} className="group block">
      <SurfaceCard className="h-full overflow-hidden p-0">
        <div className="relative aspect-4/3 overflow-hidden">
          <Image
            src={imageUrl}
            alt={asset.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/65 via-transparent to-transparent" />
          <div className="absolute left-5 right-5 top-5 flex items-start justify-between gap-4">
            <span className="token-pill border-white/15 bg-black/25 text-white backdrop-blur-md">
              {formatPercent(asset.expected_annual_yield_percent)} APY
            </span>
            <span className="token-pill border-white/15 bg-white/15 text-white backdrop-blur-md">
              {formatStatus(asset.status)}
            </span>
          </div>
          <div className="absolute inset-x-5 bottom-5 space-y-2 text-white">
            <p className="eyebrow text-white/80">{asset.location_label}</p>
            <h3 className="font-display text-2xl font-semibold tracking-tight">{asset.title}</h3>
          </div>
        </div>
        <div className="grid gap-5 p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="eyebrow">Price / share</p>
              <p className="mt-1 font-semibold text-ink">
                {formatCurrency(asset.price_per_share_usdc)}
              </p>
            </div>
            <div>
              <p className="eyebrow">Capacity</p>
              <p className="mt-1 font-semibold text-ink">{asset.capacity_kw.toLocaleString()} kW</p>
            </div>
            <div>
              <p className="eyebrow">Issuer</p>
              <p className="mt-1 font-semibold text-ink">{asset.issuer_name}</p>
            </div>
            <div>
              <p className="eyebrow">Raise progress</p>
              <p className="mt-1 font-semibold text-ink">{asset.funded_percent ?? 0}% funded</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-violet">
            View asset details <Icon name="chevron-right" className="size-4" />
          </span>
        </div>
      </SurfaceCard>
    </Link>
  );
}

export function DetailHero({ asset }: { asset: AssetDetail }) {
  const imageUrl =
    asset.hero_image_url ??
    "https://images.unsplash.com/photo-1509391366360-feaffa6021fb?q=80&w=1600&auto=format&fit=crop";

  return (
    <section className="relative overflow-hidden rounded-shell border border-white/50 shadow-float">
      <Image src={imageUrl} alt={asset.title} fill sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 grid gap-6 p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-3">
          <span className="token-pill border-white/15 bg-white/10 text-white backdrop-blur-md">
            {formatStatus(asset.status)}
          </span>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {asset.title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-white/78 sm:text-base">
            {asset.short_description}
          </p>
          <p className="inline-flex items-center gap-2 text-sm text-white/78">
            <Icon name="map-pin" className="size-4" />
            {asset.location.city}, {asset.location.region ?? asset.location.country}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {(asset.headline_metrics ?? []).map((metric) => (
            <div
              key={metric.label}
              className="rounded-3xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-md"
            >
              <p className="eyebrow text-white/70">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DetailStatsGrid({ asset }: { asset: AssetDetail }) {
  const stats = [
    ["Capacity", `${asset.capacity_kw.toLocaleString()} kW`],
    ["Valuation", formatCurrency(Number(asset.sale_terms.valuation_usdc))],
    ["Share supply", asset.sale_terms.total_shares.toLocaleString()],
    ["Share price", formatCurrency(Number(asset.sale_terms.price_per_share_usdc))],
    ["Minimum buy", formatCurrency(Number(asset.sale_terms.minimum_buy_amount_usdc))],
    ["Target raise", formatCurrency(Number(asset.sale_terms.target_raise_usdc))],
  ];

  return (
    <div className="grid gap-px overflow-hidden rounded-shell border border-line/70 bg-line sm:grid-cols-2 lg:grid-cols-3">
      {stats.map(([label, value]) => (
        <div key={label} className="bg-surface px-6 py-5">
          <p className="eyebrow">{label}</p>
          <p className="mt-2 text-lg font-semibold text-ink">{value}</p>
        </div>
      ))}
    </div>
  );
}

export function DocumentsList({ documents }: { documents: AssetDocument[] }) {
  return (
    <div className="grid gap-4">
      {documents.map((document) => (
        <SurfaceCard
          key={document.id}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-4">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-soft text-brand">
              <Icon name="document" />
            </span>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-ink">{document.title}</h3>
              <p className="text-sm text-ink-soft">
                {document.type} • {document.storage_provider} • {document.content_hash}
              </p>
            </div>
          </div>
          <a
            href={document.storage_uri}
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-violet"
          >
            Open proof <Icon name="arrow-right" className="size-4" />
          </a>
        </SurfaceCard>
      ))}
    </div>
  );
}

export function RevenueTable({ items }: { items: RevenueEpoch[] }) {
  if (!items.length) {
    return (
      <SurfaceCard>
        <p className="text-sm leading-6 text-ink-soft">
          Revenue history becomes public once the issuer posts a revenue epoch through the
          documented issuer flow.
        </p>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-surface-soft">
            <tr className="text-xs uppercase tracking-[0.18em] text-ink-soft">
              <th className="px-5 py-4 font-semibold">Epoch</th>
              <th className="px-5 py-4 font-semibold">Period</th>
              <th className="px-5 py-4 font-semibold">Distributable</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Report</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-line/60 text-sm text-ink">
                <td className="px-5 py-4 font-medium">#{item.epoch_number}</td>
                <td className="px-5 py-4 text-ink-soft">
                  {formatDateRange(item.period_start, item.period_end)}
                </td>
                <td className="px-5 py-4 font-semibold">
                  {formatCurrency(item.distributable_revenue_usdc)}
                </td>
                <td className="px-5 py-4 capitalize text-ink-soft">
                  {formatStatus(item.posting_status)}
                </td>
                <td className="px-5 py-4">
                  <a href={item.report_uri} className="font-semibold text-brand-violet">
                    View report
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}

export function PortfolioPositionCard({
  position,
  href,
}: {
  position: PortfolioPosition;
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <SurfaceCard className="h-full space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Position</p>
            <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
              {position.title}
            </h3>
          </div>
          <span className="token-pill">{(position.shares_percentage * 100).toFixed(2)}%</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="eyebrow">Shares</p>
            <p className="mt-1 font-semibold text-ink">{position.shares_amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="eyebrow">Claimable</p>
            <p className="mt-1 font-semibold text-brand">
              {formatCurrency(position.unclaimed_usdc)}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-violet">
          Open asset ledger <Icon name="chevron-right" className="size-4" />
        </span>
      </SurfaceCard>
    </Link>
  );
}

export function AuthShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between py-4">
        <BrandMark />
        <span className="token-pill hidden sm:inline-flex">{label}</span>
      </header>
      <main className="mx-auto mt-4 w-full max-w-7xl pb-10">{children}</main>
    </div>
  );
}

export function CatalogShell({ current, children }: { current: NavKey; children: ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <header className="sticky top-4 z-40 mx-auto flex w-full max-w-7xl items-center justify-between rounded-full border border-white/80 bg-white/78 px-5 py-3 backdrop-blur-xl shadow-soft">
        <BrandMark compact />
        <HeaderNav current={current} />
        <SessionBadge />
      </header>
      <main className="mx-auto mt-8 w-full max-w-7xl space-y-10 pb-16">{children}</main>
      <FooterBand />
    </div>
  );
}

export function AppShell({
  current,
  title,
  description,
  eyebrow,
  actions,
  children,
}: {
  current: NavKey;
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <header className="sticky top-4 z-40 mx-auto flex w-full max-w-368 items-center justify-between rounded-full border border-white/80 bg-white/80 px-5 py-3 shadow-soft backdrop-blur-xl">
        <BrandMark compact />
        <HeaderNav current={current} />
        <SessionBadge />
      </header>
      <div className="mx-auto mt-8 grid w-full max-w-368 gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="surface-shell sticky top-28 p-4">
            <nav className="space-y-1">
              {appNav.map((item) => {
                const active = item.key === current;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-ink-soft hover:bg-surface-soft hover:text-ink",
                      active && "bg-ink text-white hover:bg-ink hover:text-white",
                    )}
                  >
                    <Icon name={item.icon} className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <div className="space-y-8 pb-24 lg:pb-8">
          <SectionHeader
            eyebrow={eyebrow}
            title={title}
            description={description}
            actions={actions}
          />
          {children}
        </div>
      </div>
      <nav className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-around rounded-[2rem] border border-white/70 bg-white/92 px-2 py-2 shadow-float backdrop-blur-xl lg:hidden">
        {appNav.slice(0, 5).map((item) => {
          const active = item.key === current;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-ink-soft",
                active && "bg-ink text-white",
              )}
            >
              <Icon name={item.icon} className="size-4" />
              <span className="truncate">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function FooterBand() {
  return (
    <footer className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 border-t border-line/60 pt-8 text-sm text-ink-soft sm:flex-row">
      <p>Investor and issuer flows share one live backend instead of page-local mock payloads.</p>
      <div className="flex flex-wrap items-center gap-4">
        <span className="inline-flex items-center gap-2">
          <Icon name="token" className="size-4" />
          Solana settlement model
        </span>
        <span className="inline-flex items-center gap-2">
          <Icon name="document" className="size-4" />
          Proof-first asset records
        </span>
      </div>
    </footer>
  );
}

export function SplitValue({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "brand" | "accent";
}) {
  return (
    <div className="surface-panel p-5">
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          "mt-3 text-xl font-semibold tracking-tight",
          tone === "neutral" && "text-ink",
          tone === "brand" && "text-brand",
          tone === "accent" && "text-brand-violet",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function HighlightStrip({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: ReactNode;
}) {
  return (
    <div className="surface-shell flex items-start gap-4 p-5">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-soft text-brand">
        {icon}
      </span>
      <div className="space-y-1">
        <h3 className="font-semibold text-ink">{title}</h3>
        <p className="text-sm leading-6 text-ink-soft">{body}</p>
      </div>
    </div>
  );
}

export function AssetMiniFacts({ asset }: { asset: AssetDetail }) {
  return (
    <SurfaceCard className="space-y-5">
      <div className="space-y-1">
        <p className="eyebrow">Asset summary</p>
        <h2 className="font-display text-2xl font-semibold text-ink">Key facts</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SplitValue label="Issuer" value={asset.issuer.display_name} />
        <SplitValue label="Energy type" value={asset.energy_type} />
        <SplitValue label="Sale status" value={asset.sale_terms.sale_status} tone="accent" />
        <SplitValue
          label="Revenue epochs"
          value={String(asset.revenue_summary.total_epochs)}
          tone="brand"
        />
      </div>
    </SurfaceCard>
  );
}

export function CompactStatList({
  items,
}: {
  items: Array<{
    label: string;
    value: string;
    tone?: "neutral" | "brand" | "accent";
  }>;
}) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <SplitValue key={item.label} label={item.label} value={item.value} tone={item.tone} />
      ))}
    </div>
  );
}

export function ValuePairGrid({ positions }: { positions: PortfolioPosition[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {positions.map((position) => (
        <SurfaceCard key={position.asset_id} className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{position.asset_id}</p>
              <h3 className="text-lg font-semibold text-ink">{position.title}</h3>
            </div>
            <span className="token-pill">{formatCompactCurrency(position.unclaimed_usdc)}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="eyebrow">Shares</p>
              <p className="mt-1 font-semibold text-ink">
                {position.shares_amount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="eyebrow">Ownership</p>
              <p className="mt-1 font-semibold text-ink">
                {(position.shares_percentage * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        </SurfaceCard>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actions,
  icon = <Icon name="spark" className="size-5" />,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <SurfaceCard className="space-y-5 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-surface-soft text-brand">
        {icon}
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">{title}</h2>
        <p className="mx-auto max-w-2xl text-sm leading-6 text-ink-soft">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </SurfaceCard>
  );
}

export function StatusNotice({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: ReactNode;
  tone?: "neutral" | "success" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border px-4 py-4 text-sm leading-6",
        tone === "neutral" && "border-line/70 bg-surface-soft text-ink-soft",
        tone === "success" && "border-brand/20 bg-brand/10 text-brand-strong",
        tone === "danger" && "border-danger/20 bg-danger/10 text-danger",
      )}
    >
      <p className="font-semibold text-ink">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function LoadingState({
  title = "Loading",
  description = "Fetching the latest data from the backend.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <SurfaceCard className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-surface-soft text-brand">
          <Icon name="clock" className="size-5" />
        </span>
        <div>
          <p className="font-semibold text-ink">{title}</p>
          <p className="text-sm text-ink-soft">{description}</p>
        </div>
      </div>
    </SurfaceCard>
  );
}

export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <span className="eyebrow">{label}</span>
      {children}
      {hint ? <span className="text-xs leading-5 text-ink-soft">{hint}</span> : null}
    </div>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input-shell", className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("input-shell min-h-32 resize-y", className)} {...props} />;
}

export function SelectInput({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("input-shell", className)} {...props}>
      {children}
    </select>
  );
}

export function Button({
  children,
  tone = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60",
        tone === "primary" &&
          "bg-[linear-gradient(135deg,var(--color-brand-mint),var(--color-brand-violet))] text-white shadow-float hover:-translate-y-0.5",
        tone === "secondary" &&
          "border border-line/70 bg-white/80 text-ink shadow-soft hover:border-brand-violet/30",
        tone === "ghost" && "text-ink-soft hover:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
