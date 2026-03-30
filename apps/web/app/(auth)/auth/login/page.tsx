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
import { TelegramLoginWidget } from "@/components/telegram-login-widget";
import {
  authenticateTelegramLogin,
  authenticateTelegramMiniApp,
  getGoogleAuthorizationUrl,
  loginWithPassword,
} from "@/lib/api";
import { getFrontendGoogleRedirectUri } from "@/lib/auth";
import { storeSession } from "@/lib/session";
import { getTelegramMiniAppInitData } from "@/lib/telegram";
import type { TelegramLoginRequest } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [formState, setFormState] = useState({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPasswordPending, startPasswordTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();
  const [isMiniAppPending, startMiniAppTransition] = useTransition();

  const completeSignIn =
    (nextPath = "/dashboard") =>
    (sessionData: Awaited<ReturnType<typeof loginWithPassword>>) => {
      storeSession(sessionData);
      router.push(nextPath);
    };

  const handlePasswordLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startPasswordTransition(async () => {
      try {
        setErrorMessage(null);
        setSuccessMessage(null);
        const nextSession = await loginWithPassword(formState);
        completeSignIn()(nextSession);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Sign-in failed.");
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
        setErrorMessage(error instanceof Error ? error.message : "Google sign-in could not start.");
      }
    });
  };

  const handleMiniAppSignIn = () => {
    const telegramInitData = getTelegramMiniAppInitData();

    if (!telegramInitData) {
      setErrorMessage("This browser session does not contain Telegram Mini App launch data.");
      return;
    }

    startMiniAppTransition(async () => {
      try {
        setErrorMessage(null);
        setSuccessMessage("Mini App signature detected. Finalizing session…");
        const nextSession = await authenticateTelegramMiniApp({
          telegram_init_data: telegramInitData,
        });
        completeSignIn()(nextSession);
      } catch (error) {
        setSuccessMessage(null);
        setErrorMessage(
          error instanceof Error ? error.message : "Telegram Mini App sign-in failed.",
        );
      }
    });
  };

  const handleTelegramWidget = async (payload: TelegramLoginRequest) => {
    setErrorMessage(null);
    setSuccessMessage("Telegram identity received. Finalizing session…");

    const nextSession = await authenticateTelegramLogin(payload);
    completeSignIn()(nextSession);
  };

  return (
    <AuthShell label="Sign in">
      <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">
          <SectionHeader
            eyebrow="Access account"
            title="Use your preferred sign-in method."
            description="Email-password login, Google OAuth, Telegram Login Widget, and Telegram Mini App entry all create the same local SolaShare session."
          />
          <SurfaceCard className="space-y-4">
            <p className="eyebrow">What happens next</p>
            <div className="space-y-3 text-sm leading-6 text-ink-soft">
              <p>Your access token is stored locally for the current browser session.</p>
              <p>
                Protected portfolio and wallet screens use that session and refresh it automatically
                when needed.
              </p>
              <p>Wallet binding remains a separate authenticated step after sign-in.</p>
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          {successMessage ? (
            <StatusNotice title="Working" tone="success">
              {successMessage}
            </StatusNotice>
          ) : null}
          {errorMessage ? (
            <StatusNotice title="Could not sign you in" tone="danger">
              {errorMessage}
            </StatusNotice>
          ) : null}
          <SurfaceCard className="space-y-6">
            <div className="space-y-2">
              <p className="eyebrow">Password login</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
                Sign in to your account
              </h2>
            </div>
            <form className="grid gap-4" onSubmit={handlePasswordLogin}>
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
              <FormField label="Password">
                <TextInput
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                />
              </FormField>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={isPasswordPending}>
                  <Icon name="lock" className="size-4" />
                  {isPasswordPending ? "Signing in…" : "Sign in"}
                </Button>
                <PageActionLink href="/auth/register" tone="secondary">
                  Create account
                </PageActionLink>
              </div>
            </form>
          </SurfaceCard>
          <SurfaceCard className="space-y-5">
            <div className="space-y-2">
              <p className="eyebrow">Provider access</p>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Continue without a password
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleGoogleStart} disabled={isGooglePending}>
                <Icon name="globe" className="size-4" />
                {isGooglePending ? "Opening Google…" : "Continue with Google"}
              </Button>
              <Button tone="secondary" onClick={handleMiniAppSignIn} disabled={isMiniAppPending}>
                <Icon name="spark" className="size-4" />
                {isMiniAppPending ? "Signing in…" : "Use Telegram Mini App"}
              </Button>
            </div>
            <TelegramLoginWidget
              className="pt-2"
              onAuthenticate={handleTelegramWidget}
              onError={setErrorMessage}
            />
          </SurfaceCard>
        </div>
      </div>
    </AuthShell>
  );
}
