"use client";

import {
  ArrowRight,
  ChartNoAxesCombined,
  CircleDollarSign,
  FileCheck2,
  Layers3,
  ShieldCheck,
  SunMedium,
  WalletCards,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { MarketingTryNow } from "@/components/MarketingTryNow";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TryNowLink } from "@/components/TryNowLink";

export default function HomePage() {
  const frictions = [
    {
      icon: WalletCards,
      title: "Access friction",
      description:
        "Solar infrastructure is attractive, but minimum tickets are still far beyond normal retail reach.",
    },
    {
      icon: FileCheck2,
      title: "Trust friction",
      description:
        "Investors need proof that the site, permits, metering and revenue logic are all real and inspectable.",
    },
    {
      icon: ChartNoAxesCombined,
      title: "Liquidity friction",
      description:
        "Traditional project exposure is hard to transfer, hard to price and too slow for internet-native users.",
    },
    {
      icon: CircleDollarSign,
      title: "Operational friction",
      description:
        "Small, recurring yield distribution is painful on legacy rails and too opaque for most investors.",
    },
  ];

  const principles = [
    {
      icon: ShieldCheck,
      title: "Trust-first by design",
      description:
        "Lead with asset passport, proof bundle and claim history. Tokenization is the rail, not the headline.",
    },
    {
      icon: SunMedium,
      title: "Solar-first, then storage",
      description:
        "Start with the easiest renewable asset to verify, explain and visualize, then expand into hybrid income assets.",
    },
    {
      icon: Layers3,
      title: "Web2-simple UX",
      description:
        "Mobile-first, gasless first actions and plain-language investment pages instead of crypto-native complexity.",
    },
  ];

  const flow = [
    "A solar asset is onboarded with documents and verifier review.",
    "Revenue rights are split into fractional digital shares.",
    "Investors fund the raise and track revenue periods with proof.",
    "Yield is claimed through a clean mobile flow instead of paperwork and guesswork.",
  ];

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[560px] opacity-90"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(20,241,149,0.18) 0, rgba(20,241,149,0) 32%), radial-gradient(circle at top right, rgba(153,69,255,0.20) 0, rgba(153,69,255,0) 36%), linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)",
        }}
      />
      <MarketingTryNow />

      <div className="mx-auto max-w-7xl px-5 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-28">
        <header
          className="sticky top-0 z-40 mb-8 rounded-full border px-4 py-3 backdrop-blur-xl sm:px-6"
          style={{
            background: "color-mix(in srgb, var(--bg) 78%, transparent)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full border"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <Image src="/logo.svg" alt="SolaShare logo" width={28} height={28} priority />
              </div>
              <div>
                <p
                  className="text-sm font-black tracking-[0.24em]"
                  style={{ color: "var(--accent-green-ui)" }}
                >
                  SOLASHARE
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Solar revenue rights, not vague green promises.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="hidden items-center gap-3 sm:flex">
                <Link href="/research" className="btn-outline">
                  Research
                </Link>
                <TryNowLink className="btn-sol" />
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-8 py-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:py-10">
          <div className="max-w-3xl">
            <h1
              className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl lg:text-7xl"
              style={{ color: "var(--text)" }}
            >
              Turn verified
              <span className="sol-text"> solar cash flow </span>
              into an asset people can actually understand.
            </h1>
            <p
              className="mt-6 max-w-2xl text-base leading-8 sm:text-lg"
              style={{ color: "var(--text-muted)" }}
            >
              SolaShare packages real solar revenue rights into a clean, inspectable product. Users
              see the asset, the proof, the risks and the payout path before they ever touch a
              wallet.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <TryNowLink className="btn-sol px-8 py-4 text-base" />
              <Link href="/research" className="btn-dark px-8 py-4 text-base">
                Explore Research
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { value: "2.7x", label: "renewable capacity growth by 2030" },
                { value: "95%", label: "of new renewable growth is solar + wind" },
                { value: "4", label: "core frictions SolaShare removes" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[28px] border px-5 py-4"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <p className="text-3xl font-black" style={{ color: "var(--accent-green-ui)" }}>
                    {item.value}
                  </p>
                  <p className="mt-1 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-[36px] border p-5 sm:p-6"
            style={{
              borderColor: "var(--border)",
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, #14F195 8%) 0%, var(--surface) 100%)",
            }}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="label-xs">Signal board</p>
                <h2 className="mt-2 text-2xl font-black">Why this clicks</h2>
              </div>
              <div
                className="rounded-full border px-3 py-1 text-xs font-bold"
                style={{
                  borderColor: "rgb(var(--accent-green-ui-rgb) / 0.25)",
                  color: "var(--accent-green-ui)",
                  background: "rgb(var(--accent-green-ui-rgb) / 0.08)",
                }}
              >
                MVP-ready
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[28px] p-5" style={{ background: "var(--bg)" }}>
                <p className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>
                  Capital gap
                </p>
                <div className="mt-4 grid grid-cols-[1.2fr_0.8fr] gap-3">
                  <div
                    className="rounded-[22px] p-4 text-white"
                    style={{ background: "linear-gradient(135deg, #1d7f57 0%, #14F195 100%)" }}
                  >
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-white/80">
                      Projects
                    </p>
                    <p className="mt-3 text-2xl font-black">Need capital</p>
                    <p className="mt-2 text-sm text-white/80">
                      Real assets exist, but they are hard to package for normal users.
                    </p>
                  </div>
                  <div
                    className="rounded-[22px] border p-4"
                    style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                  >
                    <p
                      className="text-xs font-black uppercase tracking-[0.18em]"
                      style={{ color: "var(--text-faint)" }}
                    >
                      Investors
                    </p>
                    <p className="mt-3 text-xl font-black">Need clarity</p>
                    <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                      Show asset, proof, rights and claim history in one place.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Proof of asset", width: "82%" },
                  { label: "Proof of income", width: "74%" },
                  { label: "Mobile claim UX", width: "91%" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border p-4"
                    style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                  >
                    <p className="text-sm font-bold">{item.label}</p>
                    <div
                      className="mt-4 h-2 rounded-full"
                      style={{ background: "var(--surface-low)" }}
                    >
                      <div
                        className="h-2 rounded-full sol-gradient"
                        style={{ width: item.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="rounded-[28px] border p-5"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <p className="label-xs">Core loop</p>
                <div className="mt-4 space-y-3">
                  {flow.map((step, index) => (
                    <div key={step} className="flex gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-[#081b16]"
                        style={{ background: index === 0 ? "#14F195" : "var(--surface-low)" }}
                      >
                        {index + 1}
                      </div>
                      <p className="pt-1 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="mb-8 max-w-2xl">
            <p className="label-xs mb-3">Problem</p>
            <h2 className="text-3xl font-black sm:text-4xl">
              The energy transition is not just a hardware story anymore.
            </h2>
            <p className="mt-4 text-base leading-7" style={{ color: "var(--text-muted)" }}>
              Solar is scaling. What is still broken is access, verification, transferability and
              investor servicing. SolaShare turns those weak points into product surface instead of
              hiding them behind marketing.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {frictions.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[30px] border p-6"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ background: "rgba(153,69,255,0.10)", color: "#9945FF" }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-black">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="py-10">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="label-xs mb-3">Principles</p>
              <h2 className="text-3xl font-black sm:text-4xl">
                Keep the story narrow. Make the proof obvious.
              </h2>
            </div>
            <Link
              href="/research"
              className="inline-flex items-center gap-2 text-sm font-black text-[#9945FF]"
            >
              Read the full reasoning <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {principles.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[32px] border p-6"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <Icon className="h-6 w-6" style={{ color: "var(--accent-green-ui)" }} />
                  <h3 className="mt-5 text-2xl font-black">{item.title}</h3>
                  <p className="mt-4 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="py-10">
          <div
            className="rounded-[38px] border p-6 sm:p-8 lg:p-10"
            style={{
              borderColor: "var(--border)",
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--surface) 88%, #9945FF 12%) 0%, color-mix(in srgb, var(--surface) 94%, #14F195 6%) 100%)",
            }}
          >
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
              <div>
                <p className="label-xs mb-3">Why now</p>
                <h2 className="max-w-2xl text-3xl font-black sm:text-4xl">
                  Three trends are finally aligning for a category like this.
                </h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {[
                    "Solar remains one of the cheapest forms of new electricity generation.",
                    "Distributed capital and storage are becoming more important, not less.",
                    "Tokenization has matured as back-end financial infrastructure.",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className="rounded-[28px] border p-5"
                      style={{
                        borderColor: "var(--border)",
                        background: "rgba(255,255,255,0.42)",
                      }}
                    >
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9945FF]">
                        0{index + 1}
                      </p>
                      <p className="mt-4 text-sm leading-7">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div
                className="rounded-[30px] p-6"
                style={{ background: "rgba(8,16,18,0.84)", color: "#ecf7f2" }}
              >
                <p
                  className="text-xs font-black uppercase tracking-[0.22em]"
                  style={{ color: "var(--accent-green-ui)" }}
                >
                  Visible CTA
                </p>
                <h3 className="mt-4 text-3xl font-black">Skip the theory and open the product.</h3>
                <p className="mt-4 text-sm leading-7 text-white/72">
                  The research matters, but the page should never make users hunt for the next
                  action.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <TryNowLink className="btn-sol justify-between px-6 py-4 text-base" />
                  <Link
                    href="/research"
                    className="btn-outline justify-between border-white/10 px-6 py-4 text-base text-white/80 hover:bg-white/5 hover:text-white"
                  >
                    Open Research
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
