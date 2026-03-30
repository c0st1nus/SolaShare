"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import {
  AuthShell,
  Button,
  EmptyState,
  PageActionLink,
  SectionHeader,
  SignalCard,
  StatusNotice,
  SurfaceCard,
} from "@/components/site";
import { authenticateTelegramMiniApp, getGoogleAuthorizationUrl } from "@/lib/api";
import { getFrontendGoogleRedirectUri, shouldAutoStartTelegramMiniAppAuth } from "@/lib/auth";
import { storeSession, useStoredSession } from "@/lib/session";
import { getTelegramMiniAppInitData } from "@/lib/telegram";

const entrySignals = [
  {
    title: "Password account",
    description:
      "Create an investor account with email and password, then continue with wallet binding.",
    icon: "lock" as const,
  },
  {
    title: "Provider access",
    description: "Google OAuth and Telegram login map into the same local SolaShare session.",
    icon: "globe" as const,
  },
  {
    title: "Mini App shortcut",
    description:
      "When the app opens inside Telegram, signed init data can start the session immediately.",
    icon: "spark" as const,
  },
];

export default function SignInPage() {
  const router = useRouter();
  const { ready, session } = useStoredSession();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMiniAppPending, startMiniAppTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();
  const autoStartedRef = useRef(false);
  const runMiniAppAutoStart = useEffectEvent(() => {
    startMiniAppAuth();
  });

  const startMiniAppAuth = () => {
    const telegramInitData = getTelegramMiniAppInitData();

    if (!telegramInitData) {
      setErrorMessage("Telegram Mini App context is not available in this browser session.");
      return;
    }

    startMiniAppTransition(async () => {
      try {
        setErrorMessage(null);
        setStatusMessage("Signing you in with Telegram Mini App…");
        const nextSession = await authenticateTelegramMiniApp({
          telegram_init_data: telegramInitData,
        });
        storeSession(nextSession);
        router.push("/dashboard");
      } catch (error) {
        setStatusMessage(null);
        setErrorMessage(error instanceof Error ? error.message : "Telegram sign-in failed.");
      }
    });
  };

  const startGoogleAuth = () => {
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

  useEffect(() => {
    if (!ready || session || autoStartedRef.current || !shouldAutoStartTelegramMiniAppAuth()) {
      return;
    }

    autoStartedRef.current = true;
    runMiniAppAutoStart();
  }, [ready, session]);

  return (
    <AuthShell label={session ? "Authenticated" : "Access"}>
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-8">
          <SectionHeader
            eyebrow="SolaShare access"
            title="Sign in with the path that matches your environment."
            description="Normal browsers can use email and password or Google. Telegram users can sign in through the widget, while Mini App launches can bootstrap the session from signed init data."
            actions={
              <>
                <PageActionLink href="/auth/login">Sign in</PageActionLink>
                <PageActionLink href="/auth/register" tone="secondary">
                  Create account
                </PageActionLink>
              </>
            }
          />
          <div className="grid gap-4 md:grid-cols-3">
            {entrySignals.map((signal) => (
              <SignalCard
                key={signal.title}
                icon={<Icon name={signal.icon} className="size-5" />}
                title={signal.title}
                description={signal.description}
              />
            ))}
          </div>
          <SurfaceCard className="overflow-hidden p-0">
            <div className="relative aspect-[16/10]">
              <Image
                src="https://images.unsplash.com/photo-1509391366360-feaffa6021fb?q=80&w=1600&auto=format&fit=crop"
                alt="Utility-scale solar field"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.72),transparent_60%)]" />
              <div className="absolute inset-x-6 bottom-6 space-y-3 text-white">
                <p className="eyebrow text-white/70">Unified auth</p>
                <h2 className="font-display text-3xl font-semibold tracking-tight">
                  One backend session, four entry modes
                </h2>
                <p className="max-w-xl text-sm leading-6 text-white/80">
                  Once authenticated, the same portfolio, wallet, issuer, and claims screens work
                  regardless of how the identity proof was collected.
                </p>
              </div>
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          {statusMessage ? (
            <StatusNotice title="In progress" tone="success">
              {statusMessage}
            </StatusNotice>
          ) : null}
          {errorMessage ? (
            <StatusNotice title="Action required" tone="danger">
              {errorMessage}
            </StatusNotice>
          ) : null}
          {session ? (
            <EmptyState
              title={`You are signed in as ${session.user.display_name}`}
              description="Open the investor workspace, review your portfolio, or continue with wallet binding."
              actions={
                <>
                  <PageActionLink href="/dashboard">Open dashboard</PageActionLink>
                  <PageActionLink href="/auth/wallet" tone="secondary">
                    Wallet setup
                  </PageActionLink>
                </>
              }
              icon={<Icon name="check" className="size-5" />}
            />
          ) : (
            <>
              <SurfaceCard className="space-y-5">
                <div className="space-y-2">
                  <p className="eyebrow">Browser access</p>
                  <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
                    Start from a clean sign-in screen
                  </h2>
                  <p className="text-sm leading-6 text-ink-soft">
                    Use the dedicated login and registration pages for email-password access and
                    provider sign-in.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/auth/login"
                    className="rounded-panel border border-line/70 bg-surface-soft p-5 hover:border-brand-violet/30"
                  >
                    <p className="eyebrow">Returning user</p>
                    <p className="mt-2 text-lg font-semibold text-ink">Open sign in</p>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      Password, Google, Telegram widget, and Mini App entry all start there.
                    </p>
                  </Link>
                  <Link
                    href="/auth/register"
                    className="rounded-panel border border-line/70 bg-surface-soft p-5 hover:border-brand-violet/30"
                  >
                    <p className="eyebrow">New investor</p>
                    <p className="mt-2 text-lg font-semibold text-ink">Create account</p>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      Register with email and password, then continue to wallet binding.
                    </p>
                  </Link>
                </div>
              </SurfaceCard>
              <SurfaceCard className="space-y-5">
                <div className="space-y-2">
                  <p className="eyebrow">Direct provider entry</p>
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                    Quick access
                  </h2>
                  <p className="text-sm leading-6 text-ink-soft">
                    Google can start immediately. Telegram Mini App access is available when the
                    current browser session has signed launch data.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={startGoogleAuth} disabled={isGooglePending}>
                    <Icon name="globe" className="size-4" />
                    {isGooglePending ? "Opening Google…" : "Continue with Google"}
                  </Button>
                  <Button tone="secondary" onClick={startMiniAppAuth} disabled={isMiniAppPending}>
                    <Icon name="spark" className="size-4" />
                    {isMiniAppPending ? "Signing in…" : "Use Telegram Mini App"}
                  </Button>
                </div>
              </SurfaceCard>
            </>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
