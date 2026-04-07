import { TryNowLink } from "@/components/TryNowLink";

export function MarketingTryNow() {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center md:bottom-6 md:justify-end">
      <TryNowLink className="pointer-events-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#14F195] px-5 py-3 text-sm font-black text-[#082018] shadow-[0_16px_50px_rgba(20,241,149,0.28)] transition-transform hover:scale-[1.02] active:scale-95" />
    </div>
  );
}
