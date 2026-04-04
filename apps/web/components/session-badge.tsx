"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { useStoredSession } from "@/lib/session";

function getInitials(displayName: string) {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SessionBadge() {
  const { ready, session } = useStoredSession();
  const initials = session?.user.display_name ? getInitials(session.user.display_name) : "SS";

  if (!ready) {
    return <span className="token-pill hidden lg:inline-flex">Loading session</span>;
  }

  if (!session) {
    return (
      <Link
        href="/auth/login"
        className="hidden items-center gap-2 rounded-full border border-line/70 bg-white/80 px-4 py-2 text-sm font-semibold text-ink shadow-soft hover:border-brand-violet/30 lg:inline-flex"
      >
        <Icon name="lock" className="size-4" />
        Sign in
      </Link>
    );
  }

  return (
    <div className="hidden items-center gap-3 lg:flex">
      <span className="token-pill">
        <Icon name="user" className="size-3.5" />
        {session.user.role}
      </span>
      <div className="flex items-center gap-3 rounded-full border border-white/80 bg-white/80 px-2 py-1 shadow-soft">
        <span className="truncate px-2 text-sm font-medium text-ink">
          {session.user.email ?? session.user.display_name}
        </span>
        <span className="flex size-10 items-center justify-center rounded-full border border-white/80 bg-[linear-gradient(135deg,var(--color-brand-violet),var(--color-brand-mint))] text-sm font-semibold text-white shadow-soft">
          {initials}
        </span>
      </div>
    </div>
  );
}
