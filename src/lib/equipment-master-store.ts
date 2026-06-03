import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { canAccessEmpresa, isAdminGlobal, type SessionPayload } from "@/lib/auth";

export const EQUIPMENT_MASTER_STORE_PATH = (process.env.EQUIPMENT_MASTER_STORE_PATH || "/app/data/equipment-master.json").trim();

export type EquipmentMasterStatus = "ATIVO" | "INATIVO" | "MANUTENCAO" | "BLOQUEADO";
export type EquipmentMasterUnitMeasure = "HORA" | "KM" | "HA" | "CICLO";

export interface EquipmentMasterRecord {
  id: string;
  trator_id: string;
  nome: string;
  tipo_equipamento: string;
  modelo: string;
  grupo: string;
  perfil: string;
  placa: string;
  frota: string;
  fabricante: string;
  ano: string;
  status: EquipmentMasterStatus;
  gera_rastro: boolean;
  rotaciona_icone: boolean;
  usa_horimetro: boolean;
  usa_odometro: boolean;
  usa_area: boolean;
  unidade_medida: EquipmentMasterUnitMeasure;
  horimetro_inicial: number | null;
  odometro_inicial: number | null;
  empresa_id: string;
  usina_id: string;
  unidade_id: string;
  created_at: string;
  updated_at: string;
}

export interface EquipmentMasterStore {
  items: EquipmentMasterRecord[];
  updated_at: string;
}

export interface EquipmentMasterInput {
  id?: string;
  trator_id?: string;
  nome?: string;
  tipo_equipamento?: string;
  modelo?: string;
  grupo?: string;
  perfil?: string;
  placa?: string;
  frota?: string;
  fabricante?: string;
  ano?: string | number;
  status?: string;
  gera_rastro?: boolean | string | number;
  rotaciona_icone?: boolean | string | number;
  usa_horimetro?: boolean | string | number;
  usa_odometro?: boolean | string | number;
  usa_area?: boolean | string | number;
  unidade_medida?: string;
  horimetro_inicial?: number | string | null;
  odometro_inicial?: number | string | null;
  empresa_id?: string;
  usina_id?: string;
  unidade_id?: string;
}

export interface EquipmentMasterLookup {
  trator_id: string;
  empresa_id?: string;
  usina_id?: string;
  unidade_id?: string;
}

const STATUS_VALUES: EquipmentMasterStatus[] = ["ATIVO", "INATIVO", "MANUTENCAO", "BLOQUEADO"];
const UNIT_VALUES: EquipmentMasterUnitMeasure[] = ["HORA", "KM", "HA", "CICLO"];
const EMPTY_STORE: EquipmentMasterStore = { items: [], updated_at: new Date(0).toISOString() };
const SEED_ITEMS: EquipmentMasterRecord[] = [
  {
    id: "T01",
    trator_id: "T01",
    nome: "Trator T01",
    tipo_equipamento: "TRATOR",
    modelo: "",
    grupo: "",
    perfil: "",
    placa: "",
    frota: "",
    fabricante: "",
    ano: "",
    status: "ATIVO",
    gera_rastro: true,
    rotaciona_icone: false,
    usa_horimetro: true,
    usa_odometro: false,
    usa_area: false,
    unidade_medida: "HORA",
    horimetro_inicial: 0,
    odometro_inicial: null,
    empresa_id: "SILOOPS",
    usina_id: "USINA_PADRAO",
    unidade_id: "UNIDADE_PADRAO",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "T02",
    trator_id: "T02",
    nome: "Trator T02",
    tipo_equipamento: "TRATOR",
    modelo: "",
    grupo: "",
    perfil: "",
    placa: "",
    frota: "",
    fabricante: "",
    ano: "",
    status: "ATIVO",
    gera_rastro: true,
    rotaciona_icone: false,
    usa_horimetro: true,
    usa_odometro: false,
    usa_area: false,
    unidade_medida: "HORA",
    horimetro_inicial: 0,
    odometro_inicial: null,
    empresa_id: "SILOOPS",
    usina_id: "USINA_PADRAO",
    unidade_id: "UNIDADE_PADRAO",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

let writeQueue: Promise<void> = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toLooseText(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "sim", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "nao", "não", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeStatus(value: unknown): EquipmentMasterStatus {
  const normalized = toText(value).toUpperCase();
  return (STATUS_VALUES.includes(normalized as EquipmentMasterStatus) ? normalized : "ATIVO") as EquipmentMasterStatus;
}

function normalizeUnitMeasure(value: unknown): EquipmentMasterUnitMeasure {
  const normalized = toText(value).toUpperCase();
  return (UNIT_VALUES.includes(normalized as EquipmentMasterUnitMeasure) ? normalized : "HORA") as EquipmentMasterUnitMeasure;
}

function normalizeTimestamp(value: unknown, fallback: string) {
  if (typeof value === "string" && Number.isFinite(new Date(value).getTime())) {
    return new Date(value).toISOString();
  }
  return fallback;
}

function normalizeRecord(raw: Partial<EquipmentMasterRecord>, fallbackIndex = 0): EquipmentMasterRecord {
  const now = nowIso();
  const id = toText(raw.id, "");
  const tratorId = toText(raw.trator_id, "");
  return {
    id: id || tratorId || `EQ_${fallbackIndex + 1}`,
    trator_id: tratorId,
    nome: toText(raw.nome, ""),
    tipo_equipamento: toText(raw.tipo_equipamento, ""),
    modelo: toText(raw.modelo, ""),
    grupo: toText(raw.grupo, ""),
    perfil: toText(raw.perfil, ""),
    placa: toText(raw.placa, ""),
    frota: toText(raw.frota, ""),
    fabricante: toText(raw.fabricante, ""),
    ano: toLooseText(raw.ano, ""),
    status: normalizeStatus(raw.status),
    gera_rastro: toBoolean(raw.gera_rastro, false),
    rotaciona_icone: toBoolean(raw.rotaciona_icone, false),
    usa_horimetro: toBoolean(raw.usa_horimetro, false),
    usa_odometro: toBoolean(raw.usa_odometro, false),
    usa_area: toBoolean(raw.usa_area, false),
    unidade_medida: normalizeUnitMeasure(raw.unidade_medida),
    horimetro_inicial: toFiniteNumber(raw.horimetro_inicial),
    odometro_inicial: toFiniteNumber(raw.odometro_inicial),
    empresa_id: toText(raw.empresa_id, "SILOOPS"),
    usina_id: toText(raw.usina_id, "USINA_PADRAO"),
    unidade_id: toText(raw.unidade_id, "UNIDADE_PADRAO"),
    created_at: normalizeTimestamp(raw.created_at, now),
    updated_at: normalizeTimestamp(raw.updated_at, now),
  };
}

function cloneStore(store: EquipmentMasterStore): EquipmentMasterStore {
  return {
    items: store.items.map((item, index) => normalizeRecord(item, index)),
    updated_at: normalizeTimestamp(store.updated_at, nowIso()),
  };
}

function isEmptyStorePayload(raw: string) {
  return !raw.trim() || raw.trim() === "{}" || raw.trim() === "[]";
}

async function ensureStoreFile() {
  await mkdir(dirname(EQUIPMENT_MASTER_STORE_PATH), { recursive: true });
  try {
    const raw = await readFile(EQUIPMENT_MASTER_STORE_PATH, "utf8");
    if (isEmptyStorePayload(raw)) {
      await writeFile(EQUIPMENT_MASTER_STORE_PATH, `${JSON.stringify({ items: SEED_ITEMS, updated_at: nowIso() }, null, 2)}\n`, "utf8");
    }
  } catch {
    await writeFile(EQUIPMENT_MASTER_STORE_PATH, `${JSON.stringify({ items: SEED_ITEMS, updated_at: nowIso() }, null, 2)}\n`, "utf8");
  }
}

async function withWriteQueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(() => undefined, () => undefined);
  return run;
}

function loadItemsFromRaw(parsed: unknown): EquipmentMasterRecord[] {
  const rawItems = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { items?: unknown } | null)?.items)
      ? (parsed as { items: unknown[] }).items
      : [];
  const normalized = rawItems.map((item, index) => normalizeRecord(item as Partial<EquipmentMasterRecord>, index));
  return normalized.length > 0 ? normalized : [...SEED_ITEMS];
}

function ensureSeedItems(items: EquipmentMasterRecord[]) {
  const known = new Set(items.map((item) => item.trator_id));
  const seeded = [...items];
  for (const seed of SEED_ITEMS) {
    if (!known.has(seed.trator_id)) seeded.push(seed);
  }
  return seeded;
}

function isAdminWriteAllowed(session: SessionPayload | null) {
  return Boolean(session && (session.role === "ADMIN_GLOBAL" || session.role === "ADMIN_EMPRESA"));
}

function matchesAllowList(value: string, allowed: string[] | undefined) {
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes("*") || allowed.includes(value);
}

function canReadItem(session: SessionPayload | null, item: EquipmentMasterRecord) {
  if (!session) return false;
  if (isAdminGlobal(session)) return true;
  if (!canAccessEmpresa(session, item.empresa_id)) return false;
  return matchesAllowList(item.usina_id, session.usinas) && matchesAllowList(item.unidade_id, session.unidades);
}

function canWriteItem(session: SessionPayload | null, item: EquipmentMasterRecord) {
  if (!isAdminWriteAllowed(session)) return false;
  if (!session) return false;
  if (session.role === "ADMIN_GLOBAL") return true;
  return canAccessEmpresa(session, item.empresa_id)
    && matchesAllowList(item.usina_id, session.usinas)
    && matchesAllowList(item.unidade_id, session.unidades);
}

function assertRequiredInput(input: EquipmentMasterInput) {
  const tratorId = toText(input.trator_id, "");
  const nome = toText(input.nome, "");
  const tipo = toText(input.tipo_equipamento, "");
  if (!tratorId || !nome || !tipo) {
    throw new Error("trator_id, nome e tipo_equipamento são obrigatórios");
  }
}

function compositeKey(item: Pick<EquipmentMasterRecord, "empresa_id" | "usina_id" | "unidade_id" | "trator_id">) {
  return [item.empresa_id, item.usina_id, item.unidade_id, item.trator_id].join("|");
}

function normalizeLookupScope(lookup: EquipmentMasterLookup) {
  const scopeValue = (value: string | undefined, fallback: string) => {
    const normalized = toText(value, "");
    if (!normalized || normalized === "*") return fallback;
    return normalized;
  };
  return {
    empresa_id: scopeValue(lookup.empresa_id, "SILOOPS"),
    usina_id: scopeValue(lookup.usina_id, "USINA_PADRAO"),
    unidade_id: scopeValue(lookup.unidade_id, "UNIDADE_PADRAO"),
  };
}

export function findEquipmentMasterRecord(items: EquipmentMasterRecord[], lookup: EquipmentMasterLookup, session?: SessionPayload | null) {
  const target = {
    trator_id: toText(lookup.trator_id, ""),
    ...normalizeLookupScope(lookup),
  };
  const scoped = listAccessibleEquipmentMaster(items, session || null);
  return scoped.find((item) => compositeKey(item) === compositeKey(target)) || scoped.find((item) => item.trator_id === target.trator_id) || null;
}

export function enrichEquipmentStatusWithMaster<T extends Record<string, unknown>>(statusItem: T, master: EquipmentMasterRecord | null) {
  if (!master) {
    return {
      ...statusItem,
      master: typeof (statusItem as { master?: unknown }).master === "boolean" ? (statusItem as { master?: boolean }).master : false,
      cadastro_status: (statusItem as { cadastro_status?: unknown }).cadastro_status || "NAO_CADASTRADO",
    };
  }

  return {
    ...statusItem,
    trator_id: master.trator_id,
    nome: master.nome,
    tipo_equipamento: master.tipo_equipamento,
    frota: master.frota,
    modelo: master.modelo,
    grupo: master.grupo,
    perfil: master.perfil,
    status: master.status,
    empresa_id: master.empresa_id,
    usina_id: master.usina_id,
    unidade_id: master.unidade_id,
    master: true,
    tem_telemetria: true,
    cadastro_status: "CADASTRADO",
  };
}

function assertCompositeUnique(items: EquipmentMasterRecord[], candidate: EquipmentMasterRecord) {
  const conflict = items.find((item) => item.id !== candidate.id && compositeKey(item) === compositeKey(candidate));
  if (conflict) {
    throw new Error("trator_id deve ser único por empresa_id, usina_id e unidade_id");
  }
}

export async function readEquipmentMasterStore(): Promise<EquipmentMasterStore> {
  await ensureStoreFile();
  try {
    const raw = await readFile(EQUIPMENT_MASTER_STORE_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) as unknown : null;
    const items = ensureSeedItems(loadItemsFromRaw(parsed));
    return cloneStore({
      items,
      updated_at: typeof (parsed as { updated_at?: unknown } | null)?.updated_at === "string"
        ? normalizeTimestamp((parsed as { updated_at?: string }).updated_at, nowIso())
        : nowIso(),
    });
  } catch {
    return cloneStore({ items: [...SEED_ITEMS], updated_at: nowIso() });
  }
}

export async function writeEquipmentMasterStore(store: EquipmentMasterStore): Promise<EquipmentMasterStore> {
  await ensureStoreFile();
  const next = cloneStore({
    items: ensureSeedItems(store.items),
    updated_at: store.updated_at,
  });
  await writeFile(EQUIPMENT_MASTER_STORE_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function listAccessibleEquipmentMaster(items: EquipmentMasterRecord[], session: SessionPayload | null) {
  if (!session || isAdminGlobal(session)) return items;
  return items.filter((item) => canReadItem(session, item));
}

export function getEquipmentMasterById(items: EquipmentMasterRecord[], id: string) {
  return items.find((item) => item.id === id || item.trator_id === id) || null;
}

export function normalizeEquipmentMasterInput(input: EquipmentMasterInput, existing?: EquipmentMasterRecord | null, fallbackId?: string): EquipmentMasterRecord {
  const now = nowIso();
  const id = toText(input.id, existing?.id || fallbackId || `EQ_${randomUUID().slice(0, 8)}`);
  return normalizeRecord({
    ...existing,
    ...input,
    id,
    trator_id: toText(input.trator_id, existing?.trator_id || ""),
    nome: toText(input.nome, existing?.nome || ""),
    tipo_equipamento: toText(input.tipo_equipamento, existing?.tipo_equipamento || ""),
    modelo: toText(input.modelo, existing?.modelo || ""),
    grupo: toText(input.grupo, existing?.grupo || ""),
    perfil: toText(input.perfil, existing?.perfil || ""),
    placa: toText(input.placa, existing?.placa || ""),
    frota: toText(input.frota, existing?.frota || ""),
    fabricante: toText(input.fabricante, existing?.fabricante || ""),
    ano: toLooseText(input.ano, existing?.ano || ""),
    status: normalizeStatus(input.status || existing?.status),
    gera_rastro: toBoolean(input.gera_rastro, existing?.gera_rastro),
    rotaciona_icone: toBoolean(input.rotaciona_icone, existing?.rotaciona_icone),
    usa_horimetro: toBoolean(input.usa_horimetro, existing?.usa_horimetro),
    usa_odometro: toBoolean(input.usa_odometro, existing?.usa_odometro),
    usa_area: toBoolean(input.usa_area, existing?.usa_area),
    unidade_medida: normalizeUnitMeasure(input.unidade_medida || existing?.unidade_medida),
    horimetro_inicial: toFiniteNumber(input.horimetro_inicial ?? existing?.horimetro_inicial),
    odometro_inicial: toFiniteNumber(input.odometro_inicial ?? existing?.odometro_inicial),
    empresa_id: toText(input.empresa_id, existing?.empresa_id || "SILOOPS"),
    usina_id: toText(input.usina_id, existing?.usina_id || "USINA_PADRAO"),
    unidade_id: toText(input.unidade_id, existing?.unidade_id || "UNIDADE_PADRAO"),
    created_at: existing?.created_at || now,
    updated_at: now,
  });
}

export async function upsertEquipmentMaster(input: EquipmentMasterInput, session?: SessionPayload | null) {
  assertRequiredInput(input);

  return withWriteQueue(async () => {
    const store = await readEquipmentMasterStore();
    const existing = getEquipmentMasterById(store.items, toText(input.id, ""));
    const candidate = normalizeEquipmentMasterInput(input, existing, input.id);

    if (session && !canWriteItem(session, candidate)) {
      throw new Error("fora do escopo do tenant");
    }

    assertCompositeUnique(store.items, candidate);

    const items = store.items.filter((item) => item.id !== candidate.id && item.trator_id !== candidate.trator_id);
    await writeEquipmentMasterStore({ items: [...items, candidate], updated_at: nowIso() });
    return candidate;
  });
}

export async function deleteEquipmentMaster(id: string, session?: SessionPayload | null) {
  return withWriteQueue(async () => {
    const store = await readEquipmentMasterStore();
    const existing = getEquipmentMasterById(store.items, id);
    if (!existing) return null;
    if (session && !canWriteItem(session, existing)) {
      throw new Error("fora do escopo do tenant");
    }

    const items = store.items.filter((item) => item.id !== existing.id);
    await writeEquipmentMasterStore({ items, updated_at: nowIso() });
    return existing;
  });
}

export function filterEquipmentMasterBySession(items: EquipmentMasterRecord[], session: SessionPayload | null) {
  return listAccessibleEquipmentMaster(items, session);
}
