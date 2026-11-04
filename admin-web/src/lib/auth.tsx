"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, setUnauthorizedHandler, tokenStore } from "./api";
import type { User } from "./types";

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  /** From POST /auth/email/verify: proves the email is real and belongs to this person. */
  emailVerificationToken: string;
}

type AuthStatus ="loading" | "signed-in" | "signed-out";

interface AuthValue {
  status: AuthStatus;
  user: User | null;
  /** Signs in and returns the user, so the caller can route by role. */
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
    setStatus("signed-out");
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    const token = tokenStore.get();
    const check = token ? api.get<User>("/auth/me") : Promise.reject(null);
    check
      .then((me) => {
        setUser(me);
        setStatus("signed-in");
      })
      .catch((error) => {
        // No token, or a network error (e.g. the free Render API waking up): keep any token, show sign-in.
        if (error === null || (error instanceof ApiError && error.code === "NETWORK")) setStatus("signed-out");
        else logout();
      });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const startSession = useCallback((session: { user: User; token: string }) => {
    tokenStore.set(session.token);
    setUser(session.user);
    setStatus("signed-in");
    return session.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) =>
      startSession(await api.post<{ user: User; token: string }>("/auth/login", { email, password })),
    [startSession],
  );

  const register = useCallback(
    async (input: RegisterInput) =>
      startSession(await api.post<{ user: User; token: string }>("/auth/register", input)),
    [startSession],
  );

  const value = useMemo(
    () => ({ status, user, login, register, logout, setUser }),
    [status, user, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Where a user lands after signing in. */
export function homeFor(user: Pick<User, "role">): string {
  return user.role === "admin" ? "/admin/dashboard" : "/account";
}

/** Only follow same-site paths from ?next=, and only into the area the user may open. */
export function safeNext(next: string | null, user: Pick<User, "role">): string {
  // Browsers read "/\evil.com" (and "/<tab>/evil.com") as "//evil.com", another site.
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(next)) return homeFor(user);
  if (next.startsWith("/admin") && user.role !== "admin") return homeFor(user);
  if (next.startsWith("/account") && user.role !== "customer") return homeFor(user);
  return next;
}
