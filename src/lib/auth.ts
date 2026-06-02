import type { NextRequest } from "next/server";
import { IS_DEMO } from "@/lib/app-env";

export const SESSION_COOKIE_NAME = "sil_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export const DEMO_AUTH = {
  email: "demo@siloops.com.br",
  password: "SiloOps@2026",
  mode: "demo" as const,
};

export const OFFICIAL_PROD_AUTH = {
  credentials: [
    {
      email: "soniel2013@gmail.com",
      password: "SiloOps@2026",
    },
    {
      email: "sonieloficial@gmail.com",
      password: "SiloOps@2026",
    },
    {
      email: "viewer@siloops.com.br",
      password: "Viewer@2026",
    },
  ] as const,
} as const;

export const PROD_AUTH_MODE = "prod" as const;

export type AuthMode = typeof DEMO_AUTH.mode | typeof PROD_AUTH_MODE;
export type Role =
  | "ADMIN_GLOBAL"
  | "ADMIN_EMPRESA"
  | "GESTOR_USINA"
  | "GESTOR_UNIDADE"
  | "COA"
  | "VIEWER"
  | "OPERADOR_APK";

export type ModuleName =
  | "dashboard"
  | "mapa"
  | "operacoes"
  | "equipamentos"
  | "operadores"
  | "fazendas"
  | "telemetria"
  | "eventos"
  | "alertas"
  | "sincronizacao"
  | "configuracoes-op"
  | "relatorios"
  | "power-bi"
  | "auditoria"
  | "configuracoes";

export interface SessionPayload {
  email: string;
  name: string;
  role: Role;
  empresa_id: string;
  usinas: string[];
  unidades: string[];
  permissions: string[];
  expiry: number;
  mode: AuthMode;
}

export interface VisualProfile {
  email: string;
  name: string;
  role: Role;
}

export interface ScopeFields {
  empresa_id: string;
  usina_id: string;
  unidade_id: string;
}

export interface ScopeFilter {
  empresa_id?: string;
  usina_ids?: string[];
  unidade_ids?: string[];
}

export interface UserSeed {
  email: string;
  name: string;
  role: Role;
  empresa_id: string;
  usinas: string[];
  unidades: string[];
  permissions: string[];
}

export const USER_SEEDS: UserSeed[] = [
  {
    email: "sonieloficial@gmail.com",
    name: "Soniel Oficial",
    role: "ADMIN_GLOBAL",
    empresa_id: "SILOOPS",
    usinas: ["*"],
    unidades: ["*"],
    permissions: ["*"],
  },
  {
    email: "soniel2013@gmail.com",
    name: "Soniel 2013",
    role: "ADMIN_GLOBAL",
    empresa_id: "SILOOPS",
    usinas: ["*"],
    unidades: ["*"],
    permissions: ["*"],
  },
  {
    email: "viewer@siloops.com.br",
    name: "Viewer Tenant",
    role: "VIEWER",
    empresa_id: "SILOOPS",
    usinas: ["USINA_PADRAO"],
    unidades: ["UNIDADE_PADRAO"],
    permissions: ["read:dashboard", "read:eventos", "read:operacoes", "read:equipamentos"],
  },
];

const ROLE_MODULE_ACCESS: Record<Role, ModuleName[] | "*"> = {
  ADMIN_GLOBAL: "*",
  ADMIN_EMPRESA: ["dashboard", "mapa", "operacoes", "equipamentos", "operadores", "fazendas", "telemetria", "eventos", "alertas", "sincronizacao", "configuracoes-op", "relatorios", "power-bi", "auditoria", "configuracoes"],
  GESTOR_USINA: ["dashboard", "mapa", "operacoes", "equipamentos", "telemetria", "eventos", "alertas", "sincronizacao", "relatorios"],
  GESTOR_UNIDADE: ["dashboard", "mapa", "operacoes", "equipamentos", "telemetria", "eventos", "alertas", "relatorios"],
  COA: ["dashboard", "mapa", "operacoes", "equipamentos", "telemetria", "eventos", "alertas", "relatorios"],
  VIEWER: ["dashboard", "mapa", "operacoes", "equipamentos", "telemetria", "eventos", "alertas", "relatorios", "power-bi"],
  OPERADOR_APK: [],
};

const DEFAULT_MODULE_PERMISSIONS: Record<ModuleName, string[]> = {
  dashboard: ["view"],
  mapa: ["view"],
  operacoes: ["view"],
  equipamentos: ["view"],
  operadores: ["view"],
  fazendas: ["view"],
  telemetria: ["view"],
  eventos: ["view"],
  alertas: ["view"],
  sincronizacao: ["view"],
  "configuracoes-op": ["view"],
  relatorios: ["view"],
  "power-bi": ["view"],
  auditoria: ["view"],
  configuracoes: ["view"],
};

const ROLE_ALIASES: Record<string, Role> = {
  admin: "ADMIN_GLOBAL",
  ADMIN: "ADMIN_GLOBAL",
  ADMIN_GLOBAL: "ADMIN_GLOBAL",
};

export function normalizeLoginEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeLoginPassword(password: string) {
  return password.trim();
}

export function normalizeRole(role?: string | null): Role {
  if (!role) return "VIEWER";
  return ROLE_ALIASES[role] || (ROLE_ALIASES[role.toUpperCase()] ?? "VIEWER");
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
  const matchesOfficial = OFFICIAL_PROD_AUTH.credentials.some(
    (credential) => credential.email === normalizedEmail && credential.password === normalizedPassword,
  );

  return matchesEnv || matchesOfficial;
}

export function buildSession(email: string, mode: AuthMode): SessionPayload {
  const seed = USER_SEEDS.find((user) => user.email === normalizeLoginEmail(email));
  const normalizedEmail = normalizeLoginEmail(email);
  const role = normalizeRole(seed?.role);
  return {
    email: normalizedEmail,
    name: seed?.name || buildVisualProfile(normalizedEmail, mode).name,
    role,
    empresa_id: seed?.empresa_id || "SILOOPS",
    usinas: seed?.usinas || [],
    unidades: seed?.unidades || [],
    permissions: seed?.permissions || DEFAULT_MODULE_PERMISSIONS.dashboard,
    expiry: Date.now() + 1000 * 60 * 60 * 8,
    mode,
  };
}

export function buildVisualProfile(email: string, mode: AuthMode): VisualProfile {
  const normalizedEmail = normalizeLoginEmail(email);
  const seed = USER_SEEDS.find((user) => user.email === normalizedEmail);
  return {
    email: normalizedEmail,
    name: seed?.name || normalizedEmail.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    role: normalizeRole(seed?.role),
  };
}

function matchesScope(value: string, allowed: string[]) {
  return allowed.includes("*") || allowed.includes(value);
}

export function isAdminGlobal(profile?: Pick<SessionPayload, "role"> | null) {
  return profile?.role === "ADMIN_GLOBAL";
}

export function normalizeScopeFields(input?: Partial<ScopeFields> | null): ScopeFields {
  return {
    empresa_id: input?.empresa_id || "SILOOPS",
    usina_id: input?.usina_id || "USINA_PADRAO",
    unidade_id: input?.unidade_id || "UNIDADE_PADRAO",
  };
}

export function getSessionFromRequest(request: NextRequest): SessionPayload | null {
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value || null;
  return decodeSessionCookie(raw);
}

export function getScopeFilter(profile: SessionPayload | null): ScopeFilter | null {
  if (!profile || isAdminGlobal(profile)) return null;

  return {
    empresa_id: profile.empresa_id,
    usina_ids: profile.usinas.length ? profile.usinas : [profile.empresa_id],
    unidade_ids: profile.unidades.length ? profile.unidades : [profile.empresa_id],
  };
}

export function applyScopeToUrl(url: string | URL, profile: SessionPayload | null) {
  const target = typeof url === "string" ? new URL(url) : new URL(url.toString());
  const scope = getScopeFilter(profile);
  if (!scope) return target.toString();
  if (scope.empresa_id) target.searchParams.set("empresa_id", scope.empresa_id);
  scope.usina_ids?.forEach((value) => target.searchParams.append("usina_id", value));
  scope.unidade_ids?.forEach((value) => target.searchParams.append("unidade_id", value));
  return target.toString();
}

export function canAccessEmpresa(profile: SessionPayload | null, empresaId: string) {
  if (!profile) return false;
  if (isAdminGlobal(profile)) return true;
  return profile.empresa_id === empresaId;
}

export function canAccessUsina(profile: SessionPayload | null, usinaId: string) {
  if (!profile) return false;
  if (isAdminGlobal(profile)) return true;
  return matchesScope(usinaId, profile.usinas);
}

export function canAccessUnidade(profile: SessionPayload | null, unidadeId: string) {
  if (!profile) return false;
  if (isAdminGlobal(profile)) return true;
  return matchesScope(unidadeId, profile.unidades);
}

export function canAccessModule(profile: SessionPayload | null, moduleName: ModuleName) {
  if (!profile) return false;
  if (isAdminGlobal(profile)) return true;
  const modules = ROLE_MODULE_ACCESS[profile.role] || [];
  return modules === "*" || modules.includes(moduleName);
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

    const session = buildSession(normalizeLoginEmail(parsed.email), parsed.mode);
    return {
      ...session,
      expiry: parsed.expiry,
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
