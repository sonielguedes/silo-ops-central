import { IS_DEMO } from "@/lib/app-env";

export const DEMO_AUTH = {
  email: "demo@siloops.com.br",
  password: "SiloOps@2026",
  mode: "demo" as const,
};

export const PROD_AUTH_MODE = "prod" as const;

export type AuthMode = typeof DEMO_AUTH.mode | typeof PROD_AUTH_MODE;

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
  return normalizeLoginEmail(email) === normalizeLoginEmail(adminEmail || "")
    && normalizeLoginPassword(password) === (adminPassword || "");
}

export function buildSession(email: string, mode: AuthMode) {
  return {
    email: normalizeLoginEmail(email),
    expiry: Date.now() + 1000 * 60 * 60 * 8,
    mode,
  };
}
