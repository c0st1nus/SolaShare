"use client";

import { useEffect, useState } from "react";
import { ApiError, refreshSessionToken } from "@/lib/api";
import type { AuthSessionResponse } from "@/lib/types";

const AUTH_STORAGE_KEY = "solashare.auth.session";
const AUTH_EVENT_NAME = "solashare:auth-changed";

function notifySessionChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_EVENT_NAME));
}

export function readStoredSession(): AuthSessionResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSessionResponse;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function storeSession(session: AuthSessionResponse) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  notifySessionChange();
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  notifySessionChange();
}

export function useStoredSession() {
  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSession(readStoredSession());
      setReady(true);
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(AUTH_EVENT_NAME, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(AUTH_EVENT_NAME, sync);
    };
  }, []);

  return {
    ready,
    session,
    isAuthenticated: Boolean(session),
  };
}

export async function refreshStoredSession() {
  const currentSession = readStoredSession();

  if (!currentSession?.refresh_token) {
    clearSession();
    return null;
  }

  try {
    const nextSession = await refreshSessionToken({
      refresh_token: currentSession.refresh_token,
    });
    storeSession(nextSession);
    return nextSession;
  } catch {
    clearSession();
    return null;
  }
}

export async function executeWithSession<T>(operation: (accessToken: string) => Promise<T>) {
  const currentSession = readStoredSession();

  if (!currentSession?.access_token) {
    throw new Error("Authentication required");
  }

  try {
    return await operation(currentSession.access_token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const refreshedSession = await refreshStoredSession();

      if (!refreshedSession?.access_token) {
        throw error;
      }

      return operation(refreshedSession.access_token);
    }

    throw error;
  }
}
