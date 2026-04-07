"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getVisibleAppNav } from "@/components/app-nav";
import { useAuth } from "@/lib/auth";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const links = getVisibleAppNav(user);

  return (
    <aside
      className="hidden lg:flex flex-col w-64 fixed left-0 top-0 h-full pt-20 border-r z-40 transition-colors"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <nav className="flex-1 px-4 pt-2 space-y-1">
        {links.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-[#9945FF]/5 text-[#9945FF] transition-all"
                  : "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:bg-[var(--surface-low)]"
              }
              style={active ? {} : { color: "var(--text-muted)" }}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 pb-6">
        <div className="rounded-2xl p-4" style={{ background: "var(--surface-low)" }}>
          <p className="label-xs mb-2">Network</p>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--accent-green-ui)" }}
            />
            <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
              Solana Devnet
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
