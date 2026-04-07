import {
  ArrowRight,
  BarChart3,
  FileSearch,
  Globe2,
  Landmark,
  Link2,
  ShieldAlert,
  ShieldCheck,
  SunMedium,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { MarketingTryNow } from "@/components/MarketingTryNow";
import { ResearchEvidenceCharts } from "@/components/ResearchEvidenceCharts";
import { TryNowLink } from "@/components/TryNowLink";

const convergence = [
  {
    icon: SunMedium,
    title: "Solar keeps scaling",
    description:
      "The asset class is not niche anymore. Solar is one of the clearest renewable categories to explain and to measure.",
    stat: "2.7x renewable capacity growth by 2030",
  },
  {
    icon: BarChart3,
    title: "Infrastructure finance is the bottleneck",
    description:
      "Deployment depends on better financing, stronger grid integration and more flexible capital access.",
    stat: "940 GW annual renewable additions by 2030",
  },
  {
    icon: Link2,
    title: "Tokenization is useful here",
    description:
      "Not as speculation, but as a cleaner system for ownership records, payout logic and transparency.",
    stat: "Trust stack > token stack",
  },
];

const frictions = [
  {
    title: "Access",
    description: "Retail users rarely get direct, fractional exposure to real project cash flows.",
  },
  {
    title: "Trust",
    description:
      "The asset, permits, metering and revenue reports are hard to verify from the outside.",
  },
  {
    title: "Liquidity",
    description:
      "Traditional infrastructure participation is illiquid and painful to transfer or exit.",
  },
  {
    title: "Operations",
    description: "Frequent, transparent revenue sharing is expensive and messy on legacy rails.",
  },
];

const verticalReasons = [
  "Solar is globally scaling and remains cost-competitive.",
  "It is easier to prove than many other RWAs: location, panels, capacity, metering and invoices are inspectable.",
  "It is intuitive for judges and investors. The pitch fits in one sentence.",
  "Solar-first creates a strong path toward solar-plus-storage later.",
];

const trustStack = [
  "Public asset passport",
  "Public proof bundle",
  "Structured diligence summary",
  "Investor-readable economics page",
  "Auditable revenue posting",
  "Clear claim history",
];

const risks = [
  {
    title: "Regulatory ambiguity",
    mitigation: "Keep the legal claim narrow and avoid vague ownership language.",
  },
  {
    title: "Fraudulent or overstated assets",
    mitigation: "Mandatory verification, external proof storage and verifier accountability.",
  },
  {
    title: "Revenue reporting manipulation",
    mitigation: "Standardized evidence templates and meter-linked reporting where possible.",
  },
  {
    title: "Liquidity illusion",
    mitigation: "Do not market transferability as guaranteed liquidity until there is real depth.",
  },
  {
    title: "Crypto-native UX drop-off",
    mitigation: "Gasless first action, mobile-first flows and plain-language screens.",
  },
  {
    title: "Country and power-market risk",
    mitigation:
      "Start with a narrow Kazakhstan pilot and a roadmap toward storage-supported assets.",
  },
];

const demoFlow = [
  "Show the solar asset and its verification package.",
  "Mint and purchase fractional shares.",
  "Publish a revenue epoch with proof.",
  "Claim yield and open the investor dashboard.",
];

const sources = [
  {
    label: "IEA: Renewables 2024",
    href: "https://www.iea.org/reports/renewables-2024/executive-summary",
  },
  {
    label: "IEA: Electricity 2026 Flexibility",
    href: "https://www.iea.org/reports/electricity-2026/flexibility",
  },
  {
    label: "IRENA: Renewable Power Generation Costs in 2024",
    href: "https://www.irena.org/publications/2025/Jun/Renewable-Power-Generation-Costs-in-2024",
  },
  {
    label: "World Economic Forum: Asset Tokenization in Financial Markets",
    href: "https://www.weforum.org/publications/asset-tokenization-in-financial-markets-the-next-generation-of-value-exchange/",
  },
  {
    label: "EBRD: Renewable precedent in Kazakhstan",
    href: "https://www.ebrd.com/home/news-and-events/news/2020/ebrd-gcf-and-cifs-us-426-million-for-solar-plant-in-kazakhstan.html",
  },
];

const evidenceCards = [
  {
    thesis: "Solar is a real macro category, not a niche demo vertical.",
    proof:
      "IEA projects global renewable capacity growth of 2.7x by 2030, with solar PV and wind driving 95% of the increase.",
    source: "IEA Renewables 2024",
    href: "https://www.iea.org/reports/renewables-2024/executive-summary",
  },
  {
    thesis: "Solar economics have structurally improved.",
    proof:
      "IRENA reports utility-scale solar PV installed costs of USD 691/kW in 2024, down 87% from 2010 and 11% year-on-year.",
    source: "IRENA Renewable Power Generation Costs in 2024",
    href: "https://www.irena.org/publications/2025/Jun/Renewable-Power-Generation-Costs-in-2024",
  },
  {
    thesis: "Kazakhstan is viable, but only with regional selectivity.",
    proof:
      "The cited resource study puts solar capacity factors roughly between 13% and 18%, with the south materially stronger than the north.",
    source: "Resource assessment for green hydrogen production in Kazakhstan",
    href: "https://www.sciencedirect.com/science/article/pii/S0360319923001805",
  },
  {
    thesis: "Tokenization matters when it improves servicing, not when it becomes the pitch.",
    proof:
      "The research anchors the product in transparency, programmability, fractional ownership and auditable payout logic rather than generic crypto claims.",
    source: "WEF Asset Tokenization in Financial Markets",
    href: "https://www.weforum.org/publications/asset-tokenization-in-financial-markets-the-next-generation-of-value-exchange/",
  },
];

export default function ResearchPage() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[520px]"
        style={{
          background:
            "radial-gradient(circle at left top, rgba(153,69,255,0.18) 0, rgba(153,69,255,0) 32%), radial-gradient(circle at right top, rgba(20,241,149,0.16) 0, rgba(20,241,149,0) 28%)",
        }}
      />
      <MarketingTryNow />

      <div className="mx-auto max-w-7xl px-5 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-28">
        <header
          className="sticky top-0 z-40 mb-8 rounded-full border px-4 py-3 backdrop-blur-xl sm:px-6"
          style={{
            background: "color-mix(in srgb, var(--bg) 82%, transparent)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <Image src="/logo.svg" alt="SolaShare logo" width={28} height={28} priority />
              </Link>
              <div>
                <p
                  className="text-sm font-black tracking-[0.24em]"
                  style={{ color: "var(--accent-green-ui)" }}
                >
                  RESEARCH
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Condensed from the full `research.md` into a mobile-friendly narrative.
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              <Link href="/" className="btn-outline">
                Landing
              </Link>
              <TryNowLink className="btn-sol" />
            </div>
          </div>
        </header>

        <section className="grid gap-8 pb-10 pt-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-black leading-[1] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
              Why SolaShare should be framed as
              <span className="sol-text"> tokenized infrastructure finance</span>, not "crypto for
              solar".
            </h1>
            <p
              className="mt-6 max-w-2xl text-base leading-8 sm:text-lg"
              style={{ color: "var(--text-muted)" }}
            >
              The research argues for a narrow and credible story: fractional access to verified
              solar revenue rights, backed by proof layers, auditable cash-flow logic and
              mobile-first investor UX.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <TryNowLink className="btn-sol px-8 py-4 text-base" />
              <Link href="/" className="btn-dark px-8 py-4 text-base">
                Back to Landing
              </Link>
            </div>
          </div>

          <div
            className="rounded-[34px] border p-5 sm:p-6"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <p className="label-xs">Fast read</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Core framing", value: "Trust-first solar cash flows" },
                { label: "First market", value: "Small and mid-sized solar assets" },
                { label: "Why Solana", value: "Cheap claims and mobile-friendly UX" },
                { label: "MVP goal", value: "Verified asset -> purchase -> revenue -> claim" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] p-4"
                  style={{ background: "var(--surface-low)" }}
                >
                  <p
                    className="text-xs font-black uppercase tracking-[0.18em]"
                    style={{ color: "var(--text-faint)" }}
                  >
                    {item.label}
                  </p>
                  <p className="mt-3 text-base font-bold leading-6">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="mb-8 max-w-3xl">
            <p className="label-xs mb-3">Evidence</p>
            <h2 className="text-3xl font-black sm:text-4xl">
              The main claims need explicit proof, not just narrative.
            </h2>
            <p className="mt-4 text-base leading-7" style={{ color: "var(--text-muted)" }}>
              These charts are pulled directly from the numerical claims already documented in
              `research.md`. They are here to make the thesis auditable at a glance.
            </p>
          </div>
          <ResearchEvidenceCharts />
        </section>

        <section className="py-8">
          <div className="mb-8 max-w-3xl">
            <p className="label-xs mb-3">Proof Layer</p>
            <h2 className="text-3xl font-black sm:text-4xl">
              Each strategic statement should tie back to an observable fact.
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {evidenceCards.map((item) => (
              <a
                key={item.thesis}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-[30px] border p-6 transition-colors hover:border-[rgb(var(--accent-green-ui-rgb)/0.40)]"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                }}
              >
                <p
                  className="text-xs font-black uppercase tracking-[0.2em]"
                  style={{ color: "var(--accent-green-ui)" }}
                >
                  {item.source}
                </p>
                <h3 className="mt-4 text-xl font-black">{item.thesis}</h3>
                <p className="mt-3 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
                  {item.proof}
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#9945FF]">
                  Open source
                  <ArrowRight className="h-4 w-4" />
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="py-8">
          <div className="mb-8 max-w-2xl">
            <p className="label-xs mb-3">Convergence</p>
            <h2 className="text-3xl font-black sm:text-4xl">
              Three forces make this thesis believable now.
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {convergence.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[30px] border p-6"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{
                      background: "rgb(var(--accent-green-ui-rgb) / 0.1)",
                      color: "var(--accent-green-ui)",
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-black">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
                    {item.description}
                  </p>
                  <p className="mt-5 text-sm font-black text-[#9945FF]">{item.stat}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(280px,0.78fr)]">
            <div
              className="rounded-[34px] border p-6 sm:p-8"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <p className="label-xs mb-3">Problem definition</p>
              <h2 className="text-3xl font-black">
                The market problem is not solar demand. It is access and legibility.
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {frictions.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[24px] p-5"
                    style={{ background: "var(--surface-low)" }}
                  >
                    <p className="text-lg font-black">{item.title}</p>
                    <p className="mt-3 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[34px] border p-6 sm:p-8"
              style={{
                borderColor: "var(--border)",
                background:
                  "linear-gradient(180deg, rgb(var(--accent-green-ui-rgb) / 0.10) 0%, var(--surface) 100%)",
              }}
            >
              <p className="label-xs mb-3">Why Kazakhstan</p>
              <h2 className="text-3xl font-black">
                A plausible pilot market, not a global abstraction.
              </h2>
              <div className="mt-6 space-y-4">
                {[
                  "Strong solar regions in the south and south-west.",
                  "Existing project-finance precedent through EBRD-backed renewables.",
                  "Good fit for regional, distributed and mid-sized projects rather than utility-scale megaprojects.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-[24px] border p-4"
                    style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.55)" }}
                  >
                    <Landmark
                      className="mt-1 h-4 w-4 shrink-0"
                      style={{ color: "var(--accent-green-ui)" }}
                    />
                    <p className="text-sm leading-7">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div
              className="rounded-[34px] border p-6 sm:p-8"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <p className="label-xs mb-3">Why Solar First</p>
              <h2 className="text-3xl font-black">Solar is the cleanest first vertical.</h2>
              <div className="mt-6 space-y-3">
                {verticalReasons.map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-[24px] p-4"
                    style={{ background: "var(--surface-low)" }}
                  >
                    <SunMedium className="mt-1 h-4 w-4 shrink-0 text-[#9945FF]" />
                    <p className="text-sm leading-7">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[34px] border p-6 sm:p-8"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <p className="label-xs mb-3">Trust Stack</p>
              <h2 className="text-3xl font-black">Investors need proof layers, not slogans.</h2>
              <div className="mt-6 space-y-3">
                {trustStack.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-4 rounded-[22px] border px-4 py-3"
                    style={{ borderColor: "var(--border)", background: "var(--surface-low)" }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#14F195] text-sm font-black text-[#082018]">
                      {index + 1}
                    </div>
                    <span className="text-sm font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.75fr)]">
            <div
              className="rounded-[34px] border p-6 sm:p-8"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <p className="label-xs mb-3">MVP Recommendation</p>
              <h2 className="text-3xl font-black">
                The demo should prove one end-to-end loop and stop there.
              </h2>
              <div className="mt-6 space-y-4">
                {demoFlow.map((item, index) => (
                  <div
                    key={item}
                    className="flex gap-4 rounded-[26px] border p-4"
                    style={{ borderColor: "var(--border)", background: "var(--surface-low)" }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#9945FF] text-sm font-black text-white">
                      0{index + 1}
                    </div>
                    <p className="pt-1 text-sm leading-7">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[34px] border p-6 sm:p-8"
              style={{
                borderColor: "var(--border)",
                background:
                  "linear-gradient(180deg, rgba(153,69,255,0.10) 0%, var(--surface) 100%)",
              }}
            >
              <p className="label-xs mb-3">Product framing</p>
              <h2 className="text-3xl font-black">The strongest message</h2>
              <div
                className="mt-6 rounded-[26px] p-5"
                style={{ background: "rgba(8,16,18,0.9)", color: "white" }}
              >
                <p className="text-sm leading-8 text-white/84">
                  SolaShare is a trust-first financing and investor-access layer for verified solar
                  cash flows.
                </p>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  "Do not pitch a generic tokenization platform.",
                  "Do not overpromise APY or secondary liquidity.",
                  "Do not ask users to believe in Web3 before they understand the asset.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-[24px] p-4"
                    style={{ background: "var(--surface-low)" }}
                  >
                    <FileSearch
                      className="mt-1 h-4 w-4 shrink-0"
                      style={{ color: "var(--accent-green-ui)" }}
                    />
                    <p className="text-sm leading-7">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="mb-8 max-w-2xl">
            <p className="label-xs mb-3">Risks</p>
            <h2 className="text-3xl font-black sm:text-4xl">
              The weak points are known. That is a good sign.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {risks.map((item) => (
              <div
                key={item.title}
                className="rounded-[30px] border p-6"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444" }}
                >
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-black">{item.title}</h3>
                <p className="mt-3 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
                  {item.mitigation}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
            <div
              className="rounded-[34px] border p-6 sm:p-8"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <p className="label-xs mb-3">Source stack</p>
              <h2 className="text-3xl font-black">Key references behind this page</h2>
              <div className="mt-6 space-y-3">
                {sources.map((source) => (
                  <a
                    key={source.href}
                    href={source.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-4 rounded-[24px] border px-4 py-4 transition-colors hover:border-[#9945FF]/30 hover:text-[#9945FF]"
                    style={{ borderColor: "var(--border)", background: "var(--surface-low)" }}
                  >
                    <span className="text-sm font-semibold">{source.label}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </a>
                ))}
              </div>
            </div>

            <div
              className="rounded-[34px] border p-6 sm:p-8"
              style={{
                borderColor: "var(--border)",
                background:
                  "linear-gradient(135deg, rgba(20,241,149,0.12) 0%, rgba(153,69,255,0.10) 100%)",
              }}
            >
              <p className="label-xs mb-3">Conclusion</p>
              <h2 className="text-3xl font-black">
                If the product leads with proof, the idea has depth.
              </h2>
              <p className="mt-5 text-sm leading-8" style={{ color: "var(--text-muted)" }}>
                The thesis is strongest when SolaShare acts like a serious infrastructure-finance
                surface: narrow claims, clear rights, auditable payouts and simple investor UX.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  { icon: ShieldCheck, text: "Lead with verification and clarity." },
                  { icon: Wallet, text: "Keep onboarding simple and mobile-first." },
                  { icon: Globe2, text: "Use tokenization as infrastructure, not spectacle." },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.text}
                      className="flex gap-3 rounded-[22px] border p-4"
                      style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.55)" }}
                    >
                      <Icon
                        className="mt-1 h-4 w-4 shrink-0"
                        style={{ color: "var(--accent-green-ui)" }}
                      />
                      <p className="text-sm leading-7">{item.text}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 flex flex-col gap-3">
                <TryNowLink className="btn-sol justify-between px-6 py-4 text-base" />
                <Link href="/" className="btn-dark justify-between px-6 py-4 text-base">
                  Back to Landing
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
