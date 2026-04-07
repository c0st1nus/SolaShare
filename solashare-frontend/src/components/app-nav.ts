import type { LucideIcon } from "lucide-react";
import { Bolt, Shield, Store, Wallet } from "lucide-react";
import type { AuthUser } from "@/types";

export type AppNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  auth?: boolean;
  role?: string;
};

const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/assets", icon: Store, label: "Marketplace" },
  {
    href: "/portfolio",
    icon: Wallet,
    label: "My Assets",
    auth: true,
    role: "investor",
  },
  { href: "/issuer", icon: Bolt, label: "Issuer", auth: true, role: "issuer" },
  { href: "/admin", icon: Shield, label: "Admin", auth: true, role: "admin" },
];

export function getVisibleAppNav(user: AuthUser | null): AppNavItem[] {
  return APP_NAV_ITEMS.filter((item) => {
    if (!item.auth) {
      return true;
    }

    if (!user) {
      return false;
    }

    if (item.role && user.role !== item.role) {
      return false;
    }

    return true;
  });
}
