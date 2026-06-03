import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { canAccessEmpresa, isAdminGlobal, type SessionPayload } from "@/lib/auth";

export const EQUIPMENT_CLASSIFICATION_STORE_PATH = (process.env.EQUIPMENT_CLASSIFICATION_STORE_PATH || "/app/data/equipment-classification.json").trim();

export type EquipmentClassificationKind = "tipos" | "modelos" | "grupos" | "perfis" | "estados";

type EntityBase = {
  id: string;
  empresa_id: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type EquipmentTypeRecord = EntityBase & { codigo: string; nome: string; descricao: string };
export type EquipmentModelRecord = EntityBase & { nome: string; fabricante: string; tipo_id: string; descricao: string };
export type EquipmentGroupRecord = EntityBase & { nome: string; descricao: string };
export type EquipmentProfileRecord = EntityBase & { nome: string; descricao: string; capacidades: string[] };
export type EquipmentStateRecord = EntityBase & { codigo: string; nome: string; descricao: string; cor: string; bloqueia_operacao: boolean };

export interface EquipmentClassificationStore {
  tipos: EquipmentTypeRecord[];
  modelos: EquipmentModelRecord[];
  grupos: EquipmentGroupRecord[];
  perfis: EquipmentProfileRecord[];
  estados: EquipmentStateRecord[];
  updated_at: string;
}

type InputBase = {
  id?: string;
  ativo?: boolean | string | number;
  empresa_id?: string;
};

export type EquipmentTypeInput = InputBase & { codigo?: string; nome?: string; descricao?: string };
export type EquipmentModelInput = InputBase & { nome?: string; fabricante?: string; tipo_id?: string; descricao?: string };
export type EquipmentGroupInput = InputBase & { nome?: string; descricao?: string };
export type EquipmentProfileInput = InputBase & { nome?: string; descricao?: string; capacidades?: string[] | string };
export type EquipmentStateInput = InputBase & { codigo?: string; nome?: string; descricao?: string; cor?: string; bloqueia_operacao?: boolean | string | number };

export type EquipmentClassificationInputMap = {
  tipos: EquipmentTypeInput;
  modelos: EquipmentModelInput;
  grupos: EquipmentGroupInput;
  perfis: EquipmentProfileInput;
  estados: EquipmentStateInput;
};

export type EquipmentClassificationRecordMap = {
  tipos: EquipmentTypeRecord;
  modelos: EquipmentModelRecord;
  grupos: EquipmentGroupRecord;
  perfis: EquipmentProfileRecord;
  estados: EquipmentStateRecord;
};

export const EQUIPMENT_CLASSIFICATION_SEED: EquipmentClassificationStore = {
  tipos: [
    { id: "TIPO_TRATOR", codigo: "TRATOR", nome: "Trator", descricao: "Equipamento de tracao", ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
    { id: "TIPO_COLHEDORA", codigo: "COLHEDORA", nome: "Colhedora", descricao: "Colhedora mecanizada", ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
    { id: "TIPO_TRANSBORDO", codigo: "TRANSBORDO", nome: "Transbordo", descricao: "Veiculo de transbordo", ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
    { id: "TIPO_CAMINHAO", codigo: "CAMINHAO", nome: "Caminhao", descricao: "Caminhao operacional", ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
    { id: "TIPO_IMPLEMENTO", codigo: "IMPLEMENTO", nome: "Implemento", descricao: "Implemento acoplado", ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
  ],
  modelos: [],
  grupos: [],
  perfis: [],
  estados: [
    { id: "ESTADO_TRABALHANDO", codigo: "TRABALHANDO", nome: "Trabalhando", descricao: "Executando operacao", cor: "#22c55e", bloqueia_operacao: false, ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
    { id: "ESTADO_PARADO", codigo: "PARADO", nome: "Parado", descricao: "Equipamento sem deslocamento", cor: "#f59e0b", bloqueia_operacao: false, ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
    { id: "ESTADO_PAUSADO", codigo: "PAUSADO", nome: "Pausado", descricao: "Operacao pausada", cor: "#facc15", bloqueia_operacao: false, ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
    { id: "ESTADO_EM_MOVIMENTO", codigo: "EM_MOVIMENTO", nome: "Em movimento", descricao: "Deslocamento ativo", cor: "#3b82f6", bloqueia_operacao: false, ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
    { id: "ESTADO_SEM_OPERACAO", codigo: "SEM_OPERACAO", nome: "Sem operacao", descricao: "Sem jornada ativa", cor: "#94a3b8", bloqueia_operacao: true, ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
    { id: "ESTADO_DESCONHECIDO", codigo: "DESCONHECIDO", nome: "Desconhecido", descricao: "Estado nao identificado", cor: "#8b5cf6", bloqueia_operacao: false, ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
  ],
  updated_at: "2026-01-01T00:00:00.000Z",
};

let writeQueue: Promise<void> = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function bool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "sim", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "nao", "não", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function listText(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  if (typeof value === "string") return value.split(/[\n,;]/).map((part) => part.trim()).filter(Boolean);
  return [];
}

function normalizeEmpresaId(value: unknown, fallback = "SILOOPS") {
  const raw = text(value, "");
  return raw || fallback;
}

function normalizeAtivo(value: unknown, fallback = true) {
  return bool(value, fallback);
}

function normalizeTimestamp(value: unknown, fallback: string) {
  if (typeof value === "string" && Number.isFinite(new Date(value).getTime())) return new Date(value).toISOString();
  return fallback;
}

function ensureStoreShape(store: Partial<EquipmentClassificationStore> | null | undefined): EquipmentClassificationStore {
  return {
    tipos: (Array.isArray(store?.tipos) ? store!.tipos.map((item) => normalizeRecord("tipos", item)) : [...EQUIPMENT_CLASSIFICATION_SEED.tipos]) as EquipmentTypeRecord[],
    modelos: (Array.isArray(store?.modelos) ? store!.modelos.map((item) => normalizeRecord("modelos", item)) : [...EQUIPMENT_CLASSIFICATION_SEED.modelos]) as EquipmentModelRecord[],
    grupos: (Array.isArray(store?.grupos) ? store!.grupos.map((item) => normalizeRecord("grupos", item)) : [...EQUIPMENT_CLASSIFICATION_SEED.grupos]) as EquipmentGroupRecord[],
    perfis: (Array.isArray(store?.perfis) ? store!.perfis.map((item) => normalizeRecord("perfis", item)) : [...EQUIPMENT_CLASSIFICATION_SEED.perfis]) as EquipmentProfileRecord[],
    estados: (Array.isArray(store?.estados) ? store!.estados.map((item) => normalizeRecord("estados", item)) : [...EQUIPMENT_CLASSIFICATION_SEED.estados]) as EquipmentStateRecord[],
    updated_at: normalizeTimestamp(store?.updated_at, nowIso()),
  };
}

function isEmpty(raw: string) {
  const trimmed = raw.trim();
  return !trimmed || trimmed === "{}" || trimmed === "[]";
}

async function ensureStoreFile() {
  await mkdir(dirname(EQUIPMENT_CLASSIFICATION_STORE_PATH), { recursive: true });
  try {
    const raw = await readFile(EQUIPMENT_CLASSIFICATION_STORE_PATH, "utf8");
    if (isEmpty(raw)) {
      await writeFile(EQUIPMENT_CLASSIFICATION_STORE_PATH, `${JSON.stringify(EQUIPMENT_CLASSIFICATION_SEED, null, 2)}\n`, "utf8");
    }
  } catch {
    await writeFile(EQUIPMENT_CLASSIFICATION_STORE_PATH, `${JSON.stringify(EQUIPMENT_CLASSIFICATION_SEED, null, 2)}\n`, "utf8");
  }
}

function kindCollection(store: EquipmentClassificationStore, kind: EquipmentClassificationKind) {
  return store[kind];
}

function cloneStore(store: EquipmentClassificationStore): EquipmentClassificationStore {
  return ensureStoreShape(store);
}

function currentTenant(session: SessionPayload | null | undefined) {
  return {
    empresa_id: session?.empresa_id || "SILOOPS",
  };
}

function canRead(session: SessionPayload | null | undefined, empresaId: string) {
  if (!session) return false;
  if (isAdminGlobal(session)) return true;
  return canAccessEmpresa(session, empresaId);
}

function canWrite(session: SessionPayload | null | undefined, empresaId: string) {
  if (!session) return false;
  if (session.role !== "ADMIN_GLOBAL" && session.role !== "ADMIN_EMPRESA") return false;
  if (session.role === "ADMIN_GLOBAL") return true;
  return canAccessEmpresa(session, empresaId);
}

function normalizeId(value: unknown, fallback = "") {
  return text(value, fallback || `EQ_${randomUUID().slice(0, 8)}`);
}

function normalizeRecord(kind: EquipmentClassificationKind, raw: Partial<unknown> | Record<string, unknown>): EquipmentClassificationRecordMap[typeof kind] {
  const now = nowIso();
  const base = raw as Record<string, unknown>;
  const empresa_id = normalizeEmpresaId(base.empresa_id);
  const common = {
    id: normalizeId(base.id, base.codigo as string | undefined),
    empresa_id,
    ativo: normalizeAtivo(base.ativo, true),
    created_at: normalizeTimestamp(base.created_at, now),
    updated_at: normalizeTimestamp(base.updated_at, now),
  };

  switch (kind) {
    case "tipos":
      return {
        ...common,
        codigo: text(base.codigo).toUpperCase(),
        nome: text(base.nome),
        descricao: text(base.descricao),
      } as EquipmentClassificationRecordMap[typeof kind];
    case "modelos":
      return {
        ...common,
        nome: text(base.nome),
        fabricante: text(base.fabricante),
        tipo_id: text(base.tipo_id),
        descricao: text(base.descricao),
      } as EquipmentClassificationRecordMap[typeof kind];
    case "grupos":
      return {
        ...common,
        nome: text(base.nome),
        descricao: text(base.descricao),
      } as EquipmentClassificationRecordMap[typeof kind];
    case "perfis":
      return {
        ...common,
        nome: text(base.nome),
        descricao: text(base.descricao),
        capacidades: listText(base.capacidades),
      } as EquipmentClassificationRecordMap[typeof kind];
    case "estados":
      return {
        ...common,
        codigo: text(base.codigo).toUpperCase(),
        nome: text(base.nome),
        descricao: text(base.descricao),
        cor: text(base.cor, "#94a3b8"),
        bloqueia_operacao: bool(base.bloqueia_operacao, false),
      } as EquipmentClassificationRecordMap[typeof kind];
  }
}

function matchesUnique(kind: EquipmentClassificationKind, a: EquipmentClassificationRecordMap[typeof kind], b: EquipmentClassificationRecordMap[typeof kind]) {
  const sameCompany = a.empresa_id === b.empresa_id;
  if (!sameCompany) return false;
  switch (kind) {
    case "tipos":
      return (a as EquipmentTypeRecord).codigo.toUpperCase() === (b as EquipmentTypeRecord).codigo.toUpperCase() || a.nome.toLowerCase() === b.nome.toLowerCase();
    case "modelos":
    case "grupos":
    case "perfis":
      return a.nome.toLowerCase() === b.nome.toLowerCase();
    case "estados":
      return (a as EquipmentStateRecord).codigo.toUpperCase() === (b as EquipmentStateRecord).codigo.toUpperCase() || a.nome.toLowerCase() === b.nome.toLowerCase();
  }
}

function validateRequired(kind: EquipmentClassificationKind, input: Record<string, unknown>) {
  const required = {
    tipos: [text(input.codigo), text(input.nome)],
    modelos: [text(input.nome)],
    grupos: [text(input.nome)],
    perfis: [text(input.nome)],
    estados: [text(input.codigo), text(input.nome)],
  }[kind];
  if (required.some((value) => !value)) {
    throw new Error("campos obrigatorios ausentes");
  }
}

export async function readEquipmentClassificationStore(): Promise<EquipmentClassificationStore> {
  await ensureStoreFile();
  try {
    const raw = await readFile(EQUIPMENT_CLASSIFICATION_STORE_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) as Partial<EquipmentClassificationStore> : null;
    return cloneStore(ensureStoreShape(parsed));
  } catch {
    return cloneStore(EQUIPMENT_CLASSIFICATION_SEED);
  }
}

export async function writeEquipmentClassificationStore(store: EquipmentClassificationStore): Promise<EquipmentClassificationStore> {
  await ensureStoreFile();
  const next = cloneStore(store);
  await writeFile(EQUIPMENT_CLASSIFICATION_STORE_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export async function listEquipmentClassificationByKind<K extends EquipmentClassificationKind>(kind: K, session: SessionPayload | null | undefined) {
  const store = await readEquipmentClassificationStore();
  const items = kindCollection(store, kind) as EquipmentClassificationRecordMap[K][];
  if (!session || isAdminGlobal(session)) return items;
  return items.filter((item) => canRead(session, item.empresa_id));
}

export async function getEquipmentClassificationById<K extends EquipmentClassificationKind>(kind: K, id: string, session?: SessionPayload | null | undefined) {
  const items = await listEquipmentClassificationByKind(kind, session || null);
  return items.find((item) => item.id === id) || null;
}

export async function upsertEquipmentClassification<K extends EquipmentClassificationKind>(
  kind: K,
  input: EquipmentClassificationInputMap[K],
  session?: SessionPayload | null | undefined,
) {
  validateRequired(kind, input as Record<string, unknown>);
  const store = await readEquipmentClassificationStore();
  const now = nowIso();
  const existing = (kindCollection(store, kind) as EquipmentClassificationRecordMap[K][]).find((item) => item.id === text((input as { id?: unknown }).id)) || null;
  const mergedEmpresa = normalizeEmpresaId((input as { empresa_id?: unknown }).empresa_id, existing?.empresa_id || currentTenant(session).empresa_id);
  const candidate = normalizeRecord(kind, {
    ...existing,
    ...input,
    empresa_id: mergedEmpresa,
    id: normalizeId((input as { id?: unknown }).id, existing?.id || ""),
    created_at: existing?.created_at || now,
    updated_at: now,
  });

  if (!canWrite(session || null, candidate.empresa_id)) {
    throw new Error("fora do escopo do tenant");
  }

  const collection = kindCollection(store, kind) as EquipmentClassificationRecordMap[K][];
  const conflict = collection.find((item) => item.id !== candidate.id && matchesUnique(kind, item, candidate));
  if (conflict) {
    throw new Error("codigo ou nome deve ser unico por empresa");
  }

  const nextCollection = collection.filter((item) => item.id !== candidate.id) as EquipmentClassificationRecordMap[K][];
  nextCollection.push(candidate as EquipmentClassificationRecordMap[K]);
  const nextStore = {
    ...store,
    [kind]: nextCollection,
    updated_at: now,
  } as EquipmentClassificationStore;
  await writeEquipmentClassificationStore(nextStore);
  return candidate;
}

export function classificationKindLabel(kind: EquipmentClassificationKind) {
  return {
    tipos: "Tipo",
    modelos: "Modelo",
    grupos: "Grupo",
    perfis: "Perfil",
    estados: "Estado operacional",
  }[kind];
}

export function classificationKindEndpoint(kind: EquipmentClassificationKind) {
  return `/api/admin/equipamentos/${kind}`;
}
