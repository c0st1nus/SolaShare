"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import {
  AppShell,
  Button,
  EmptyState,
  FormField,
  LoadingState,
  PageActionLink,
  StatusNotice,
  SurfaceCard,
  TextInput,
} from "@/components/site";
import { getAuthMe, logoutSession } from "@/lib/api";
import { clearSession, executeWithSession, useStoredSession } from "@/lib/session";
import type { AuthMeResponse } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const { ready, session } = useStoredSession();
  const [profile, setProfile] = useState<AuthMeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLogoutPending, startLogoutTransition] = useTransition();

  useEffect(() => {
    if (!session) {
      return;
    }

    let active = true;

    void executeWithSession((token) => getAuthMe(token))
      .then((result) => {
        if (!active) {
          return;
        }

        setProfile(result);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Could not load account settings.",
        );
      });

    return () => {
      active = false;
    };
  }, [session]);

  const handleLogout = () => {
    startLogoutTransition(async () => {
      try {
        if (session?.refresh_token) {
          await logoutSession({ refresh_token: session.refresh_token });
        }
      } catch {
        // Ignore logout transport failures; local session still needs to be cleared.
      } finally {
        clearSession();
        router.push("/auth/login");
      }
    });
  };

  if (!ready) {
    return (
      <AppShell
        current="settings"
        eyebrow="Account"
        title="Loading settings"
        description="Checking your session and profile."
      >
        <LoadingState />
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell
        current="settings"
        eyebrow="Account"
        title="Sign in to open settings"
        description="Profile, linked providers, and wallet actions require an authenticated session."
      >
        <EmptyState
          title="No active session"
          description="Sign in to manage account access and wallet security."
          actions={<PageActionLink href="/auth/login">Sign in</PageActionLink>}
          icon={<Icon name="settings" className="size-5" />}
        />
      </AppShell>
    );
  }

  if (errorMessage) {
    return (
      <AppShell
        current="settings"
        eyebrow="Account"
        title="Settings unavailable"
        description="The profile request failed or the session needs attention."
      >
        <StatusNotice title="Could not load settings" tone="danger">
          {errorMessage}
        </StatusNotice>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell
        current="settings"
        eyebrow="Account"
        title="Loading settings"
        description="Fetching your linked providers and profile."
      >
        <LoadingState />
      </AppShell>
    );
  }

  return (
    <AppShell
      current="settings"
      eyebrow="Account"
      title="Account settings"
      description="Review identity providers, wallet security steps, and sign out of the current browser session."
      actions={
        <>
          <PageActionLink href="/auth/wallet">Wallet binding</PageActionLink>
          <PageActionLink href="/dashboard" tone="secondary">
            Dashboard
          </PageActionLink>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <SurfaceCard className="space-y-5">
            <div className="space-y-2">
              <p className="eyebrow">Profile</p>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Identity summary
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Display name">
                <TextInput value={profile.user.display_name} readOnly />
              </FormField>
              <FormField label="Email">
                <TextInput value={profile.user.email ?? "Not provided"} readOnly />
              </FormField>
              <FormField label="Role">
                <TextInput value={profile.user.role} readOnly />
              </FormField>
              <FormField label="Linked providers">
                <TextInput value={profile.user.auth_providers.join(", ")} readOnly />
              </FormField>
            </div>
          </SurfaceCard>
          <SurfaceCard className="space-y-4">
            <div className="flex items-start gap-4">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-soft text-brand">
                <Icon name="wallet" className="size-5" />
              </span>
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                  Wallet and transaction security
                </h2>
                <p className="text-sm leading-6 text-ink-soft">
                  Wallet binding remains explicit. Link a wallet with a signed message, then confirm
                  the resulting transaction before using portfolio actions.
                </p>
              </div>
            </div>
            <PageActionLink href="/auth/wallet">Manage wallet binding</PageActionLink>
          </SurfaceCard>
        </div>
        <SurfaceCard className="space-y-5">
          <div className="space-y-2">
            <p className="eyebrow">Session control</p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
              End this browser session
            </h2>
            <p className="text-sm leading-6 text-ink-soft">
              Logging out revokes the refresh token and clears the locally stored session.
            </p>
          </div>
          <Button tone="secondary" onClick={handleLogout} disabled={isLogoutPending}>
            <Icon name="lock" className="size-4" />
            {isLogoutPending ? "Signing out…" : "Sign out"}
          </Button>
        </SurfaceCard>
      </div>
    </AppShell>
  );
}
