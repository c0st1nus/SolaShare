"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getVisibleAppNav } from "@/components/app-nav";
import { useAuth } from "@/lib/auth";

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = getVisibleAppNav(user);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 z-50 flex w-full items-center gap-2 rounded-t-3xl border-t px-4 pb-6 pt-3 transition-colors"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl p-2 text-center transition-all active:scale-90 ${
              active ? "bg-[#9945FF]/10 text-[#9945FF]" : ""
            }`}
            style={active ? {} : { color: "var(--text-faint)" }}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
