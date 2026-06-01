import { IS_DEMO } from "@/lib/app-env";

export const SESSION_COOKIE_NAME = "sil_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export const DEMO_AUTH = {
  email: "demo@siloops.com.br",
  password: "SiloOps@2026",
  mode: "demo" as const,
};

export const OFFICIAL_PROD_AUTH = {
  emails: ["soniel2013@gmail.com", "sonieloficial@gmail.com"] as string[],
  password: "SiloOps@2026",
} as const;

export const PROD_AUTH_MODE = "prod" as const;

export type AuthMode = typeof DEMO_AUTH.mode | typeof PROD_AUTH_MODE;

export interface SessionPayload {
  email: string;
  expiry: number;
  mode: AuthMode;
}

export interface VisualProfile {
  email: string;
  name: string;
  role: "demo" | "admin";
}

export function normalizeLoginEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeLoginPassword(password: string) {
  return password.trim();
}

export function canUseDemoLogin(email: string, password: string) {
  return IS_DEMO
    && normalizeLoginEmail(email) === DEMO_AUTH.email
    && normalizeLoginPassword(password) === DEMO_AUTH.password;
}

export function canUseProdLogin(email: string, password: string, adminEmail: string | undefined, adminPassword: string | undefined) {
  if (IS_DEMO) return false;
  const normalizedEmail = normalizeLoginEmail(email);
  const normalizedPassword = normalizeLoginPassword(password);
  const normalizedAdminEmail = normalizeLoginEmail(adminEmail || "");
  const normalizedAdminPassword = normalizeLoginPassword(adminPassword || "");

  const matchesEnv = Boolean(normalizedAdminEmail && normalizedAdminPassword)
    && normalizedEmail === normalizedAdminEmail
    && normalizedPassword === normalizedAdminPassword;
  const matchesOfficial = OFFICIAL_PROD_AUTH.emails.includes(normalizedEmail)
    && normalizedPassword === OFFICIAL_PROD_AUTH.password;

  return matchesEnv || matchesOfficial;
}

export function buildSession(email: string, mode: AuthMode): SessionPayload {
  return {
    email: normalizeLoginEmail(email),
    expiry: Date.now() + 1000 * 60 * 60 * 8,
    mode,
  };
}

export function buildVisualProfile(email: string, mode: AuthMode): VisualProfile {
  const normalizedEmail = normalizeLoginEmail(email);
  if (normalizedEmail === DEMO_AUTH.email) {
    return { email: normalizedEmail, name: "Conta Demo", role: "demo" };
  }

  if (normalizedEmail === "soniel2013@gmail.com") {
    return { email: normalizedEmail, name: "Soniel 2013", role: "admin" };
  }

  if (normalizedEmail === "sonieloficial@gmail.com") {
    return { email: normalizedEmail, name: "Soniel Oficial", role: "admin" };
  }

  return {
    email: normalizedEmail,
    name: normalizedEmail.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    role: mode === "demo" ? "demo" : "admin",
  };
}

export function encodeSessionCookie(session: SessionPayload) {
  return encodeURIComponent(JSON.stringify(session));
}

export function decodeSessionCookie(raw?: string | null): SessionPayload | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<SessionPayload>;
    if (
      typeof parsed.email !== "string"
      || typeof parsed.expiry !== "number"
      || (parsed.mode !== "demo" && parsed.mode !== "prod")
    ) {
      return null;
    }

    if (parsed.expiry <= Date.now()) return null;

    return {
      email: normalizeLoginEmail(parsed.email),
      expiry: parsed.expiry,
      mode: parsed.mode,
    };
  } catch {
    return null;
  }
}

export function sanitizeReturnTo(returnTo?: string | null) {
  if (!returnTo) return "/";
  const value = returnTo.trim();
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
