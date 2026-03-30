"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { AssetTypeDropdown } from "@/components/asset-type-dropdown";
import { Icon } from "@/components/icons";
import {
  AppShell,
  Button,
  EmptyState,
  FormField,
  HighlightStrip,
  LoadingState,
  PageActionLink,
  StatusNotice,
  SurfaceCard,
  TextArea,
  TextInput,
} from "@/components/site";
import { createIssuerAsset } from "@/lib/api";
import { executeWithSession, useStoredSession } from "@/lib/session";
import type { EnergyType } from "@/lib/types";

export default function IssuerCreateAssetPage() {
  const router = useRouter();
  const { ready, session } = useStoredSession();
  const [formState, setFormState] = useState({
    title: "",
    short_description: "",
    full_description: "",
    energy_type: "solar" as EnergyType,
    location_country: "",
    location_region: "",
    location_city: "",
    capacity_kw: "100",
  });
  const [createdAssetId, setCreatedAssetId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      try {
        setErrorMessage(null);
        const result = await executeWithSession((token) =>
          createIssuerAsset(token, {
            ...formState,
            capacity_kw: Number(formState.capacity_kw),
            location_region: formState.location_region || undefined,
          }),
        );
        setCreatedAssetId(result.asset_id);
        router.push(`/issuer/assets/${result.asset_id}/documents`);
      } catch (error) {
        setCreatedAssetId(null);
        setErrorMessage(error instanceof Error ? error.message : "Could not create asset.");
      }
    });
  };

  if (!ready) {
    return (
      <AppShell
        current="issuer"
        eyebrow="Asset creation"
        title="Loading asset workspace"
        description="Checking your session and preparing the creation flow."
      >
        <LoadingState />
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell
        current="issuer"
        eyebrow="Asset creation"
        title="Sign in to create an asset"
        description="Asset creation is available to authenticated users."
      >
        <EmptyState
          title="No active session"
          description="Sign in first to create a new asset draft."
          actions={<PageActionLink href="/auth/login">Sign in</PageActionLink>}
          icon={<Icon name="layers" className="size-5" />}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      current="issuer"
      eyebrow="Asset creation"
      title="Create a new asset draft"
      description="Start the asset workflow with live backend validation instead of request previews or sample payloads."
      actions={
        <>
          <PageActionLink href="/assets">Public catalog</PageActionLink>
          <PageActionLink href="/dashboard" tone="secondary">
            Dashboard
          </PageActionLink>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          {createdAssetId ? (
            <StatusNotice title="Draft created" tone="success">
              Asset draft <span className="font-semibold">{createdAssetId}</span> was created.
              Redirecting to document upload so you can continue the workflow.
            </StatusNotice>
          ) : null}
          {errorMessage ? (
            <StatusNotice title="Could not create asset" tone="danger">
              {errorMessage}
            </StatusNotice>
          ) : null}
          <SurfaceCard className="space-y-6">
            <div className="space-y-2">
              <p className="eyebrow">Draft metadata</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
                Core asset information
              </h2>
            </div>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="md:col-span-2">
                <FormField label="Title">
                  <TextInput
                    value={formState.title}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Helios rooftop tranche"
                    required
                  />
                </FormField>
              </div>
              <FormField
                label="Asset type"
                hint="Only Solar Panel is available right now. Other asset types are staged for later release."
              >
                <AssetTypeDropdown
                  value={formState.energy_type}
                  onChange={(nextValue) =>
                    setFormState((current) => ({
                      ...current,
                      energy_type: nextValue as EnergyType,
                    }))
                  }
                />
              </FormField>
              <FormField label="Capacity (kW)">
                <TextInput
                  type="number"
                  min={1}
                  value={formState.capacity_kw}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      capacity_kw: event.target.value,
                    }))
                  }
                  required
                />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Short description">
                  <TextInput
                    value={formState.short_description}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        short_description: event.target.value,
                      }))
                    }
                    placeholder="High-level summary for catalog cards"
                    required
                  />
                </FormField>
              </div>
              <div className="md:col-span-2">
                <FormField label="Full description">
                  <TextArea
                    value={formState.full_description}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        full_description: event.target.value,
                      }))
                    }
                    placeholder="Detailed issuer-facing description"
                    required
                  />
                </FormField>
              </div>
              <FormField label="Country">
                <TextInput
                  value={formState.location_country}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      location_country: event.target.value,
                    }))
                  }
                  required
                />
              </FormField>
              <FormField label="Region">
                <TextInput
                  value={formState.location_region}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      location_region: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="City">
                <TextInput
                  value={formState.location_city}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      location_city: event.target.value,
                    }))
                  }
                  required
                />
              </FormField>
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <Button type="submit" disabled={isPending}>
                  <Icon name="upload" className="size-4" />
                  {isPending ? "Creating draft…" : "Create draft"}
                </Button>
                <PageActionLink href="/assets" tone="secondary">
                  Cancel
                </PageActionLink>
              </div>
            </form>
          </SurfaceCard>
        </div>
        <div className="space-y-6">
          <HighlightStrip
            icon={<Icon name="document" className="size-5" />}
            title="Next step: documents"
            body="After the draft is created, add at least one supporting document before submitting the asset for review."
          />
          <HighlightStrip
            icon={<Icon name="coins" className="size-5" />}
            title="Next step: sale terms"
            body="Set valuation, share supply, and minimum buy amount before moving the asset into review."
          />
          <HighlightStrip
            icon={<Icon name="check" className="size-5" />}
            title="Verification path"
            body="Once review is approved, asset owners can activate the sale and later post revenue epochs."
          />
        </div>
      </div>
    </AppShell>
  );
}
