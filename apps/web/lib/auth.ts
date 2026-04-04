import { getGoogleRedirectUri } from "@/lib/api";
import { getTelegramMiniAppInitData } from "@/lib/telegram";

export type AuthEntryMode = "telegram-miniapp" | "password" | "google" | "telegram-widget";

export function getPreferredAuthEntryMode(): AuthEntryMode {
  return getTelegramMiniAppInitData() ? "telegram-miniapp" : "password";
}

export function shouldAutoStartTelegramMiniAppAuth(): boolean {
  return getPreferredAuthEntryMode() === "telegram-miniapp";
}

export function getFrontendGoogleRedirectUri() {
  return getGoogleRedirectUri();
}
