"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { AuthShell, EmptyState, LoadingState, StatusNotice } from "@/components/site";
import { exchangeGoogleCode } from "@/lib/api";
import { getFrontendGoogleRedirectUri } from "@/lib/auth";
import { storeSession } from "@/lib/session";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }

    const code = searchParams.get("code");
    const providerError = searchParams.get("error");

    if (providerError) {
      handledRef.current = true;
      setErrorMessage(providerError);
      return;
    }

    if (!code) {
      handledRef.current = true;
      setErrorMessage("Missing Google authorization code.");
      return;
    }

    handledRef.current = true;

    void exchangeGoogleCode({
      code,
      redirect_uri: getFrontendGoogleRedirectUri(),
    })
      .then((session) => {
        storeSession(session);
        router.replace("/dashboard");
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Google sign-in failed.");
      });
  }, [router, searchParams]);

  return (
    <AuthShell label="Google callback">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {errorMessage ? (
          <>
            <StatusNotice title="Google sign-in failed" tone="danger">
              {errorMessage}
            </StatusNotice>
            <EmptyState
              title="Could not complete Google sign-in"
              description="Return to the sign-in screen and try the flow again."
              actions={
                <a
                  href="/auth/login"
                  className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--color-brand-mint),var(--color-brand-violet))] px-5 py-3 text-sm font-semibold text-white shadow-float"
                >
                  <Icon name="arrow-right" className="size-4" />
                  Back to sign in
                </a>
              }
              icon={<Icon name="globe" className="size-5" />}
            />
          </>
        ) : (
          <LoadingState
            title="Completing Google sign-in"
            description="Exchanging the authorization code for a live SolaShare session."
          />
        )}
      </div>
    </AuthShell>
  );
}
