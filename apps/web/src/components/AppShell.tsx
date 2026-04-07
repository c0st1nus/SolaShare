"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
import { getVisibleAppNav } from "@/components/app-nav";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { TopControls } from "@/components/TopControls";
import { useAuth } from "@/lib/auth";

const MARKETING_ROUTES = new Set(["/", "/research"]);
const SWIPE_THRESHOLD = 70;
const SWIPE_RESTRAINT = 36;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const isMarketingRoute = MARKETING_ROUTES.has(pathname);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const navItems = getVisibleAppNav(user);
  const currentIndex = navItems.findIndex((item) => pathname.startsWith(item.href));

  if (isMarketingRoute) {
    return <>{children}</>;
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.changedTouches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (touchStartX.current === null || touchStartY.current === null || currentIndex === -1) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaY) > SWIPE_RESTRAINT) {
      return;
    }

    const nextIndex =
      deltaX > 0 ? Math.max(0, currentIndex - 1) : Math.min(navItems.length - 1, currentIndex + 1);

    if (nextIndex !== currentIndex) {
      router.push(navItems[nextIndex].href);
    }
  };

  return (
    <>
      <TopControls />
      <Sidebar />
      <main
        className="min-h-screen pb-24 pt-24 lg:ml-64 lg:pb-8 lg:pt-10"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </main>
      <BottomNav />
      <footer className="border-t px-8 py-10 lg:ml-64" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <span className="text-xs font-bold opacity-40" style={{ color: "var(--text)" }}>
            © 2025 SolaShare. Powered by Solana.
          </span>
          <div className="flex gap-8">
            {["Documentation", "Privacy Policy", "Terms", "Discord"].map((label) => (
              <a
                key={label}
                href="#"
                className="text-xs font-medium opacity-40 transition-all hover:text-[#9945FF] hover:opacity-100"
                style={{ color: "var(--text)" }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
