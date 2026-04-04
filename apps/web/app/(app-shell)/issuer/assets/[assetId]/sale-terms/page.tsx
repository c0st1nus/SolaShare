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
import { saveIssuerSaleTerms, submitIssuerAsset } from "@/lib/api";
import { executeWithSession, useStoredSession } from "@/lib/session";

export default function IssuerAssetSaleTermsPage() {
  const params = useParams<{ assetId: string }>();
  const assetId = useMemo(
    () => (Array.isArray(params.assetId) ? params.assetId[0] : params.assetId),
    [params.assetId],
  );
  const { ready, session } = useStoredSession();
  const [formState, setFormState] = useState({
    valuation_usdc: "250000",
    total_shares: "1000",
    price_per_share_usdc: "250",
    minimum_buy_amount_usdc: "500",
    target_raise_usdc: "250000",
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, startSubmitTransition] = useTransition();

  const handleSaveTerms = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      try {
        setErrorMessage(null);
        setSuccessMessage(null);
        await executeWithSession((token) =>
          saveIssuerSaleTerms(token, assetId, {
            valuation_usdc: Number(formState.valuation_usdc),
            total_shares: Number(formState.total_shares),
            price_per_share_usdc: Number(formState.price_per_share_usdc),
            minimum_buy_amount_usdc: Number(formState.minimum_buy_amount_usdc),
            target_raise_usdc: Number(formState.target_raise_usdc),
          }),
        );
        setSuccessMessage("Sale terms saved. The draft is ready for workflow submission.");
      } catch (error) {
        setSuccessMessage(null);
        setErrorMessage(error instanceof Error ? error.message : "Could not save sale terms.");
      }
    });
  };

  const handleSubmitForReview = () => {
    startSubmitTransition(async () => {
      try {
        setErrorMessage(null);
        const response = await executeWithSession((token) => submitIssuerAsset(token, assetId));
        setSubmitMessage(response.message);
      } catch (error) {
        setSubmitMessage(null);
        setErrorMessage(error instanceof Error ? error.message : "Could not submit asset.");
      }
    });
  };

  if (!ready) {
    return (
      <AppShell
        current="issuer"
        eyebrow="Asset workflow"
        title="Loading sale terms"
        description="Preparing the pricing and issuance step."
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
        description="Sale terms require an authenticated session."
      >
        <EmptyState
          title="No active session"
          description="Sign in first to continue the asset workflow."
          actions={<PageActionLink href="/auth/login">Sign in</PageActionLink>}
          icon={<Icon name="coins" className="size-5" />}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      current="issuer"
      eyebrow="Asset workflow"
      title="Configure sale terms"
      description="Set valuation, share supply, and ticket size, then submit the draft into review."
      actions={
        <>
          <PageActionLink href={`/issuer/assets/${assetId}/documents`} tone="secondary">
            Back to documents
          </PageActionLink>
          <PageActionLink href="/assets">Open catalog</PageActionLink>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <SurfaceCard className="space-y-6">
            <ProgressStepper steps={["Draft", "Documents", "Sale terms"]} active={2} />
            {successMessage ? (
              <StatusNotice title="Sale terms saved" tone="success">
                {successMessage}
              </StatusNotice>
            ) : null}
            {submitMessage ? (
              <StatusNotice title="Asset submitted" tone="success">
                {submitMessage}
              </StatusNotice>
            ) : null}
            {errorMessage ? (
              <StatusNotice title="Workflow error" tone="danger">
                {errorMessage}
              </StatusNotice>
            ) : null}
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSaveTerms}>
              <div className="md:col-span-2">
                <FormField label="Asset ID">
                  <TextInput value={assetId} readOnly />
                </FormField>
              </div>
              <FormField label="Valuation (USDC)">
                <TextInput
                  type="number"
                  min={1}
                  value={formState.valuation_usdc}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, valuation_usdc: event.target.value }))
                  }
                  required
                />
              </FormField>
              <FormField label="Total shares">
                <TextInput
                  type="number"
                  min={1}
                  value={formState.total_shares}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, total_shares: event.target.value }))
                  }
                  required
                />
              </FormField>
              <FormField label="Price per share (USDC)">
                <TextInput
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={formState.price_per_share_usdc}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      price_per_share_usdc: event.target.value,
                    }))
                  }
                  required
                />
              </FormField>
              <FormField label="Minimum buy amount (USDC)">
                <TextInput
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={formState.minimum_buy_amount_usdc}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      minimum_buy_amount_usdc: event.target.value,
                    }))
                  }
                  required
                />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Target raise (USDC)">
                  <TextInput
                    type="number"
                    min={1}
                    step="0.01"
                    value={formState.target_raise_usdc}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        target_raise_usdc: event.target.value,
                      }))
                    }
                    required
                  />
                </FormField>
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <Button type="submit" disabled={isPending}>
                  <Icon name="coins" className="size-4" />
                  {isPending ? "Saving terms…" : "Save sale terms"}
                </Button>
                <Button type="button" disabled={isSubmitting} onClick={handleSubmitForReview}>
                  <Icon name="check" className="size-4" />
                  {isSubmitting ? "Submitting…" : "Submit for review"}
                </Button>
              </div>
            </form>
          </SurfaceCard>
        </div>
        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <p className="eyebrow">Workflow</p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
              Sale readiness
            </h2>
            <p className="text-sm leading-6 text-ink-soft">
              Once pricing is saved and the draft passes validation, submission moves the asset from{" "}
              <span className="font-semibold text-ink">draft</span> to the next review stage.
            </p>
          </SurfaceCard>
        </div>
      </div>
    </AppShell>
  );
}
