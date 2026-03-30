"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import {
  AuthShell,
  Button,
  FormField,
  PageActionLink,
  SectionHeader,
  StatusNotice,
  SurfaceCard,
  TextInput,
} from "@/components/site";
import { getGoogleAuthorizationUrl, registerWithPassword } from "@/lib/api";
import { getFrontendGoogleRedirectUri } from "@/lib/auth";
import { storeSession } from "@/lib/session";

export default function RegisterPage() {
  const router = useRouter();
  const [formState, setFormState] = useState({
    display_name: "",
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegisterPending, startRegisterTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startRegisterTransition(async () => {
      try {
        setErrorMessage(null);
        const nextSession = await registerWithPassword(formState);
        storeSession(nextSession);
        router.push("/auth/wallet");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Registration failed.");
      }
    });
  };

  const handleGoogleStart = () => {
    startGoogleTransition(async () => {
      try {
        setErrorMessage(null);
        const redirectUri = getFrontendGoogleRedirectUri();
        const response = await getGoogleAuthorizationUrl(
          redirectUri ? { redirect_uri: redirectUri } : undefined,
        );
        window.location.href = response.authorization_url;
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Google sign-up could not start.");
      }
    });
  };

  return (
    <AuthShell label="Create account">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <SectionHeader
            eyebrow="Investor onboarding"
            title="Create a real SolaShare account."
            description="Registration sends your email, password, and display name to the backend. Only the password hash is stored, and the resulting session is the same one used by provider sign-in."
          />
          <SurfaceCard className="space-y-4">
            <p className="eyebrow">After registration</p>
            <div className="space-y-3 text-sm leading-6 text-ink-soft">
              <p>New self-serve accounts start as investor users.</p>
              <p>You can bind a wallet immediately after creating the account.</p>
              <p>
                Google OAuth remains available if you prefer provider-based access from the start.
              </p>
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          {errorMessage ? (
            <StatusNotice title="Could not create account" tone="danger">
              {errorMessage}
            </StatusNotice>
          ) : null}
          <SurfaceCard className="space-y-6">
            <div className="space-y-2">
              <p className="eyebrow">Registration</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
                Set up your investor profile
              </h2>
            </div>
            <form className="grid gap-4" onSubmit={handleRegister}>
              <FormField label="Display name">
                <TextInput
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  value={formState.display_name}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      display_name: event.target.value,
                    }))
                  }
                  required
                />
              </FormField>
              <FormField label="Email">
                <TextInput
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </FormField>
              <FormField label="Password" hint="Use at least 8 characters.">
                <TextInput
                  type="password"
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  minLength={8}
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                />
              </FormField>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={isRegisterPending}>
                  <Icon name="user" className="size-4" />
                  {isRegisterPending ? "Creating account…" : "Create account"}
                </Button>
                <Button
                  type="button"
                  tone="secondary"
                  onClick={handleGoogleStart}
                  disabled={isGooglePending}
                >
                  <Icon name="globe" className="size-4" />
                  {isGooglePending ? "Opening Google…" : "Continue with Google"}
                </Button>
              </div>
            </form>
          </SurfaceCard>
          <SurfaceCard className="space-y-3">
            <p className="text-sm text-ink-soft">Already have an account?</p>
            <PageActionLink href="/auth/login">Go to sign in</PageActionLink>
          </SurfaceCard>
        </div>
      </div>
    </AuthShell>
  );
}
