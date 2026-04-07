"use client";

import { ArrowRight, FileText, Lightbulb, MapPin, Sparkles, X, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { issuerApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { uploadAssetDocument } from "@/lib/uploads";
import { formatNumber, formatUSDC } from "@/lib/utils";
import type { DocumentType } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type DraftDocument = {
  id: string;
  file: File;
  type: DocumentType;
  title: string;
  is_public: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ENERGY_OPTIONS = [
  { value: "solar", label: "Solar (PV)" },
  { value: "wind", label: "Wind Turbine" },
  { value: "hydro", label: "Hydro Power" },
  { value: "ev_charging", label: "EV Charging Hub" },
  { value: "other", label: "Other" },
] as const;

const DOCUMENT_TYPE_OPTIONS: Array<{ value: DocumentType; label: string }> = [
  { value: "technical_passport", label: "Technical Passport" },
  { value: "ownership_doc", label: "Ownership Document" },
  { value: "right_to_income_doc", label: "Right to Income" },
  { value: "financial_model", label: "Financial Model" },
  { value: "photo", label: "Photo / Media" },
  { value: "meter_info", label: "Meter Information" },
  { value: "revenue_report", label: "Revenue Report" },
  { value: "other", label: "Other" },
];

const STEPS = [
  { n: 1, label: "Basic Information" },
  { n: 2, label: "Financial Model" },
  { n: 3, label: "Verification Proofs" },
  { n: 4, label: "Final Review" },
];

const SHARES_PER_KW = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function derivePricing(capacityKw: string, valuationUsdc: string) {
  const cap = Number(capacityKw);
  const val = Number(valuationUsdc);
  if (!Number.isFinite(cap) || cap <= 0 || !Number.isFinite(val) || val <= 0)
    return { totalShares: null, pricePerShare: null, targetRaise: null };
  const totalShares = Math.max(100, Math.round(cap * SHARES_PER_KW));
  return { totalShares, pricePerShare: val / totalShares, targetRaise: val };
}

function inferDocumentType(file: File): DocumentType {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("image/")) return "photo";
  if (name.includes("passport")) return "technical_passport";
  if (name.includes("owner")) return "ownership_doc";
  if (name.includes("income")) return "right_to_income_doc";
  if (name.includes("model")) return "financial_model";
  if (name.includes("meter")) return "meter_info";
  if (name.includes("revenue") || name.includes("report")) return "revenue_report";
  return "other";
}

function stripExtension(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewAssetPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [info, setInfo] = useState({
    title: "",
    short_description: "",
    full_description: "",
    energy_type: "solar",
    location_country: "Kazakhstan",
    location_city: "",
    capacity_kw: "",
  });

  const [sale, setSale] = useState({
    valuation_usdc: "",
    minimum_buy_amount_usdc: "",
  });

  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<DraftDocument[]>([]);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const docsInputRef = useRef<HTMLInputElement>(null);

  const coverImagePreview = useMemo(() => {
    if (!coverImageFile?.type.startsWith("image/")) return null;
    return URL.createObjectURL(coverImageFile);
  }, [coverImageFile]);

  useEffect(() => {
    return () => {
      if (coverImagePreview) URL.revokeObjectURL(coverImagePreview);
    };
  }, [coverImagePreview]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--accent-green-ui)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!user || user.role !== "issuer") {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <p className="mb-6" style={{ color: "var(--text-muted)" }}>
          {!user ? "Sign in as an issuer to create assets." : "Access restricted to issuers."}
        </p>
        <Link href="/login" className="btn-sol px-8">
          Go to Login
        </Link>
      </div>
    );
  }

  // ── Derived data ────────────────────────────────────────────────────────────

  const pricing = derivePricing(info.capacity_kw, sale.valuation_usdc);

  // ── Document helpers ────────────────────────────────────────────────────────

  function handleDocsSelected(files: FileList | null) {
    if (!files) return;
    setDocuments((cur) => [
      ...cur,
      ...Array.from(files).map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        type: inferDocumentType(f),
        title: stripExtension(f.name),
        is_public: f.type.startsWith("image/"),
      })),
    ]);
  }

  function updateDoc(id: string, patch: Partial<Omit<DraftDocument, "id" | "file">>) {
    setDocuments((cur) => cur.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function removeDoc(id: string) {
    setDocuments((cur) => cur.filter((d) => d.id !== id));
  }

  // ── Fill test data ───────────────────────────────────────────────────────────

  function fillTestData() {
    if (step === 1) {
      setInfo({
        title: "Almaty Solar Farm Alpha",
        short_description: "Yield-bearing rooftop solar installation in Almaty.",
        full_description: "A 150 kW grid-connected solar installation delivering stable yield.",
        energy_type: "solar",
        location_country: "Kazakhstan",
        location_city: "Almaty",
        capacity_kw: "150",
      });
    } else if (step === 2) {
      setSale({ valuation_usdc: "100000", minimum_buy_amount_usdc: "50" });
      setInfo((c) => ({
        ...c,
        short_description: c.short_description || "Yield-bearing rooftop solar installation.",
        full_description: c.full_description || "A 150 kW grid-connected solar installation.",
      }));
    }
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  function canProceed() {
    if (step === 1) return info.title.trim() && info.capacity_kw && info.location_city.trim();
    if (step === 2)
      return sale.valuation_usdc && sale.minimum_buy_amount_usdc && info.short_description.trim();
    return true;
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function submitForm(submitForReview: boolean) {
    if (submitForReview && documents.length === 0) {
      setError("Attach at least one document before sending to review.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      let coverImageUrl: string | undefined;
      if (coverImageFile) {
        const up = await uploadAssetDocument(coverImageFile);
        coverImageUrl = up.file_url;
      }
      const created = await issuerApi.createAsset({
        ...info,
        capacity_kw: Number(info.capacity_kw),
        cover_image_url: coverImageUrl,
      });
      await issuerApi.setSaleTerms(created.asset_id, {
        valuation_usdc: Number(sale.valuation_usdc),
        minimum_buy_amount_usdc: Number(sale.minimum_buy_amount_usdc),
      });
      for (const doc of documents) {
        const up = await uploadAssetDocument(doc.file);
        await issuerApi.uploadDocument(created.asset_id, {
          type: doc.type,
          title: doc.title,
          storage_provider: "s3",
          storage_uri: up.file_url,
          content_hash: up.content_hash,
          mime_type: doc.file.type || "application/octet-stream",
          is_public: doc.is_public,
        });
      }
      if (submitForReview) await issuerApi.submit(created.asset_id);
      router.push(`/issuer/assets/${created.asset_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create asset.");
      setLoading(false);
    }
  }

  // ── Layout ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen py-10 px-4 sm:px-8 animate-fade-in"
      style={{ background: "var(--bg)" }}
    >
      <div className="max-w-[1100px] mx-auto flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Left sidebar ──────────────────────────────────────────────────── */}
        <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-8 space-y-5">
          {/* Logo + title */}
          <div className="card p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl sol-gradient flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black leading-snug" style={{ color: "var(--text)" }}>
                Create New Solar Asset
              </h1>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Tokenize your solar infrastructure on the Solana blockchain. Ensure all financial
                data is accurate before publishing to the decentralized ledger.
              </p>
            </div>

            {/* Steps */}
            <nav className="space-y-1 pt-2">
              {STEPS.map((s) => {
                const done = s.n < step;
                const active = s.n === step;
                return (
                  <div key={s.n} className="flex items-center gap-3 py-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                        done
                          ? "sol-gradient text-white"
                          : active
                            ? "border-2"
                            : "border-2 text-[var(--text-faint)]"
                      }`}
                      style={
                        active
                          ? {
                              color: "var(--accent-green-ui)",
                              borderColor: "var(--accent-green-ui)",
                              background: "rgb(var(--accent-green-ui-rgb) / 0.1)",
                            }
                          : !done
                            ? { borderColor: "var(--border)" }
                            : {}
                      }
                    >
                      {done ? "✓" : s.n}
                    </div>
                    <span
                      className="text-sm font-bold transition-colors"
                      style={{
                        color: active
                          ? "var(--accent-green-ui)"
                          : done
                            ? "var(--text)"
                            : "var(--text-faint)",
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Pro tip */}
          <div className="card p-4 flex gap-3">
            <Lightbulb
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: "var(--accent-green-ui)" }}
            />
            <div>
              <p className="mb-1 text-xs font-black" style={{ color: "var(--accent-green-ui)" }}>
                Pro Tip
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                High-quality Arweave documentation increases investor trust by up to 40%.
              </p>
            </div>
          </div>
        </aside>

        {/* ── Form panel ────────────────────────────────────────────────────── */}
        <div className="flex-1 card overflow-hidden">
          {/* Panel header */}
          <div
            className="flex items-start justify-between px-8 pt-7 pb-5 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <p className="label-xs mb-1">
                STEP {step} OF {STEPS.length}
              </p>
              <h2 className="text-2xl font-black" style={{ color: "var(--text)" }}>
                {STEPS[step - 1].label}
              </h2>
            </div>
            <Link
              href="/issuer"
              className="p-2 rounded-xl hover:bg-[var(--surface-low)] transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <X className="w-5 h-5" />
            </Link>
          </div>

          {/* Panel body */}
          <div className="px-8 py-6 space-y-5">
            {/* ─── Step 1: Basic Information ─────────────────────────────── */}
            {step === 1 && (
              <>
                {/* Asset Legal Name */}
                <div>
                  <label className="label-xs mb-2 block">ASSET LEGAL NAME</label>
                  <input
                    className="input-new"
                    placeholder="e.g. Almaty Solar Farm Alpha"
                    value={info.title}
                    onChange={(e) => setInfo((c) => ({ ...c, title: e.target.value }))}
                  />
                </div>

                {/* Asset Type + Capacity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-xs mb-2 block">ASSET TYPE</label>
                    <select
                      className="input-new"
                      value={info.energy_type}
                      onChange={(e) => setInfo((c) => ({ ...c, energy_type: e.target.value }))}
                    >
                      {ENERGY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-xs mb-2 block">PROJECT CAPACITY (KW)</label>
                    <input
                      type="number"
                      min="1"
                      className="input-new"
                      placeholder="150"
                      value={info.capacity_kw}
                      onChange={(e) => setInfo((c) => ({ ...c, capacity_kw: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Geographic Location */}
                <div>
                  <label className="label-xs mb-2 block">GEOGRAPHIC LOCATION</label>
                  <div className="relative">
                    <MapPin
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: "var(--text-faint)" }}
                    />
                    <input
                      className="input-new pl-10"
                      placeholder="City, Country"
                      value={
                        info.location_city ? `${info.location_city}, ${info.location_country}` : ""
                      }
                      onChange={(e) => {
                        const parts = e.target.value.split(",");
                        setInfo((c) => ({
                          ...c,
                          location_city: parts[0]?.trim() ?? "",
                          location_country: parts[1]?.trim() || c.location_country,
                        }));
                      }}
                    />
                  </div>
                </div>

                {/* Hero image */}
                <div>
                  <input
                    ref={coverImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setCoverImageFile(e.target.files?.[0] ?? null)}
                  />
                  <div
                    className="relative rounded-2xl overflow-hidden cursor-pointer group"
                    style={{ height: 180, background: "var(--surface-low)" }}
                    onClick={() => coverImageInputRef.current?.click()}
                  >
                    {coverImagePreview ? (
                      <Image
                        src={coverImagePreview}
                        alt="Cover"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <Image
                        src="https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=900&q=80"
                        alt="Solar farm placeholder"
                        fill
                        unoptimized
                        className="object-cover opacity-70"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center gap-2 bg-white/90 backdrop-blur rounded-full px-5 py-2.5 shadow-lg">
                        <span className="text-sm font-bold text-gray-800">
                          {coverImageFile ? "Change Hero Image" : "Add Hero Image"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ─── Step 2: Financial Model ───────────────────────────────── */}
            {step === 2 && (
              <>
                <div>
                  <label className="label-xs mb-2 block">SHORT DESCRIPTION</label>
                  <input
                    className="input-new"
                    placeholder="One sentence about this asset"
                    value={info.short_description}
                    onChange={(e) => setInfo((c) => ({ ...c, short_description: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label-xs mb-2 block">FULL DESCRIPTION</label>
                  <textarea
                    rows={4}
                    className="input-new resize-none"
                    placeholder="Describe the installation, legal setup, operating model..."
                    value={info.full_description}
                    onChange={(e) => setInfo((c) => ({ ...c, full_description: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-xs mb-2 block">ASSET VALUATION (USDC)</label>
                    <input
                      type="number"
                      min="1"
                      className="input-new"
                      placeholder="100000"
                      value={sale.valuation_usdc}
                      onChange={(e) => setSale((c) => ({ ...c, valuation_usdc: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label-xs mb-2 block">MINIMUM INVESTMENT (USDC)</label>
                    <input
                      type="number"
                      min="1"
                      className="input-new"
                      placeholder="50"
                      value={sale.minimum_buy_amount_usdc}
                      onChange={(e) =>
                        setSale((c) => ({ ...c, minimum_buy_amount_usdc: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* Derived pricing */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "TOTAL SHARES",
                      value: pricing.totalShares ? formatNumber(pricing.totalShares) : "—",
                    },
                    {
                      label: "PRICE / SHARE",
                      value: pricing.pricePerShare ? formatUSDC(pricing.pricePerShare) : "—",
                    },
                    {
                      label: "RAISE TARGET",
                      value: pricing.targetRaise ? formatUSDC(pricing.targetRaise) : "—",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl p-4"
                      style={{ background: "var(--surface-low)" }}
                    >
                      <p className="label-xs mb-1">{item.label}</p>
                      <p className="text-base font-black" style={{ color: "var(--text)" }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ─── Step 3: Verification Proofs ──────────────────────────── */}
            {step === 3 && (
              <>
                <div
                  className="rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors hover:border-[rgb(var(--accent-green-ui-rgb)/0.50)]"
                  style={{ borderColor: "var(--border)" }}
                  onClick={() => docsInputRef.current?.click()}
                >
                  <input
                    ref={docsInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleDocsSelected(e.target.files)}
                  />
                  <div className="w-10 h-10 rounded-2xl sol-gradient flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>
                    Drop files here or browse
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    PDF, images, spreadsheets — up to 50 MB each
                  </p>
                </div>

                {documents.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: "var(--text-faint)" }}>
                    No files selected yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="rounded-2xl border p-4 space-y-3"
                        style={{ borderColor: "var(--border)", background: "var(--surface-low)" }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText
                              className="w-4 h-4 shrink-0"
                              style={{ color: "var(--text-muted)" }}
                            />
                            <p
                              className="text-sm font-bold truncate"
                              style={{ color: "var(--text)" }}
                            >
                              {doc.file.name}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDoc(doc.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            className="input-new text-xs py-2"
                            value={doc.title}
                            onChange={(e) => updateDoc(doc.id, { title: e.target.value })}
                            placeholder="Document title"
                          />
                          <select
                            className="input-new text-xs py-2"
                            value={doc.type}
                            onChange={(e) =>
                              updateDoc(doc.id, { type: e.target.value as DocumentType })
                            }
                          >
                            {DOCUMENT_TYPE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <label
                          className="flex items-center gap-2 text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <input
                            type="checkbox"
                            checked={doc.is_public}
                            onChange={(e) => updateDoc(doc.id, { is_public: e.target.checked })}
                          />
                          Visible on the public asset page
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ─── Step 4: Final Review ──────────────────────────────────── */}
            {step === 4 && (
              <>
                <div
                  className="rounded-2xl overflow-hidden border"
                  style={{ borderColor: "var(--border)" }}
                >
                  {[
                    { label: "Asset Name", value: info.title || "—" },
                    {
                      label: "Energy Type",
                      value: ENERGY_OPTIONS.find((o) => o.value === info.energy_type)?.label ?? "—",
                    },
                    {
                      label: "Capacity",
                      value: info.capacity_kw
                        ? `${formatNumber(Number(info.capacity_kw))} kW`
                        : "—",
                    },
                    {
                      label: "Location",
                      value:
                        [info.location_city, info.location_country].filter(Boolean).join(", ") ||
                        "—",
                    },
                    {
                      label: "Valuation",
                      value: sale.valuation_usdc ? formatUSDC(Number(sale.valuation_usdc)) : "—",
                    },
                    {
                      label: "Min Investment",
                      value: sale.minimum_buy_amount_usdc
                        ? formatUSDC(Number(sale.minimum_buy_amount_usdc))
                        : "—",
                    },
                    {
                      label: "Shares",
                      value: pricing.totalShares ? formatNumber(pricing.totalShares) : "—",
                    },
                    {
                      label: "Price / Share",
                      value: pricing.pricePerShare ? formatUSDC(pricing.pricePerShare) : "—",
                    },
                    { label: "Cover Image", value: coverImageFile?.name ?? "Default image" },
                    {
                      label: "Documents",
                      value: `${documents.length} file${documents.length !== 1 ? "s" : ""}`,
                    },
                  ].map((row, i, arr) => (
                    <div
                      key={row.label}
                      className={`flex justify-between items-center px-5 py-3 text-sm ${i < arr.length - 1 ? "border-b" : ""}`}
                      style={{
                        borderColor: "var(--border)",
                        background: i % 2 === 0 ? "var(--surface)" : "var(--surface-low)",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
                      <span className="font-bold" style={{ color: "var(--text)" }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                {error && (
                  <div
                    className="rounded-2xl px-5 py-4 text-sm font-medium text-red-400"
                    style={{ background: "rgba(248,113,113,0.08)" }}
                  >
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    disabled={loading}
                    className="btn-sol justify-center"
                    onClick={() => submitForm(true)}
                  >
                    {loading ? "Submitting..." : "Submit for Review"}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    className="btn-dark justify-center"
                    onClick={() => submitForm(false)}
                  >
                    {loading ? "Saving..." : "Save as Draft"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Panel footer (nav buttons) ────────────────────────────────── */}
          {step < 4 && (
            <div
              className="flex items-center justify-between px-8 py-5 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              {/* Fill test data */}
              <button
                type="button"
                onClick={fillTestData}
                className="flex items-center gap-2 text-sm font-bold transition-opacity hover:opacity-80"
                style={{ color: "var(--accent-green-ui)" }}
              >
                <Sparkles className="w-4 h-4" />
                Fill Test Data
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={step === 1}
                  onClick={() => setStep((s) => s - 1)}
                  className="text-sm font-bold px-5 py-2.5 rounded-full transition-opacity disabled:opacity-30"
                  style={{ color: "var(--text-muted)" }}
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canProceed()}
                  onClick={() => setStep((s) => s + 1)}
                  className="btn-sol disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next Step <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div
              className="flex items-center justify-between px-8 py-5 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <div />
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-sm font-bold px-5 py-2.5 rounded-full"
                style={{ color: "var(--text-muted)" }}
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
