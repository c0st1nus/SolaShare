"use client";

import { Mail, Wallet } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { TelegramAuthPreview } from "@/types";

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: {
      initData?: string;
      initDataUnsafe?: {
        user?: unknown;
      };
      ready?: () => void;
    };
  };
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [telegramInitData, setTelegramInitData] = useState<string | null>(null);
  const [telegramPreview, setTelegramPreview] = useState<TelegramAuthPreview | null>(null);
  const [telegramPreviewLoading, setTelegramPreviewLoading] = useState(true);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const { resolvedTheme } = useTheme();

  function getRedirectPath(role: string) {
    if (role === "issuer") return "/issuer";
    if (role === "admin") return "/admin";
    return "/portfolio";
  }

  useEffect(() => {
    const telegram = (window as TelegramWindow).Telegram?.WebApp;
    const initData = telegram?.initData?.trim();
    const hasTelegramUser = Boolean(telegram?.initDataUnsafe?.user);

    telegram?.ready?.();

    if (!initData || !hasTelegramUser) {
      setTelegramInitData(null);
      setTelegramPreview(null);
      setTelegramPreviewLoading(false);
      return;
    }

    setTelegramInitData(initData);
    setTelegramPreviewLoading(true);

    authApi
      .telegramPreview(initData)
      .then((preview) => {
        setTelegramPreview(preview);
      })
      .catch((err) => {
        setTelegramPreview(null);
        setError(err instanceof Error ? err.message : "Failed to validate Telegram session.");
      })
      .finally(() => setTelegramPreviewLoading(false));
  }, []);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    setError("");

    try {
      const res =
        mode === "login"
          ? await authApi.login(email, password)
          : await authApi.register(email, password, displayName);

      login(res);
      router.push(getRedirectPath(res.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleTelegramLogin() {
    if (!telegramInitData) {
      return;
    }

    setTelegramLoading(true);
    setError("");

    try {
      const res = await authApi.telegram(telegramInitData);
      login(res);
      router.push(getRedirectPath(res.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Telegram sign-in failed.");
    } finally {
      setTelegramLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (typeof window === "undefined") {
      return;
    }

    setGoogleLoading(true);
    setError("");

    try {
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const response = await authApi.googleUrl(redirectUri);
      window.location.assign(response.authorization_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed to start.");
      setGoogleLoading(false);
    }
  }

  const heroLogoSrc =
    resolvedTheme === "light" ? "/logo_grey_caption.svg" : "/logo_white_caption.svg";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 animate-fade-in">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center mb-8">
          <div className="mb-5 flex justify-center">
            <Image src={heroLogoSrc} alt="SolaShare" width={220} height={157} priority />
          </div>
          <h1 className="text-3xl font-black mb-2" style={{ color: "var(--text)" }}>
            Access your solar portfolio
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Solar RWA platform on Solana
          </p>
        </div>

        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" style={{ color: "var(--accent-green-ui)" }} />
              <h2 className="font-bold text-sm" style={{ color: "var(--text)" }}>
                Email Auth
              </h2>
            </div>
            <div className="flex rounded-full p-1" style={{ background: "var(--surface-low)" }}>
              {(["login", "register"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`rounded-full px-3 py-1 text-xs font-bold capitalize transition-colors ${
                    mode === value ? "bg-[#9945FF] text-white" : ""
                  }`}
                  style={mode === value ? {} : { color: "var(--text-muted)" }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === "register" && (
              <div>
                <label htmlFor="display-name" className="label-xs block mb-2">
                  Display Name
                </label>
                <input
                  id="display-name"
                  className="input-new"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="label-xs block mb-2">
                Email
              </label>
              <input
                id="email"
                className="input-new"
                placeholder="name@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="label-xs block mb-2">
                Password
              </label>
              <input
                id="password"
                className="input-new"
                placeholder={mode === "login" ? "Your password" : "Minimum 8 characters"}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-400 text-xs font-medium">{error}</p>}
            <button type="submit" disabled={emailLoading} className="btn-sol w-full text-sm">
              {emailLoading
                ? "Processing…"
                : mode === "login"
                  ? "Sign in with Email"
                  : "Create Account"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: "var(--border)" }} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.24em]"
              style={{ color: "var(--text-faint)" }}
            >
              or
            </span>
            <div className="h-px flex-1" style={{ background: "var(--border)" }} />
          </div>

          <button
            type="button"
            disabled={googleLoading}
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-full border px-4 py-3 text-sm font-bold transition-colors hover:border-[#4285F4]"
            style={{
              borderColor: "var(--border)",
              color: "var(--text)",
              background: "var(--surface)",
            }}
          >
            <Image
              src="/google-icon.png"
              alt=""
              width={18}
              height={18}
              className="h-[18px] w-[18px]"
            />
            {googleLoading ? "Redirecting to Google…" : "Continue with Google"}
          </button>
        </div>

        {telegramInitData ? (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-4 h-4 text-[#9945FF]" />
              <h2 className="font-bold text-sm" style={{ color: "var(--text)" }}>
                Telegram Mini App
              </h2>
            </div>

            {telegramPreviewLoading ? (
              <div className="space-y-3">
                <div
                  className="h-5 w-32 rounded-full animate-pulse"
                  style={{ background: "var(--surface-low)" }}
                />
                <div
                  className="h-20 rounded-3xl animate-pulse"
                  style={{ background: "var(--surface-low)" }}
                />
              </div>
            ) : telegramPreview ? (
              <div className="space-y-4">
                <div
                  className="rounded-[1.5rem] border p-4"
                  style={{
                    background: "var(--surface-low)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    {telegramPreview.telegram_user.photo_url ? (
                      <div className="relative h-12 w-12 overflow-hidden rounded-2xl">
                        <Image
                          src={telegramPreview.telegram_user.photo_url}
                          alt={telegramPreview.telegram_user.display_name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl font-black text-white"
                        style={{
                          background: "linear-gradient(135deg, #9945FF, #14F195)",
                        }}
                      >
                        TG
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                        {telegramPreview.telegram_user.display_name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {telegramPreview.telegram_user.telegram_username
                          ? `@${telegramPreview.telegram_user.telegram_username}`
                          : `Telegram ID ${telegramPreview.telegram_user.telegram_user_id}`}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
                    {telegramPreview.suggested_action === "login"
                      ? `Найден аккаунт ${telegramPreview.existing_account?.display_name ?? "SolaShare User"}. Войдите через Telegram, чтобы открыть его.`
                      : "Telegram аккаунт подтверждён. Можно создать новый профиль и продолжить вход через Telegram."}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={telegramLoading}
                  onClick={handleTelegramLogin}
                  className="btn-sol w-full text-sm"
                >
                  {telegramLoading
                    ? "Checking…"
                    : telegramPreview.suggested_action === "login"
                      ? "Sign in with Telegram"
                      : "Create account with Telegram"}
                </button>

                <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                  Остальные методы входа ниже остаются доступны. После входа через Telegram можно
                  добавить email/password в профиле и заходить в тот же аккаунт из обычного
                  браузера.
                </p>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Telegram session was detected, but it could not be validated.
              </p>
            )}
          </div>
        ) : null}

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--text-faint)" }}>
            real backend session
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>

        <p className="text-center text-xs" style={{ color: "var(--text-faint)" }}>
          Email/password stays available everywhere. Telegram sign-in is only offered when the page
          is opened inside Telegram.
        </p>
      </div>
    </div>
  );
}
