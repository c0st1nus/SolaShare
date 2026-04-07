"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

type TryNowLinkProps = {
  className: string;
  label?: string;
  showIcon?: boolean;
};

export function TryNowLink({ className, label = "Try Now", showIcon = true }: TryNowLinkProps) {
  const { user, isLoading } = useAuth();

  const href = isLoading ? "/login" : user ? "/assets" : "/login";

  return (
    <Link href={href} className={className}>
      {label}
      {showIcon ? <ArrowRight className="h-4 w-4" /> : null}
    </Link>
  );
}
