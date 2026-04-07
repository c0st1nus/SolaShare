import type { AuthResponse, AuthUser } from "@/types";

export const ACCESS_TOKEN_KEY = "solashare_token";
export const REFRESH_TOKEN_KEY = "solashare_refresh_token";
export const USER_KEY = "solashare_user";

export interface StoredSession {
  accessToken: string;
  refreshToken: string | null;
  user: AuthUser | null;
}

export function getStoredSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (!accessToken) {
    return null;
  }

  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);

  let user: AuthUser | null = null;

  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as AuthUser;
    } catch {
      localStorage.removeItem(USER_KEY);
    }
  }

  return {
    accessToken,
    refreshToken,
    user,
  };
}

export function storeSession(
  session: Pick<AuthResponse, "access_token" | "refresh_token" | "user">,
): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
