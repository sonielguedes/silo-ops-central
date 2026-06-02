import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export const TENANT_STORE_PATH = process.env.TENANT_STORE_PATH || "/app/data/admin-tenants.json";

export interface AdminTenantSessionLike {
  role?: string;
  empresa_id?: string;
  usinas?: string[];
  unidades?: string[];
}

export interface AdminTenantEmpresa {
  empresa_id: string;
  nome_empresa: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AdminTenantUsina {
  usina_id: string;
  empresa_id: string;
  nome_usina: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AdminTenantUnidade {
  unidade_id: string;
  usina_id: string;
  nome_unidade: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AdminTenantStore {
  empresas: AdminTenantEmpresa[];
  usinas: AdminTenantUsina[];
  unidades: AdminTenantUnidade[];
}

const EMPTY_STORE: AdminTenantStore = {
  empresas: [],
  usinas: [],
  unidades: [],
};

const STATUS_DEFAULT = "ATIVO";
let writeQueue: Promise<void> = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function cloneStore(store: AdminTenantStore): AdminTenantStore {
  return {
    empresas: [...store.empresas],
    usinas: [...store.usinas],
    unidades: [...store.unidades],
  };
}

async function ensureStoreDirectory() {
  await mkdir(dirname(TENANT_STORE_PATH), { recursive: true });
}

async function ensureStoreFile() {
  await ensureStoreDirectory();
  try {
    await readFile(TENANT_STORE_PATH, "utf8");
  } catch {
    await writeFile(TENANT_STORE_PATH, `${JSON.stringify(EMPTY_STORE, null, 2)}\n`, "utf8");
  }
}

function normalizeStatus(status?: string | null) {
  return (typeof status === "string" && status.trim()) ? status.trim().toUpperCase() : STATUS_DEFAULT;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAdminGlobalProfile(profile: AdminTenantSessionLike | null) {
  return profile?.role === "ADMIN_GLOBAL";
}

async function withWriteQueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(() => undefined, () => undefined);
  return run;
}

export async function readAdminTenantStore(): Promise<AdminTenantStore> {
  await ensureStoreFile();
  try {
    const raw = await readFile(TENANT_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<AdminTenantStore>;
    return {
      empresas: Array.isArray(parsed.empresas) ? parsed.empresas : [],
      usinas: Array.isArray(parsed.usinas) ? parsed.usinas : [],
      unidades: Array.isArray(parsed.unidades) ? parsed.unidades : [],
    };
  } catch {
    return cloneStore(EMPTY_STORE);
  }
}

export async function writeAdminTenantStore(store: AdminTenantStore): Promise<AdminTenantStore> {
  await ensureStoreFile();
  const next = cloneStore(store);
  await writeFile(TENANT_STORE_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function getAccessibleEmpresaIds(profile: AdminTenantSessionLike | null, store: AdminTenantStore) {
  if (!profile) return [];
  if (isAdminGlobalProfile(profile)) return store.empresas.map((item) => item.empresa_id);
  if (profile.role === "ADMIN_EMPRESA") return [profile.empresa_id];
  const usinas = profile.usinas || [];
  const unidades = profile.unidades || [];
  if (profile.role === "GESTOR_USINA") {
    const ids = new Set<string>();
    store.usinas.forEach((item) => {
      if (usinas.includes(item.usina_id)) ids.add(item.empresa_id);
    });
    return [...ids];
  }
  if (profile.role === "GESTOR_UNIDADE") {
    const usinaIds = new Set<string>();
    store.unidades.forEach((item) => {
      if (unidades.includes(item.unidade_id)) usinaIds.add(item.usina_id);
    });
    const ids = new Set<string>();
    store.usinas.forEach((item) => {
      if (usinaIds.has(item.usina_id)) ids.add(item.empresa_id);
    });
    return [...ids];
  }
  return [];
}

export function getAccessibleUsinaIds(profile: AdminTenantSessionLike | null, store: AdminTenantStore) {
  if (!profile) return [];
  if (isAdminGlobalProfile(profile)) return store.usinas.map((item) => item.usina_id);
  if (profile.role === "ADMIN_EMPRESA") {
    return store.usinas.filter((item) => item.empresa_id === profile.empresa_id).map((item) => item.usina_id);
  }
  const usinas = profile.usinas || [];
  const unidades = profile.unidades || [];
  if (profile.role === "GESTOR_USINA") return store.usinas.filter((item) => usinas.includes(item.usina_id)).map((item) => item.usina_id);
  if (profile.role === "GESTOR_UNIDADE") {
    const usinaIds = new Set<string>();
    store.unidades.forEach((item) => {
      if (unidades.includes(item.unidade_id)) usinaIds.add(item.usina_id);
    });
    return [...usinaIds];
  }
  return [];
}

export function getAccessibleUnidadeIds(profile: AdminTenantSessionLike | null, store: AdminTenantStore) {
  if (!profile) return [];
  if (isAdminGlobalProfile(profile)) return store.unidades.map((item) => item.unidade_id);
  if (profile.role === "ADMIN_EMPRESA") {
    const usinaIds = new Set(store.usinas.filter((item) => item.empresa_id === profile.empresa_id).map((item) => item.usina_id));
    return store.unidades.filter((item) => usinaIds.has(item.usina_id)).map((item) => item.unidade_id);
  }
  const usinas = profile.usinas || [];
  const unidades = profile.unidades || [];
  if (profile.role === "GESTOR_USINA") {
    return store.unidades.filter((item) => usinas.includes(item.usina_id)).map((item) => item.unidade_id);
  }
  if (profile.role === "GESTOR_UNIDADE") return store.unidades.filter((item) => unidades.includes(item.unidade_id)).map((item) => item.unidade_id);
  return [];
}

export function canViewTenantAdmin(profile: AdminTenantSessionLike | null) {
  return Boolean(profile && (profile.role === "ADMIN_GLOBAL" || profile.role === "ADMIN_EMPRESA" || profile.role === "GESTOR_USINA" || profile.role === "GESTOR_UNIDADE"));
}

export function canWriteTenantAdmin(profile: AdminTenantSessionLike | null) {
  return Boolean(profile && profile.role === "ADMIN_GLOBAL");
}

export async function upsertEmpresa(input: Partial<AdminTenantEmpresa>) {
  if (!isNonEmptyString(input.empresa_id) || !isNonEmptyString(input.nome_empresa)) {
    throw new Error("empresa_id e nome_empresa são obrigatórios");
  }

  return withWriteQueue(async () => {
    const store = await readAdminTenantStore();
    const now = nowIso();
    const empresaId = (input.empresa_id as string).trim();
    const nomeEmpresa = (input.nome_empresa as string).trim();
    const existing = store.empresas.find((item) => item.empresa_id === empresaId);
    const next: AdminTenantEmpresa = {
      empresa_id: empresaId,
      nome_empresa: nomeEmpresa,
      status: normalizeStatus(input.status),
      created_at: existing?.created_at || now,
      updated_at: now,
    };
    const empresas = store.empresas.filter((item) => item.empresa_id !== next.empresa_id).concat(next);
    await writeAdminTenantStore({ ...store, empresas });
    return next;
  });
}

export async function upsertUsina(input: Partial<AdminTenantUsina>) {
  if (!isNonEmptyString(input.usina_id) || !isNonEmptyString(input.empresa_id) || !isNonEmptyString(input.nome_usina)) {
    throw new Error("usina_id, empresa_id e nome_usina são obrigatórios");
  }

  return withWriteQueue(async () => {
    const store = await readAdminTenantStore();
    const empresaId = (input.empresa_id as string).trim();
    const usinaId = (input.usina_id as string).trim();
    const nomeUsina = (input.nome_usina as string).trim();
    const empresaExists = store.empresas.some((item) => item.empresa_id === empresaId);
    if (!empresaExists) throw new Error("empresa_id inexistente");
    const now = nowIso();
    const existing = store.usinas.find((item) => item.usina_id === usinaId);
    const next: AdminTenantUsina = {
      usina_id: usinaId,
      empresa_id: empresaId,
      nome_usina: nomeUsina,
      status: normalizeStatus(input.status),
      created_at: existing?.created_at || now,
      updated_at: now,
    };
    const usinas = store.usinas.filter((item) => item.usina_id !== next.usina_id).concat(next);
    await writeAdminTenantStore({ ...store, usinas });
    return next;
  });
}

export async function upsertUnidade(input: Partial<AdminTenantUnidade>) {
  if (!isNonEmptyString(input.unidade_id) || !isNonEmptyString(input.usina_id) || !isNonEmptyString(input.nome_unidade)) {
    throw new Error("unidade_id, usina_id e nome_unidade são obrigatórios");
  }

  return withWriteQueue(async () => {
    const store = await readAdminTenantStore();
    const unidadeId = (input.unidade_id as string).trim();
    const usinaId = (input.usina_id as string).trim();
    const nomeUnidade = (input.nome_unidade as string).trim();
    const usinaExists = store.usinas.some((item) => item.usina_id === usinaId);
    if (!usinaExists) throw new Error("usina_id inexistente");
    const now = nowIso();
    const existing = store.unidades.find((item) => item.unidade_id === unidadeId);
    const next: AdminTenantUnidade = {
      unidade_id: unidadeId,
      usina_id: usinaId,
      nome_unidade: nomeUnidade,
      status: normalizeStatus(input.status),
      created_at: existing?.created_at || now,
      updated_at: now,
    };
    const unidades = store.unidades.filter((item) => item.unidade_id !== next.unidade_id).concat(next);
    await writeAdminTenantStore({ ...store, unidades });
    return next;
  });
}

export function makeId(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}
