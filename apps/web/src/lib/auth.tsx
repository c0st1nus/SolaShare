"use client";

import type React from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi } from "@/lib/api";
import { clearSession, getStoredSession, storeSession } from "@/lib/session";
import type { AuthResponse, AuthUser } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (session: AuthResponse) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback((session: AuthResponse) => {
    storeSession(session);
    setToken(session.access_token);
    setUser(session.user);
  }, []);

  const refreshUser = useCallback(async () => {
    const session = getStoredSession();

    if (!session?.accessToken) {
      logout();
      return;
    }

    try {
      const res = await authApi.me();
      storeSession({
        access_token: getStoredSession()?.accessToken ?? session.accessToken,
        refresh_token: getStoredSession()?.refreshToken ?? session.refreshToken ?? "",
        user: res.user,
      });
      setToken(getStoredSession()?.accessToken ?? session.accessToken);
      setUser(res.user);
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    const session = getStoredSession();

    if (session?.accessToken) {
      setToken(session.accessToken);
      setUser(session.user);
      void refreshUser();
    }

    setIsLoading(false);
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
