"use client";

import { useParams } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import {
  AppShell,
  Button,
  EmptyState,
  FormField,
  LoadingState,
  PageActionLink,
  ProgressStepper,
  StatusNotice,
  SurfaceCard,
  TextInput,
} from "@/components/site";
import { registerIssuerAssetDocument } from "@/lib/api";
import { executeWithSession, useStoredSession } from "@/lib/session";
import type { AssetDocumentType, StorageProvider } from "@/lib/types";

const documentTypeOptions: Array<{ value: AssetDocumentType; label: string }> = [
  { value: "ownership_doc", label: "Ownership document" },
  { value: "right_to_income_doc", label: "Right to income document" },
  { value: "technical_passport", label: "Technical passport" },
  { value: "photo", label: "Photo" },
  { value: "meter_info", label: "Meter info" },
  { value: "financial_model", label: "Financial model" },
  { value: "revenue_report", label: "Revenue report" },
  { value: "other", label: "Other" },
];

const storageProviderOptions: Array<{ value: StorageProvider; label: string }> = [
  { value: "s3", label: "S3" },
  { value: "ipfs", label: "IPFS" },
  { value: "arweave", label: "Arweave" },
];

export default function IssuerAssetDocumentsPage() {
  const params = useParams<{ assetId: string }>();
  const assetId = useMemo(
    () => (Array.isArray(params.assetId) ? params.assetId[0] : params.assetId),
    [params.assetId],
  );
  const { ready, session } = useStoredSession();
  const [formState, setFormState] = useState({
    type: "ownership_doc" as AssetDocumentType,
    title: "",
    storage_provider: "s3" as StorageProvider,
    storage_uri: "",
    content_hash: "",
    is_public: true,
  });
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      try {
        setErrorMessage(null);
        const response = await executeWithSession((token) =>
          registerIssuerAssetDocument(token, assetId, formState),
        );
        setDocumentId(response.document_id);
      } catch (error) {
        setDocumentId(null);
        setErrorMessage(error instanceof Error ? error.message : "Could not save document.");
      }
    });
  };

  if (!ready) {
    return (
      <AppShell
        current="issuer"
        eyebrow="Asset workflow"
        title="Loading document step"
        description="Preparing the document registration flow."
      >
        <LoadingState />
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell
        current="issuer"
        eyebrow="Asset workflow"
        title="Sign in to continue asset setup"
        description="Document registration requires an authenticated session."
      >
        <EmptyState
          title="No active session"
          description="Sign in first to continue the asset workflow."
          actions={<PageActionLink href="/auth/login">Sign in</PageActionLink>}
          icon={<Icon name="document" className="size-5" />}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      current="issuer"
      eyebrow="Asset workflow"
      title="Attach supporting documents"
      description="Register at least one asset document before saving sale terms and submitting the draft."
      actions={
        <>
          <PageActionLink href={`/issuer/assets/${assetId}/sale-terms`}>
            Continue to sale terms
          </PageActionLink>
          <PageActionLink href="/issuer/assets/new" tone="secondary">
            Create another draft
          </PageActionLink>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <SurfaceCard className="space-y-6">
            <ProgressStepper steps={["Draft", "Documents", "Sale terms"]} active={1} />
            {documentId ? (
              <StatusNotice title="Document saved" tone="success">
                <p>
                  Document <span className="font-semibold">{documentId}</span> is now attached to
                  asset <span className="font-semibold">{assetId}</span>.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <PageActionLink href={`/issuer/assets/${assetId}/sale-terms`}>
                    Continue to sale terms
                  </PageActionLink>
                </div>
              </StatusNotice>
            ) : null}
            {errorMessage ? (
              <StatusNotice title="Could not save document" tone="danger">
                {errorMessage}
              </StatusNotice>
            ) : null}
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="md:col-span-2">
                <FormField label="Asset ID" hint="The document will be linked to this draft.">
                  <TextInput value={assetId} readOnly />
                </FormField>
              </div>
              <FormField label="Document type">
                <select
                  className="input-shell"
                  value={formState.type}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      type: event.target.value as AssetDocumentType,
                    }))
                  }
                >
                  {documentTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Storage provider">
                <select
                  className="input-shell"
                  value={formState.storage_provider}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      storage_provider: event.target.value as StorageProvider,
                    }))
                  }
                >
                  {storageProviderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Document title">
                  <TextInput
                    value={formState.title}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Solar panel passport"
                    required
                  />
                </FormField>
              </div>
              <div className="md:col-span-2">
                <FormField label="Storage URL">
                  <TextInput
                    type="url"
                    value={formState.storage_uri}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, storage_uri: event.target.value }))
                    }
                    placeholder="https://storage.example.com/document.pdf"
                    required
                  />
                </FormField>
              </div>
              <div className="md:col-span-2">
                <FormField label="Content hash">
                  <TextInput
                    value={formState.content_hash}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, content_hash: event.target.value }))
                    }
                    placeholder="sha256:..."
                    required
                  />
                </FormField>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 rounded-2xl border border-line/70 bg-white px-4 py-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={formState.is_public}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, is_public: event.target.checked }))
                    }
                  />
                  Make this document publicly visible in the catalog
                </label>
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <Button type="submit" disabled={isPending}>
                  <Icon name="document" className="size-4" />
                  {isPending ? "Saving document…" : "Save document"}
                </Button>
                <PageActionLink href={`/issuer/assets/${assetId}/sale-terms`} tone="secondary">
                  Skip to sale terms
                </PageActionLink>
              </div>
            </form>
          </SurfaceCard>
        </div>
        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <p className="eyebrow">Workflow</p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
              Document requirements
            </h2>
            <p className="text-sm leading-6 text-ink-soft">
              At least one document is required before the asset can move out of draft. Public files
              appear in the catalog, private files remain workflow-only.
            </p>
          </SurfaceCard>
        </div>
      </div>
    </AppShell>
  );
}
