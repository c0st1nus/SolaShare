"use client";

import { CheckCircle2, ShieldCheck, X, XCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { FileDropInput } from "@/components/FileDropInput";
import { investorApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { uploadKycDocument } from "@/lib/uploads";
import { formatDate } from "@/lib/utils";
import type { KycDocumentType, KycOverview } from "@/types";

const DOCUMENT_TYPE_LABELS: Record<KycDocumentType, string> = {
  passport: "Passport",
  national_id: "National ID",
};

const isImageMimeType = (mimeType?: string | null) => Boolean(mimeType?.startsWith("image/"));

const STATUS_META = {
  not_started: {
    label: "Not started",
    tone: "text-[#9945FF]",
    bg: "#9945FF10",
    description: "Upload a government-issued identity document to start review.",
  },
  pending: {
    label: "Pending review",
    tone: "text-[#9945FF]",
    bg: "#9945FF10",
    description:
      "Your document is under review. Investment preparation stays blocked until approval.",
  },
  approved: {
    label: "Approved",
    tone: "text-[var(--accent-green-ui)]",
    bg: "rgb(var(--accent-green-ui-rgb) / 0.1)",
    description: "KYC is approved. You can continue with wallet setup and investment flows.",
  },
  rejected: {
    label: "Rejected",
    tone: "text-red-400",
    bg: "rgba(248,113,113,0.1)",
    description:
      "Your previous submission was rejected. Review the notes and submit a new document.",
  },
  needs_changes: {
    label: "Needs changes",
    tone: "text-amber-400",
    bg: "rgba(251,191,36,0.12)",
    description: "The review team requested a new or clearer document. Submit an updated file.",
  },
} as const;

export default function KycPage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [overview, setOverview] = useState<KycOverview | null>(null);
  const [documentType, setDocumentType] = useState<KycDocumentType>("passport");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dialogImage, setDialogImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const localPreviewUrl = useMemo(() => {
    if (!file || !isImageMimeType(file.type)) {
      return null;
    }

    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await investorApi.kycOverview();
      setOverview(res);
      if (res.current_request) {
        setDocumentType(res.current_request.document_type);
        setNotes(res.current_request.notes ?? "");
      }
    } catch (err) {
      setOverview(null);
      setError(err instanceof Error ? err.message : "Failed to load KYC status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    void loadOverview();
  }, [loadOverview, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      setError("Choose a passport or ID file first.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const upload = await uploadKycDocument(file);
      await investorApi.submitKyc(
        documentType,
        file.name,
        file.type || "application/octet-stream",
        upload.file_url,
        upload.content_hash,
        notes.trim() || undefined,
      );
      await Promise.all([refreshUser(), loadOverview()]);
      setFile(null);
      setMessage("KYC document submitted for review.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit KYC.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancelDraft() {
    setDocumentType("passport");
    setNotes("");
    setFile(null);
    setError("");
    setMessage("");
  }

  async function handleCancelRequest() {
    setCancelling(true);
    setError("");
    setMessage("");

    try {
      await investorApi.cancelKyc();
      await Promise.all([refreshUser(), loadOverview()]);
      handleCancelDraft();
      setMessage("KYC request cancelled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel KYC request.");
    } finally {
      setCancelling(false);
    }
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 sol-gradient">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-black mb-3" style={{ color: "var(--text)" }}>
          Sign in to start KYC
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Investor verification requires an authenticated account.
        </p>
        <Link href="/login" className="btn-sol px-8">
          Go to Login
        </Link>
      </div>
    );
  }

  if (user.role !== "investor") {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20">
        <EmptyState
          title="KYC is investor-only"
          description="Only investor accounts need identity verification for investment flows."
        />
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto px-8 py-10 space-y-6 animate-pulse">
        <div className="card h-32" />
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="card h-72" />
          <div className="card h-96" />
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20">
        <EmptyState
          title="KYC unavailable"
          description={error || "Unable to load the current KYC workflow state."}
        />
      </div>
    );
  }

  const statusMeta = STATUS_META[overview.kyc_status];
  const currentRequest = overview.current_request;

  return (
    <>
      <div className="max-w-6xl mx-auto px-8 py-10 animate-fade-in space-y-8">
        <section className="card p-8">
          <p className="label-xs mb-2">Investor Verification</p>
          <h1 className="text-3xl font-black mb-3" style={{ color: "var(--text)" }}>
            KYC review
          </h1>
          <p className="text-sm max-w-2xl" style={{ color: "var(--text-muted)" }}>
            Upload one government-issued identity document. Use either a passport or a national ID
            card.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="card p-6 space-y-5">
            <div>
              <p className="label-xs mb-2">Current Status</p>
              <div
                className="inline-flex rounded-full px-4 py-2 text-sm font-bold"
                style={{ background: statusMeta.bg }}
              >
                <span className={statusMeta.tone}>{statusMeta.label}</span>
              </div>
            </div>

            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {statusMeta.description}
            </p>

            <div className="space-y-3">
              {overview.submitted_at && (
                <div className="rounded-2xl p-4" style={{ background: "var(--surface-low)" }}>
                  <p className="label-xs mb-1">Submitted</p>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {formatDate(overview.submitted_at)}
                  </p>
                </div>
              )}

              {overview.reviewed_at && (
                <div className="rounded-2xl p-4" style={{ background: "var(--surface-low)" }}>
                  <p className="label-xs mb-1">Reviewed</p>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {formatDate(overview.reviewed_at)}
                  </p>
                </div>
              )}

              {overview.decision_notes && (
                <div className="rounded-2xl p-4" style={{ background: "var(--surface-low)" }}>
                  <p className="label-xs mb-1">Review Notes</p>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {overview.decision_notes}
                  </p>
                </div>
              )}

              {currentRequest && (
                <div className="rounded-2xl p-4" style={{ background: "var(--surface-low)" }}>
                  <p className="label-xs mb-1">Latest Submission</p>
                  <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                    {DOCUMENT_TYPE_LABELS[currentRequest.document_type]}:{" "}
                    {currentRequest.document_name}
                  </p>
                  {isImageMimeType(currentRequest.mime_type) && (
                    <button
                      type="button"
                      onClick={() =>
                        setDialogImage({
                          src: currentRequest.document_uri,
                          alt: currentRequest.document_name,
                        })
                      }
                      className="mt-3 block w-full overflow-hidden rounded-2xl border transition-transform hover:scale-[1.01]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="relative h-72 w-full" style={{ background: "var(--bg)" }}>
                        <Image
                          src={currentRequest.document_uri}
                          alt={currentRequest.document_name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    </button>
                  )}
                  {overview.kyc_status === "pending" &&
                    currentRequest.request_status === "pending" && (
                      <button
                        type="button"
                        onClick={handleCancelRequest}
                        disabled={cancelling}
                        className="btn-danger mt-4 w-full justify-center disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {cancelling ? "Cancelling..." : "Cancel request"}
                      </button>
                    )}
                </div>
              )}
            </div>

            <div className="rounded-2xl p-4" style={{ background: "var(--surface-low)" }}>
              <p className="label-xs mb-1">Next Step</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {overview.kyc_status === "approved"
                  ? "Go back to your profile to connect a wallet if it is still missing."
                  : "You can submit a new document only while the review is not pending or already approved."}
              </p>
            </div>
          </section>

          <section className="card p-6">
            <div className="mb-5">
              <p className="label-xs mb-2">Submission</p>
              <h2 className="text-2xl font-black" style={{ color: "var(--text)" }}>
                {overview.can_submit ? "Upload a document" : "Waiting for review"}
              </h2>
            </div>

            {!overview.can_submit ? (
              <div
                className="rounded-3xl border p-6 text-sm"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                Your current KYC status does not allow a new submission right now.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label-xs mb-2 block">Document type</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(["passport", "national_id"] as KycDocumentType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDocumentType(type)}
                        className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                          documentType === type ? "border-[#9945FF] bg-[#9945FF]/5" : ""
                        }`}
                        style={
                          documentType === type
                            ? {}
                            : {
                                borderColor: "var(--border)",
                                color: "var(--text-muted)",
                              }
                        }
                      >
                        <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                          {DOCUMENT_TYPE_LABELS[type]}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>
                          Upload a clear image or PDF.
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="label-xs mb-2">Document file</div>
                  <FileDropInput
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    buttonLabel="Choose file"
                    title="Drop passport or ID file here"
                    selectedLabel={file?.name ?? null}
                    description="PDF, JPG or PNG up to 10 MB."
                    onFilesSelected={(files) => setFile(files[0] ?? null)}
                  />
                  {localPreviewUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setDialogImage({
                          src: localPreviewUrl,
                          alt: file?.name ?? "Selected KYC document",
                        })
                      }
                      className="mt-4 block w-full overflow-hidden rounded-3xl border transition-transform hover:scale-[1.01]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="relative h-80 w-full" style={{ background: "var(--bg)" }}>
                        <Image
                          src={localPreviewUrl}
                          alt={file?.name ?? "Selected KYC document"}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    </button>
                  )}
                </div>

                <div>
                  <label className="label-xs mb-2 block">Notes for reviewer</label>
                  <textarea
                    rows={4}
                    className="input-new resize-none"
                    placeholder="Optional context for the compliance team."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {message && (
                  <div
                    className="rounded-2xl p-3 text-xs font-medium text-[var(--accent-green-ui)]"
                    style={{ background: "rgb(var(--accent-green-ui-rgb) / 0.1)" }}
                  >
                    {message}
                  </div>
                )}

                {error && (
                  <div
                    className="rounded-2xl p-3 text-xs font-medium text-red-400"
                    style={{ background: "rgba(248,113,113,0.1)" }}
                  >
                    {error}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleCancelDraft}
                    disabled={submitting}
                    className="btn-outline w-full justify-center"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn-sol w-full">
                    {submitting ? "Submitting KYC..." : "Submit for review"}
                  </button>
                </div>
              </form>
            )}

            {overview.kyc_status === "approved" && (
              <div
                className="mt-5 rounded-2xl p-4 text-sm font-medium text-[var(--accent-green-ui)]"
                style={{ background: "rgb(var(--accent-green-ui-rgb) / 0.1)" }}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  KYC is approved. Continue with wallet setup in your profile if needed.
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {dialogImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md"
          style={{ background: "rgba(12, 15, 15, 0.55)" }}
          onClick={() => setDialogImage(null)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] border"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setDialogImage(null)}
              className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border"
              style={{
                background: "rgba(12, 15, 15, 0.55)",
                borderColor: "rgba(255,255,255,0.12)",
                color: "#fff",
              }}
              aria-label="Close image preview"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative aspect-[4/3] w-full" style={{ background: "#050606" }}>
              <Image
                src={dialogImage.src}
                alt={dialogImage.alt}
                fill
                unoptimized
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
