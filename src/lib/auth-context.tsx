"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildSession,
  buildVisualProfile,
  decodeSessionCookie,
  encodeSessionCookie,
  sanitizeReturnTo,
  SESSION_COOKIE_NAME,
  SessionPayload,
} from "@/lib/auth";

const SESSION_VISUAL_KEY = "sil_session_visual";

interface LoginResult {
  ok: boolean;
  message?: string;
  returnTo?: string;
}

interface AuthContextType {
  session: SessionPayload | null;
  profile: ReturnType<typeof buildVisualProfile> | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string, returnTo?: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mirrorSession(session: SessionPayload | null) {
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.setItem(SESSION_VISUAL_KEY, JSON.stringify(buildVisualProfile(session.email, session.mode)));
  } else {
    localStorage.removeItem(SESSION_VISUAL_KEY);
  }
}

export function AuthProvider({
  children,
  initialSession = null,
}: {
  children: React.ReactNode;
  initialSession?: SessionPayload | null;
}) {
  const [session, setSession] = useState<SessionPayload | null>(initialSession);
  const router = useRouter();
  const profile = session ? buildVisualProfile(session.email, session.mode) : null;

  useEffect(() => {
    mirrorSession(session);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const remaining = session.expiry - Date.now();
    if (remaining <= 0) {
      setSession(null);
      return;
    }
    const timer = window.setTimeout(() => setSession(null), remaining);
    return () => window.clearTimeout(timer);
  }, [session]);

  const login = async (email: string, pass: string, returnTo?: string): Promise<LoginResult> => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: pass, returnTo: sanitizeReturnTo(returnTo) }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok || !data?.session) {
      return {
        ok: false,
        message: data?.message || "Credenciais inválidas. Verifique seu e-mail e senha.",
      };
    }

    const nextSession = decodeSessionCookie(encodeSessionCookie(data.session))
      || buildSession(data.session.email, data.session.mode);

    setSession(nextSession);
    return {
      ok: true,
      returnTo: sanitizeReturnTo(data.returnTo || returnTo),
    };
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setSession(null);
      mirrorSession(null);
      router.replace("/login");
    }
  };

  const value: AuthContextType = {
    session,
    isAuthenticated: Boolean(session && session.expiry > Date.now()),
    profile,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
