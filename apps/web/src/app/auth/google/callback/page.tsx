"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function getRedirectPath(role: string) {
  if (role === "issuer") {
    return "/issuer";
  }

  if (role === "admin") {
    return "/admin";
  }

  return "/portfolio";
}

function GoogleCallbackContent() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const oauthError = searchParams.get("error");

    if (oauthError) {
      setError("Google sign-in was cancelled or denied.");
      return;
    }

    if (!code) {
      setError("Google did not return an authorization code.");
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`;

    authApi
      .google(code, redirectUri)
      .then((session) => {
        login(session);
        router.replace(getRedirectPath(session.user.role));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Google sign-in failed.");
      });
  }, [login, router, searchParams]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div
        className="w-full max-w-md rounded-[2rem] border p-8 text-center"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h1 className="mb-3 text-2xl font-black" style={{ color: "var(--text)" }}>
          Google Sign-In
        </h1>

        {error ? (
          <>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {error}
            </p>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="mt-6 rounded-full px-5 py-3 text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #9945FF, #14F195)" }}
            >
              Back to login
            </button>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Exchanging Google authorization code for a SolaShare session...
          </p>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
          <div
            className="w-full max-w-md rounded-[2rem] border p-8 text-center"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <h1 className="mb-3 text-2xl font-black" style={{ color: "var(--text)" }}>
              Google Sign-In
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Preparing Google sign-in...
            </p>
          </div>
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
