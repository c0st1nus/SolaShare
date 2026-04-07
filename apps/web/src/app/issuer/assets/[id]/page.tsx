"use client";

import {
  ArrowLeft,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { FileDropInput } from "@/components/FileDropInput";
import { InitializeOnChainButton } from "@/components/issuer/InitializeOnChainButton";
import { StatusBadge } from "@/components/StatusBadge";
import { assetsApi, BASE, issuerApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ensureWalletBound, sendIssuerTransaction } from "@/lib/solana";
import { uploadAssetCover, uploadAssetDocument } from "@/lib/uploads";
import { ENERGY_META, formatNumber, formatUSDC } from "@/lib/utils";
import type { AssetDocument, IssuerAssetDetail, RevenueEpoch } from "@/types";

const DOCUMENT_TYPE_OPTIONS = [
  "ownership_doc",
  "right_to_income_doc",
  "technical_passport",
  "photo",
  "meter_info",
  "financial_model",
  "revenue_report",
  "other",
] as const;

const ASSET_COVER_FALLBACK: Record<string, string> = {
  solar: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=1200&q=80",
  wind: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&q=80",
  hydro: "https://images.unsplash.com/photo-1548075791-7c7e6b5c0f44?w=1200&q=80",
  ev_charging: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200&q=80",
  other: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200&q=80",
};

type AssetFormState = {
  title: string;
  short_description: string;
  full_description: string;
  location_country: string;
  location_region: string;
  location_city: string;
};

type DocumentFormState = {
  title: string;
  type: AssetDocument["type"];
  is_public: boolean;
  replacementFile: File | null;
};

const createAssetFormState = (asset: IssuerAssetDetail): AssetFormState => ({
  title: asset.title,
  short_description: asset.short_description,
  full_description: asset.full_description,
  location_country: asset.location.country,
  location_region: asset.location.region ?? "",
  location_city: asset.location.city ?? "",
});

const createDocumentDrafts = (documents: AssetDocument[]): Record<string, DocumentFormState> =>
  Object.fromEntries(
    documents.map((document) => [
      document.id,
      {
        title: document.title,
        type: document.type,
        is_public: document.is_public,
        replacementFile: null,
      },
    ]),
  );

export default function ManageAssetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [asset, setAsset] = useState<IssuerAssetDetail | null>(null);
  const [revenue, setRevenue] = useState<RevenueEpoch[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [showEpoch, setShowEpoch] = useState(false);
  const [epoch, setEpoch] = useState({
    epoch_number: "1",
    period_start: "",
    period_end: "",
    gross_revenue_usdc: "",
    net_revenue_usdc: "",
    distributable_revenue_usdc: "",
    source_type: "operator_statement",
  });
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [assetForm, setAssetForm] = useState<AssetFormState>({
    title: "",
    short_description: "",
    full_description: "",
    location_country: "",
    location_region: "",
    location_city: "",
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [documentDrafts, setDocumentDrafts] = useState<Record<string, DocumentFormState>>({});
  const [newDocument, setNewDocument] = useState({
    title: "",
    type: "other" as AssetDocument["type"],
    is_public: false,
  });
  const [newDocumentFile, setNewDocumentFile] = useState<File | null>(null);
  const [savingAsset, setSavingAsset] = useState(false);
  const [savingEpoch, setSavingEpoch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingDocumentId, setSavingDocumentId] = useState<string | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState(false);
  const localCoverPreview = useMemo(() => {
    if (!coverFile) {
      return null;
    }

    return URL.createObjectURL(coverFile);
  }, [coverFile]);

  useEffect(() => {
    return () => {
      if (localCoverPreview) {
        URL.revokeObjectURL(localCoverPreview);
      }
    };
  }, [localCoverPreview]);

  const loadPage = useCallback(async (assetId: string) => {
    setError("");
    setLoading(true);

    try {
      const [assetRes, revenueRes] = await Promise.all([
        issuerApi.getAsset(assetId),
        assetsApi.revenue(assetId).catch(() => ({ items: [] })),
      ]);

      setAsset(assetRes);
      setAssetForm(createAssetFormState(assetRes));
      setDocumentDrafts(createDocumentDrafts(assetRes.documents));
      setRevenue(revenueRes.items);
    } catch (err) {
      setAsset(null);
      setError(err instanceof Error ? err.message : "Failed to load asset.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id) {
      return;
    }

    void loadPage(id);
  }, [id, loadPage]);

  async function handleSubmit() {
    if (!asset) {
      return;
    }

    setSubmitting(true);
    setMsg("");

    try {
      if (asset.status === "verified") {
        setMsg("Preparing on-chain transaction...");
        await ensureWalletBound();

        const payload = await issuerApi.prepareOnchainSetup(asset.id, {
          // @ts-expect-error existing response model omits this field from the frontend type
          metadata_uri: asset.assetMetadataUri || `${BASE}/api/v1/assets/${asset.id}/metadata`,
        });

        setMsg("Please sign the transaction in your wallet...");
        const signature = await sendIssuerTransaction(payload);

        setMsg("Confirming transaction on-chain...");
        await issuerApi.confirmOnchainSetup(asset.id, signature);

        setMsg("Asset initialized on-chain. Submitting for sale activation...");
      }

      const res = await issuerApi.submit(asset.id);
      setMsg(`Asset submitted -> ${res.next_status}`);
      await loadPage(asset.id);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to submit asset.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSyncWithChain() {
    if (!asset) {
      return;
    }

    setSyncing(true);
    setMsg("");

    try {
      setMsg("Preparing on-chain sync...");
      await ensureWalletBound();

      const payload = await issuerApi.prepareOnchainSetup(asset.id, {
        metadata_uri: `${BASE}/api/v1/assets/${asset.id}/metadata`,
      });

      setMsg("Please sign the sync transaction in your wallet...");
      const signature = await sendIssuerTransaction(payload);

      setMsg("Confirming sync transaction on-chain...");
      await issuerApi.confirmOnchainSetup(asset.id, signature);

      await loadPage(asset.id);
      setMsg(`Asset synced with chain: ${signature}`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to sync asset with chain.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSaveAsset(event: React.FormEvent) {
    event.preventDefault();

    if (!asset) {
      return;
    }

    setSavingAsset(true);
    setMsg("");

    try {
      let coverImageUrl = asset.cover_image_url;

      if (coverFile) {
        const uploadedCover = await uploadAssetCover(coverFile);
        coverImageUrl = uploadedCover.file_url;
      }

      await issuerApi.updateAsset(asset.id, {
        title: assetForm.title.trim(),
        short_description: assetForm.short_description.trim(),
        full_description: assetForm.full_description.trim(),
        location_country: assetForm.location_country.trim(),
        location_region: assetForm.location_region.trim() || undefined,
        location_city: assetForm.location_city.trim() || undefined,
        cover_image_url: coverImageUrl,
      });

      setCoverFile(null);
      await loadPage(asset.id);
      setMsg("Asset details updated.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to update asset.");
    } finally {
      setSavingAsset(false);
    }
  }

  async function handleToggleVisibility(nextVisibility: boolean) {
    if (!asset) {
      return;
    }

    setTogglingVisibility(true);
    setMsg("");

    try {
      await issuerApi.updateVisibility(asset.id, nextVisibility);
      await loadPage(asset.id);
      setMsg(
        nextVisibility
          ? "Asset is visible in the marketplace."
          : "Asset is hidden from the marketplace.",
      );
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to update asset visibility.");
    } finally {
      setTogglingVisibility(false);
    }
  }

  async function handleDeleteAsset() {
    if (!asset) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this asset? This only works when the asset has no investments, revenue, claims, transfers, or on-chain state.",
    );

    if (!confirmed) {
      return;
    }

    setDeletingAsset(true);
    setMsg("");

    try {
      await issuerApi.deleteAsset(asset.id);
      router.push("/issuer");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to delete asset.");
    } finally {
      setDeletingAsset(false);
    }
  }

  async function handleCreateEpoch(event: React.FormEvent) {
    event.preventDefault();

    if (!asset) {
      return;
    }

    setSavingEpoch(true);

    try {
      if (!reportFile) {
        throw new Error("Attach a revenue report file before creating the epoch.");
      }

      const uploadedReport = await uploadAssetDocument(reportFile);
      const res = await issuerApi.createRevenueEpoch(asset.id, {
        epoch_number: Number(epoch.epoch_number),
        period_start: epoch.period_start,
        period_end: epoch.period_end,
        gross_revenue_usdc: Number(epoch.gross_revenue_usdc),
        net_revenue_usdc: Number(epoch.net_revenue_usdc),
        distributable_revenue_usdc: Number(epoch.distributable_revenue_usdc),
        report_uri: uploadedReport.file_url,
        report_hash: uploadedReport.content_hash,
        source_type: epoch.source_type,
      });

      setMsg(`Revenue epoch ${res.revenue_epoch_id} created.`);
      setShowEpoch(false);
      setReportFile(null);
      setEpoch({
        epoch_number: String(Number(epoch.epoch_number) + 1),
        period_start: "",
        period_end: "",
        gross_revenue_usdc: "",
        net_revenue_usdc: "",
        distributable_revenue_usdc: "",
        source_type: "operator_statement",
      });

      const revenueRes = await assetsApi.revenue(asset.id).catch(() => ({ items: [] }));
      setRevenue(revenueRes.items);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to create revenue epoch.");
    } finally {
      setSavingEpoch(false);
    }
  }

  function updateDocumentDraft(documentId: string, patch: Partial<DocumentFormState>) {
    setDocumentDrafts((current) => ({
      ...current,
      [documentId]: {
        ...current[documentId],
        ...patch,
      },
    }));
  }

  async function handleSaveDocument(documentId: string) {
    if (!asset) {
      return;
    }

    const draft = documentDrafts[documentId];

    if (!draft) {
      return;
    }

    setSavingDocumentId(documentId);
    setMsg("");

    try {
      const payload: {
        title?: string;
        type?: AssetDocument["type"];
        is_public?: boolean;
        storage_provider?: AssetDocument["storage_provider"];
        storage_uri?: string;
        content_hash?: string;
        mime_type?: string | null;
      } = {
        title: draft.title.trim(),
        type: draft.type,
        is_public: draft.is_public,
      };

      if (draft.replacementFile) {
        const uploadedDocument = await uploadAssetDocument(draft.replacementFile);
        payload.storage_provider = "s3";
        payload.storage_uri = uploadedDocument.file_url;
        payload.content_hash = uploadedDocument.content_hash;
        payload.mime_type = draft.replacementFile.type || "application/octet-stream";
      }

      await issuerApi.updateDocument(asset.id, documentId, payload);
      await loadPage(asset.id);
      setMsg("Document updated.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to update document.");
    } finally {
      setSavingDocumentId(null);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    if (!asset) {
      return;
    }

    const confirmed = window.confirm("Delete this document from the asset?");

    if (!confirmed) {
      return;
    }

    setSavingDocumentId(documentId);
    setMsg("");

    try {
      await issuerApi.deleteDocument(asset.id, documentId);
      await loadPage(asset.id);
      setMsg("Document deleted.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to delete document.");
    } finally {
      setSavingDocumentId(null);
    }
  }

  async function handleUploadNewDocument(event: React.FormEvent) {
    event.preventDefault();

    if (!asset) {
      return;
    }

    if (!newDocumentFile) {
      setMsg("Choose a document file first.");
      return;
    }

    setUploadingDocument(true);
    setMsg("");

    try {
      const uploadedDocument = await uploadAssetDocument(newDocumentFile);

      await issuerApi.uploadDocument(asset.id, {
        title: newDocument.title.trim(),
        type: newDocument.type,
        storage_provider: "s3",
        storage_uri: uploadedDocument.file_url,
        content_hash: uploadedDocument.content_hash,
        mime_type: newDocumentFile.type || "application/octet-stream",
        is_public: newDocument.is_public,
      });

      setNewDocument({
        title: "",
        type: "other",
        is_public: false,
      });
      setNewDocumentFile(null);
      await loadPage(asset.id);
      setMsg("Document uploaded.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to upload document.");
    } finally {
      setUploadingDocument(false);
    }
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center animate-fade-in">
        <p className="text-slate-500 mb-6">Sign in as an issuer to manage assets.</p>
        <Link href="/login" className="btn-sol px-8">
          Go to Login
        </Link>
      </div>
    );
  }

  if (user.role !== "issuer") {
    return (
      <div
        className="max-w-xl mx-auto px-6 py-24 text-center"
        style={{ color: "var(--text-muted)" }}
      >
        Access restricted to issuers.
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-5 animate-pulse">
        <div className="card h-48" />
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card h-96" />
          <div className="card h-96" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20">
        <EmptyState title="Asset unavailable" description={error || "Asset not found."} />
      </div>
    );
  }

  const energy = ENERGY_META[asset.energy_type];
  const canSubmit = asset.status === "draft" || asset.status === "verified";
  const canSyncWithChain =
    asset.status === "verified" || asset.status === "active_sale" || asset.status === "funded";
  const isSaleLive = asset.status === "active_sale" && asset.sale_terms?.sale_status === "live";
  const coverPreview =
    localCoverPreview ??
    asset.cover_image_url ??
    ASSET_COVER_FALLBACK[asset.energy_type] ??
    ASSET_COVER_FALLBACK.other;
  const canInitializeOnChain =
    asset.status === "verified" && asset.sale_terms?.sale_status === "draft";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 animate-fade-in space-y-7">
      <Link
        href="/issuer"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      <section className="card overflow-hidden p-0">
        <div className="relative h-72">
          <Image
            src={coverPreview}
            alt={asset.title}
            fill
            sizes="100vw"
            className="object-cover"
            unoptimized={Boolean(coverFile)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          <div className="absolute left-6 top-6 flex flex-wrap items-center gap-3">
            <StatusBadge status={asset.status} />
            <span
              className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em]"
              style={{
                background: asset.is_publicly_visible
                  ? "rgba(34, 197, 94, 0.14)"
                  : "rgba(148, 163, 184, 0.16)",
                color: asset.is_publicly_visible ? "rgb(74 222 128)" : "rgb(203 213 225)",
              }}
            >
              {asset.is_publicly_visible ? "Visible" : "Hidden"}
            </span>
          </div>
          <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <p className="label-xs text-white/70 mb-2">{energy.label}</p>
              <h1 className="text-3xl font-black text-white">{asset.title}</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/80">{asset.short_description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/assets/${asset.id}`} className="btn-outline text-sm px-5">
                <ExternalLink className="w-4 h-4" /> Public page
              </Link>
              {canSyncWithChain && (
                <button
                  type="button"
                  onClick={handleSyncWithChain}
                  disabled={syncing || submitting}
                  className="btn-outline text-sm px-5"
                >
                  {syncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" /> Sync with chain
                    </>
                  )}
                </button>
              )}
              {canSubmit && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || syncing}
                  className="btn-sol text-sm px-5"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />{" "}
                      {asset.status === "verified" ? "Activate On-Chain" : "Submit"}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {msg && (
        <div
          className="rounded-2xl px-5 py-3 text-sm font-medium text-[#9945FF]"
          style={{ background: "#9945FF10" }}
        >
          {msg}
        </div>
      )}

      {asset.review_feedback && (
        <div className="card p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-xs mb-2">Review Feedback</p>
              <h2 className="text-xl font-black" style={{ color: "var(--text)" }}>
                Admin requested changes
              </h2>
            </div>
            <span className="text-xs" style={{ color: "var(--text-faint)" }}>
              {new Date(asset.review_feedback.created_at).toLocaleDateString()}
            </span>
          </div>

          {asset.review_feedback.reason && (
            <p className="text-sm leading-6" style={{ color: "var(--text-muted)" }}>
              {asset.review_feedback.reason}
            </p>
          )}

          {asset.review_feedback.issues.length > 0 && (
            <div className="space-y-3">
              {asset.review_feedback.issues.map((issue) => (
                <div
                  key={`${issue.field}-${issue.note}`}
                  className="rounded-[1.25rem] border p-4"
                  style={{
                    borderColor: "rgba(245, 158, 11, 0.2)",
                    background: "rgba(245, 158, 11, 0.06)",
                  }}
                >
                  <p className="text-sm font-bold text-amber-300">{issue.label ?? issue.field}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{issue.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {canInitializeOnChain && (
        <InitializeOnChainButton
          assetId={asset.id}
          assetTitle={asset.title}
          onSuccess={() => {
            setMsg("Asset successfully initialized on Solana!");
            void loadPage(asset.id);
          }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleSaveAsset} className="card p-6 space-y-5">
          <div>
            <p className="label-xs mb-2">Metadata</p>
            <h2 className="text-2xl font-black" style={{ color: "var(--text)" }}>
              Edit asset details
            </h2>
          </div>

          <div>
            <label htmlFor="asset-title" className="label-xs block mb-2">
              Title
            </label>
            <input
              id="asset-title"
              value={assetForm.title}
              onChange={(event) =>
                setAssetForm((current) => ({ ...current, title: event.target.value }))
              }
              className="input-new text-sm py-3"
              minLength={3}
              required
            />
          </div>

          <div>
            <label htmlFor="asset-short-description" className="label-xs block mb-2">
              Short description
            </label>
            <textarea
              id="asset-short-description"
              value={assetForm.short_description}
              onChange={(event) =>
                setAssetForm((current) => ({ ...current, short_description: event.target.value }))
              }
              className="input-new min-h-[110px] text-sm py-3"
              minLength={10}
              required
            />
          </div>

          <div>
            <label htmlFor="asset-full-description" className="label-xs block mb-2">
              Full description
            </label>
            <textarea
              id="asset-full-description"
              value={assetForm.full_description}
              onChange={(event) =>
                setAssetForm((current) => ({ ...current, full_description: event.target.value }))
              }
              className="input-new min-h-[220px] text-sm py-3"
              minLength={20}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="asset-country" className="label-xs block mb-2">
                Country
              </label>
              <input
                id="asset-country"
                value={assetForm.location_country}
                onChange={(event) =>
                  setAssetForm((current) => ({ ...current, location_country: event.target.value }))
                }
                className="input-new text-sm py-3"
                required
              />
            </div>
            <div>
              <label htmlFor="asset-region" className="label-xs block mb-2">
                Region
              </label>
              <input
                id="asset-region"
                value={assetForm.location_region}
                onChange={(event) =>
                  setAssetForm((current) => ({ ...current, location_region: event.target.value }))
                }
                className="input-new text-sm py-3"
              />
            </div>
            <div>
              <label htmlFor="asset-city" className="label-xs block mb-2">
                City
              </label>
              <input
                id="asset-city"
                value={assetForm.location_city}
                onChange={(event) =>
                  setAssetForm((current) => ({ ...current, location_city: event.target.value }))
                }
                className="input-new text-sm py-3"
              />
            </div>
          </div>

          <div>
            <label className="label-xs block mb-2">Cover image</label>
            <FileDropInput
              accept="image/png,image/jpeg,image/jpg,image/webp"
              buttonLabel="Upload cover"
              title="Drop a cover image here"
              selectedLabel={coverFile?.name ?? asset.cover_image_url ?? null}
              description="JPEG, PNG, or WEBP. This image is used on the public asset page and issuer dashboard."
              onFilesSelected={(files) => setCoverFile(files[0] ?? null)}
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={savingAsset} className="btn-sol text-sm px-5">
              {savingAsset ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save details
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="card p-6">
            <p className="label-xs mb-2">Publication</p>
            <h2 className="text-2xl font-black mb-3" style={{ color: "var(--text)" }}>
              Marketplace visibility
            </h2>
            <p className="text-sm leading-6 mb-5" style={{ color: "var(--text-muted)" }}>
              Hide the asset from the public marketplace without deleting internal data or changing
              the on-chain flow.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleToggleVisibility(!asset.is_publicly_visible)}
                disabled={togglingVisibility}
                className="btn-outline text-sm"
              >
                {togglingVisibility ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : asset.is_publicly_visible ? (
                  <>
                    <EyeOff className="w-4 h-4" /> Hide asset
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" /> Show asset
                  </>
                )}
              </button>
              <Link href={`/assets/${asset.id}`} className="btn-outline text-sm">
                <ExternalLink className="w-4 h-4" /> Open public page
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <p className="label-xs mb-2">Quick facts</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Energy Type", value: energy.label },
                { label: "Capacity", value: `${formatNumber(asset.capacity_kw)} kW` },
                {
                  label: "Expected APY",
                  value:
                    asset.expected_annual_yield_percent === null
                      ? "TBD"
                      : `${asset.expected_annual_yield_percent}%`,
                },
                { label: "Revenue Epochs", value: String(revenue.length) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl p-4"
                  style={{ background: "var(--surface-low)" }}
                >
                  <p className="text-lg font-black" style={{ color: "var(--text)" }}>
                    {item.value}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <p className="label-xs mb-2">Danger Zone</p>
            <h2 className="text-2xl font-black mb-3" style={{ color: "var(--text)" }}>
              Delete asset
            </h2>
            <p className="text-sm leading-6 mb-5" style={{ color: "var(--text-muted)" }}>
              Deletion is blocked once the asset has investments, revenue, claims, transfer history,
              or on-chain state.
            </p>
            <button
              type="button"
              onClick={handleDeleteAsset}
              disabled={deletingAsset}
              className="btn-outline text-sm border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              {deletingAsset ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete asset
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="label-xs">Investor CTA</p>
            <h2 className="text-xl font-black" style={{ color: "var(--text)" }}>
              {isSaleLive ? "Buying is live" : "Buying is hidden"}
            </h2>
            <p className="text-sm leading-6" style={{ color: "var(--text-muted)" }}>
              The buy button is shown on the public asset page only when the asset status is
              <span className="font-semibold text-[var(--text)]"> active_sale </span>
              and sale status is
              <span className="font-semibold text-[var(--text)]"> live</span>.
            </p>
          </div>

          <Link href={`/assets/${asset.id}`} className="btn-outline text-sm">
            <ExternalLink className="w-4 h-4" /> Open public asset page
          </Link>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-black mb-4" style={{ color: "var(--text)" }}>
          Sale Terms
        </h2>

        {asset.sale_terms ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3 text-sm">
            {[
              {
                label: "Valuation",
                value: formatUSDC(parseFloat(asset.sale_terms.valuation_usdc)),
              },
              { label: "Total Shares", value: formatNumber(asset.sale_terms.total_shares) },
              {
                label: "Price / Share",
                value: formatUSDC(parseFloat(asset.sale_terms.price_per_share_usdc)),
              },
              {
                label: "Min. Buy",
                value: formatUSDC(parseFloat(asset.sale_terms.minimum_buy_amount_usdc)),
              },
              {
                label: "Target Raise",
                value: formatUSDC(parseFloat(asset.sale_terms.target_raise_usdc)),
              },
              { label: "Sale Status", value: asset.sale_terms.sale_status },
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between border-b pb-2"
                style={{ borderColor: "var(--border)" }}
              >
                <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
                <span className="font-medium" style={{ color: "var(--text)" }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Sale terms have not been saved yet.
          </p>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black" style={{ color: "var(--text)" }}>
            Revenue Epochs
          </h2>
          <button
            type="button"
            onClick={() => setShowEpoch(!showEpoch)}
            className="btn-outline text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> New Epoch
          </button>
        </div>

        {showEpoch && (
          <form
            onSubmit={handleCreateEpoch}
            className="mb-6 p-5 rounded-2xl space-y-4"
            style={{ background: "var(--surface-low)" }}
          >
            <h3 className="font-semibold text-sm text-emerald-500">New Revenue Epoch</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Revenue reports are stored as files in S3. Manual report links and hashes are no
              longer required here.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="epoch-number" className="label-xs block mb-1.5">
                  Epoch #
                </label>
                <input
                  id="epoch-number"
                  required
                  type="number"
                  min="1"
                  className="input-new text-sm py-2"
                  value={epoch.epoch_number}
                  onChange={(event) =>
                    setEpoch((current) => ({ ...current, epoch_number: event.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="epoch-source-type" className="label-xs block mb-1.5">
                  Source Type
                </label>
                <select
                  id="epoch-source-type"
                  className="input-new text-sm py-2"
                  value={epoch.source_type}
                  onChange={(event) =>
                    setEpoch((current) => ({ ...current, source_type: event.target.value }))
                  }
                >
                  {["manual_report", "meter_export", "operator_statement"].map((source) => (
                    <option key={source} value={source}>
                      {source.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="epoch-period-start" className="label-xs block mb-1.5">
                  Period Start
                </label>
                <input
                  id="epoch-period-start"
                  required
                  type="date"
                  className="input-new text-sm py-2"
                  value={epoch.period_start}
                  onChange={(event) =>
                    setEpoch((current) => ({ ...current, period_start: event.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="epoch-period-end" className="label-xs block mb-1.5">
                  Period End
                </label>
                <input
                  id="epoch-period-end"
                  required
                  type="date"
                  className="input-new text-sm py-2"
                  value={epoch.period_end}
                  onChange={(event) =>
                    setEpoch((current) => ({ ...current, period_end: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {["gross_revenue_usdc", "net_revenue_usdc", "distributable_revenue_usdc"].map(
                (field) => (
                  <div key={field}>
                    <label htmlFor={field} className="label-xs block mb-1.5">
                      {field.replace(/_usdc|_/g, (value) => (value === "_usdc" ? "" : " ")).trim()}
                    </label>
                    <input
                      id={field}
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-new text-sm py-2"
                      placeholder="0.00"
                      value={(epoch as Record<string, string>)[field]}
                      onChange={(event) =>
                        setEpoch((current) => ({ ...current, [field]: event.target.value }))
                      }
                    />
                  </div>
                ),
              )}
            </div>

            <div>
              <label className="label-xs mb-2 block">Revenue Report File</label>
              <FileDropInput
                accept=".pdf,.xlsx,.xls,.csv,image/png,image/jpeg,image/jpg"
                buttonLabel="Attach report"
                title="Drop the revenue report here"
                selectedLabel={reportFile?.name ?? null}
                description="PDF, spreadsheet, CSV or image. The file is uploaded to S3 and bound to this revenue epoch automatically."
                onFilesSelected={(files) => setReportFile(files[0] ?? null)}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowEpoch(false)}
                className="btn-outline text-sm"
              >
                Cancel
              </button>
              <button type="submit" disabled={savingEpoch} className="btn-sol text-sm px-5">
                {savingEpoch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Create Epoch"}
              </button>
            </div>
          </form>
        )}

        {revenue.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No revenue epochs posted yet.
          </p>
        ) : (
          <div className="space-y-3">
            {revenue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border p-4"
                style={{ borderColor: "var(--border)" }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    Epoch #{item.epoch_number}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {item.period_start} - {item.period_end}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-amber-400">
                    {formatUSDC(item.distributable_revenue_usdc)}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {item.posting_status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <section className="card p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-xs mb-2">Documents</p>
            <h2 className="text-2xl font-black" style={{ color: "var(--text)" }}>
              Manage documents
            </h2>
          </div>
        </div>

        <form
          onSubmit={handleUploadNewDocument}
          className="rounded-[1.5rem] p-5 space-y-4"
          style={{ background: "var(--surface-low)" }}
        >
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#9945FF]" />
            <h3 className="font-semibold text-sm" style={{ color: "var(--text)" }}>
              Upload new document
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1.3fr_0.9fr_auto]">
            <div>
              <label htmlFor="new-document-title" className="label-xs block mb-2">
                Title
              </label>
              <input
                id="new-document-title"
                value={newDocument.title}
                onChange={(event) =>
                  setNewDocument((current) => ({ ...current, title: event.target.value }))
                }
                className="input-new text-sm py-3"
                minLength={3}
                required
              />
            </div>
            <div>
              <label htmlFor="new-document-type" className="label-xs block mb-2">
                Type
              </label>
              <select
                id="new-document-type"
                value={newDocument.type}
                onChange={(event) =>
                  setNewDocument((current) => ({
                    ...current,
                    type: event.target.value as AssetDocument["type"],
                  }))
                }
                className="input-new text-sm py-3"
              >
                {DOCUMENT_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <label
              className="flex items-end gap-2 text-sm font-medium"
              style={{ color: "var(--text)" }}
            >
              <input
                type="checkbox"
                checked={newDocument.is_public}
                onChange={(event) =>
                  setNewDocument((current) => ({ ...current, is_public: event.target.checked }))
                }
              />
              Public
            </label>
          </div>

          <FileDropInput
            accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,image/png,image/jpeg,image/jpg"
            buttonLabel="Attach document"
            title="Drop the asset document here"
            selectedLabel={newDocumentFile?.name ?? null}
            description="Upload legal, technical, photo, or financial support files for this asset."
            onFilesSelected={(files) => setNewDocumentFile(files[0] ?? null)}
          />

          <div className="flex justify-end">
            <button type="submit" disabled={uploadingDocument} className="btn-sol text-sm px-5">
              {uploadingDocument ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Add document
                </>
              )}
            </button>
          </div>
        </form>

        {asset.documents.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No documents uploaded.
          </p>
        ) : (
          <div className="space-y-4">
            {asset.documents.map((document) => {
              const draft = documentDrafts[document.id];

              if (!draft) {
                return null;
              }

              const isSaving = savingDocumentId === document.id;

              return (
                <div
                  key={document.id}
                  className="rounded-[1.5rem] border p-5 space-y-4"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                          {document.title}
                        </p>
                        <p className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>
                          {document.type.replace(/_/g, " ")} · {document.storage_provider}
                        </p>
                      </div>
                    </div>
                    <a
                      href={document.storage_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open
                    </a>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr_auto]">
                    <div>
                      <label className="label-xs block mb-2">Title</label>
                      <input
                        value={draft.title}
                        onChange={(event) =>
                          updateDocumentDraft(document.id, { title: event.target.value })
                        }
                        className="input-new text-sm py-3"
                        minLength={3}
                      />
                    </div>
                    <div>
                      <label className="label-xs block mb-2">Type</label>
                      <select
                        value={draft.type}
                        onChange={(event) =>
                          updateDocumentDraft(document.id, {
                            type: event.target.value as AssetDocument["type"],
                          })
                        }
                        className="input-new text-sm py-3"
                      >
                        {DOCUMENT_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>
                            {type.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label
                      className="flex items-end gap-2 text-sm font-medium"
                      style={{ color: "var(--text)" }}
                    >
                      <input
                        type="checkbox"
                        checked={draft.is_public}
                        onChange={(event) =>
                          updateDocumentDraft(document.id, { is_public: event.target.checked })
                        }
                      />
                      Public
                    </label>
                  </div>

                  <div>
                    <label className="label-xs block mb-2">Replace file</label>
                    <input
                      type="file"
                      onChange={(event) =>
                        updateDocumentDraft(document.id, {
                          replacementFile: event.target.files?.[0] ?? null,
                        })
                      }
                      className="block w-full text-sm"
                      style={{ color: "var(--text-muted)" }}
                    />
                    {draft.replacementFile && (
                      <p className="mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
                        Pending replacement: {draft.replacementFile.name}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(document.id)}
                      disabled={isSaving}
                      className="btn-outline text-sm border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveDocument(document.id)}
                      disabled={isSaving}
                      className="btn-sol text-sm"
                    >
                      {isSaving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4" /> Save document
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
