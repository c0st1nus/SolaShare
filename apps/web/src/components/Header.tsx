"use client";
import { CheckCircle2, LogOut, Menu, Wallet, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/types";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/assets", label: "Marketplace" },
  { href: "/portfolio", label: "My Assets", role: "investor" as UserRole },
  { href: "/issuer", label: "Issuer", role: "issuer" as UserRole },
  { href: "/admin", label: "Admin", role: "admin" as UserRole },
];

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = NAV.filter((l) => !l.role || user?.role === l.role);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl transition-colors"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between px-6 lg:px-8 h-16 max-w-[1440px] mx-auto">
        <Link href="/" className="text-xl font-bold sol-text lg:hidden">
          SolaShare
        </Link>
        <div className="hidden lg:block" />

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold absolute left-1/2 -translate-x-1/2">
          {links.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`pb-0.5 transition-colors ${
                  active
                    ? "text-[#2d2f2f] dark:text-white border-b-2 border-[var(--accent-green-ui)]"
                    : "text-gray-400 hover:text-[#2d2f2f] dark:hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {user?.wallet_address && (
            <Link
              href="/profile"
              className="hidden lg:inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors hover:border-[#14F195]/40"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              title={user.wallet_address}
            >
              <Wallet className="w-3.5 h-3.5 text-[#14F195]" />
              <CheckCircle2 className="w-3 h-3 text-[#14F195]" />
            </Link>
          )}

          {user ? (
            <button
              type="button"
              onClick={logout}
              className="hidden sm:inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-colors hover:border-red-400/40 hover:text-red-400"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              {user.display_name}
              <LogOut className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link href="/login" className="btn-sol text-xs px-4 py-2">
              Connect
            </Link>
          )}

          <button
            type="button"
            className="md:hidden p-1.5 rounded-lg"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="md:hidden border-t px-4 py-3 space-y-1"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                pathname.startsWith(l.href) ? "bg-[#9945FF]/5 text-[#9945FF] font-bold" : ""
              }`}
              style={pathname.startsWith(l.href) ? {} : { color: "var(--text-muted)" }}
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-red-400"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
