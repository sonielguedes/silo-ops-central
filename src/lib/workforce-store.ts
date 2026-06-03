import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { canAccessEmpresa, isAdminGlobal, type SessionPayload } from "@/lib/auth";

export const WORKFORCE_STORE_PATH = (process.env.WORKFORCE_STORE_PATH || "/app/data/workforce.json").trim();

export interface CargoRecord {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  empresa_id: string;
  created_at: string;
  updated_at: string;
}

export interface EquipeRecord {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  turno_padrao: string;
  ativo: boolean;
  empresa_id: string;
  created_at: string;
  updated_at: string;
}

export interface OperadorRecord {
  id: string;
  matricula: string;
  nome: string;
  cpf: string;
  telefone: string;
  cargo_id: string;
  equipe_id: string;
  status: "ATIVO" | "INATIVO" | "BLOQUEADO" | "FERIAS";
  habilitacoes: string[];
  observacoes: string;
  empresa_id: string;
  usina_id: string;
  unidade_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkforceStore {
  cargos: CargoRecord[];
  equipes: EquipeRecord[];
  operadores: OperadorRecord[];
  updated_at: string;
}

type WorkforceKind = "cargos" | "equipes" | "operadores";

type InputBase = {
  id?: string;
  ativo?: boolean | string | number;
  empresa_id?: string;
};

export type CargoInput = InputBase & { codigo?: string; nome?: string; descricao?: string };
export type EquipeInput = InputBase & { codigo?: string; nome?: string; descricao?: string; turno_padrao?: string };
export type OperadorInput = InputBase & {
  matricula?: string;
  nome?: string;
  cpf?: string;
  telefone?: string;
  cargo_id?: string;
  equipe_id?: string;
  status?: string;
  habilitacoes?: string[] | string;
  observacoes?: string;
  usina_id?: string;
  unidade_id?: string;
};

const EMPTY_STORE: WorkforceStore = { cargos: [], equipes: [], operadores: [], updated_at: new Date(0).toISOString() };
const SEED: WorkforceStore = {
  cargos: [
    { id: "CARGO_OPERADOR_MAQUINA", codigo: "OPERADOR_MAQUINA", nome: "Operador de Maquina", descricao: "", ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
    { id: "CARGO_MOTORISTA", codigo: "MOTORISTA", nome: "Motorista", descricao: "", ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
    { id: "CARGO_MECANICO", codigo: "MECANICO", nome: "Mecanico", descricao: "", ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
    { id: "CARGO_LIDER_FRENTE", codigo: "LIDER_FRENTE", nome: "Lider de Frente", descricao: "", ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
  ],
  equipes: [
    { id: "EQUIPE_A", codigo: "EQUIPE_A", nome: "Equipe A", descricao: "", turno_padrao: "DIA", ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
    { id: "EQUIPE_B", codigo: "EQUIPE_B", nome: "Equipe B", descricao: "", turno_padrao: "NOITE", ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
    { id: "EQUIPE_C", codigo: "EQUIPE_C", nome: "Equipe C", descricao: "", turno_padrao: "MISTO", ativo: true, empresa_id: "SILOOPS", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
  ],
  operadores: [
    { id: "OP_0001", matricula: "0001", nome: "Operador Demo", cpf: "", telefone: "", cargo_id: "CARGO_OPERADOR_MAQUINA", equipe_id: "EQUIPE_A", status: "ATIVO", habilitacoes: [], observacoes: "", empresa_id: "SILOOPS", usina_id: "USINA_PADRAO", unidade_id: "UNIDADE_PADRAO", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
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

function bool(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const n = value.trim().toLowerCase();
    if (["true", "1", "yes", "sim", "on"].includes(n)) return true;
    if (["false", "0", "no", "nao", "não", "off"].includes(n)) return false;
  }
  return fallback;
}

function normalizeTimestamp(value: unknown, fallback: string) {
  if (typeof value === "string" && Number.isFinite(new Date(value).getTime())) return new Date(value).toISOString();
  return fallback;
}

function listText(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  if (typeof value === "string") return value.split(/[\n,;]/).map((part) => part.trim()).filter(Boolean);
  return [];
}

function normalizeStore(store: Partial<WorkforceStore> | null | undefined): WorkforceStore {
  return {
    cargos: Array.isArray(store?.cargos) ? store!.cargos.map((item) => normalizeCargo(item as unknown as Record<string, unknown>)) : [...SEED.cargos],
    equipes: Array.isArray(store?.equipes) ? store!.equipes.map((item) => normalizeEquipe(item as unknown as Record<string, unknown>)) : [...SEED.equipes],
    operadores: Array.isArray(store?.operadores) ? store!.operadores.map((item) => normalizeOperador(item as unknown as Record<string, unknown>)) : [...SEED.operadores],
    updated_at: normalizeTimestamp(store?.updated_at, nowIso()),
  };
}

function isEmpty(raw: string) {
  const trimmed = raw.trim();
  return !trimmed || trimmed === "{}" || trimmed === "[]";
}

async function ensureFile() {
  await mkdir(dirname(WORKFORCE_STORE_PATH), { recursive: true });
  try {
    const raw = await readFile(WORKFORCE_STORE_PATH, "utf8");
    if (isEmpty(raw)) {
      await writeFile(WORKFORCE_STORE_PATH, `${JSON.stringify(SEED, null, 2)}\n`, "utf8");
    }
  } catch {
    await writeFile(WORKFORCE_STORE_PATH, `${JSON.stringify(SEED, null, 2)}\n`, "utf8");
  }
}

function normalizeEmpresaId(value: unknown) {
  return text(value, "SILOOPS");
}

function normalizeBase<T extends Record<string, unknown>>(raw: T | null | undefined, fallbackId = "") {
  const now = nowIso();
  const base = (raw || {}) as Record<string, unknown>;
  return {
    id: text(base.id, fallbackId || `WF_${randomUUID().slice(0, 8)}`),
    ativo: bool(base.ativo, true),
    empresa_id: normalizeEmpresaId(base.empresa_id),
    created_at: normalizeTimestamp(base.created_at, now),
    updated_at: normalizeTimestamp(base.updated_at, now),
  };
}

function normalizeCargo(raw: Record<string, unknown>): CargoRecord {
  const base = normalizeBase(raw, text(raw.id));
  return {
    ...base,
    codigo: text(raw.codigo).toUpperCase(),
    nome: text(raw.nome),
    descricao: text(raw.descricao),
  };
}

function normalizeEquipe(raw: Record<string, unknown>): EquipeRecord {
  const base = normalizeBase(raw, text(raw.id));
  return {
    ...base,
    codigo: text(raw.codigo).toUpperCase(),
    nome: text(raw.nome),
    descricao: text(raw.descricao),
    turno_padrao: text(raw.turno_padrao, "DIA").toUpperCase(),
  };
}

function normalizeOperador(raw: Record<string, unknown>): OperadorRecord {
  const base = normalizeBase(raw, text(raw.id));
  return {
    ...base,
    matricula: text(raw.matricula).toUpperCase(),
    nome: text(raw.nome),
    cpf: text(raw.cpf),
    telefone: text(raw.telefone),
    cargo_id: text(raw.cargo_id),
    equipe_id: text(raw.equipe_id),
    status: (text(raw.status, "ATIVO").toUpperCase() as OperadorRecord["status"]),
    habilitacoes: listText(raw.habilitacoes),
    observacoes: text(raw.observacoes),
    empresa_id: normalizeEmpresaId(raw.empresa_id),
    usina_id: text(raw.usina_id, "USINA_PADRAO"),
    unidade_id: text(raw.unidade_id, "UNIDADE_PADRAO"),
  };
}

function canRead(session: SessionPayload | null | undefined, empresaId: string) {
  if (!session) return false;
  if (isAdminGlobal(session)) return true;
  return canAccessEmpresa(session, empresaId);
}

function canWrite(session: SessionPayload | null | undefined, empresaId: string) {
  if (!session) return false;
  if (session.role === "ADMIN_GLOBAL") return true;
  if (session.role !== "ADMIN_EMPRESA") return false;
  return canAccessEmpresa(session, empresaId);
}

function scopeCollection<T extends { empresa_id: string }>(items: T[], session: SessionPayload | null | undefined) {
  if (!session || isAdminGlobal(session)) return items;
  return items.filter((item) => canRead(session, item.empresa_id));
}

function kindCollection(store: WorkforceStore, kind: WorkforceKind) {
  return store[kind];
}

function uniqueByEmpresa<T extends { empresa_id: string; codigo?: string; matricula?: string; id: string }>(items: T[], candidate: T, kind: WorkforceKind) {
  return items.find((item) => {
    if (item.id === candidate.id || item.empresa_id !== candidate.empresa_id) return false;
    if (kind === "operadores") return text(item.matricula).toUpperCase() === text(candidate.matricula).toUpperCase();
    return text(item.codigo).toUpperCase() === text(candidate.codigo).toUpperCase();
  });
}

function ensureRequired(kind: WorkforceKind, input: Record<string, unknown>) {
  if (kind === "operadores") {
    if (!text(input.matricula) || !text(input.nome) || !text(input.cargo_id)) throw new Error("campos obrigatorios ausentes");
    return;
  }
  if (!text(input.codigo) || !text(input.nome)) throw new Error("campos obrigatorios ausentes");
}

export async function readWorkforceStore(): Promise<WorkforceStore> {
  await ensureFile();
  try {
    const raw = await readFile(WORKFORCE_STORE_PATH, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) as Partial<WorkforceStore> : null;
    return normalizeStore(parsed);
  } catch {
    return normalizeStore(EMPTY_STORE);
  }
}

export async function writeWorkforceStore(store: WorkforceStore): Promise<WorkforceStore> {
  await ensureFile();
  const next = normalizeStore(store);
  await writeFile(WORKFORCE_STORE_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export async function listWorkforce(kind: WorkforceKind, session: SessionPayload | null | undefined) {
  const store = await readWorkforceStore();
  return scopeCollection(kindCollection(store, kind) as never[], session);
}

export async function getWorkforceById(kind: WorkforceKind, id: string, session?: SessionPayload | null | undefined) {
  const items = await listWorkforce(kind, session || null) as Array<{ id: string }>;
  return items.find((item) => item.id === id) || null;
}

export async function upsertWorkforce(kind: WorkforceKind, input: Record<string, unknown>, session?: SessionPayload | null | undefined) {
  ensureRequired(kind, input);
  const store = await readWorkforceStore();
  const items = kindCollection(store, kind) as unknown as Array<Record<string, unknown> & { id: string; empresa_id: string }>;
  const now = nowIso();
  const existing = items.find((item) => item.id === text(input.id)) || null;
  const empresa_id = normalizeEmpresaId(input.empresa_id ?? existing?.empresa_id ?? session?.empresa_id);
  const merged = {
    ...existing,
    ...input,
    id: text(input.id, existing?.id || `WF_${randomUUID().slice(0, 8)}`),
    empresa_id,
    created_at: existing?.created_at || now,
    updated_at: now,
  };
  if (!canWrite(session || null, empresa_id)) throw new Error("fora do escopo do tenant");

  const candidate = kind === "operadores" ? normalizeOperador(merged) : kind === "equipes" ? normalizeEquipe(merged) : normalizeCargo(merged);
  const conflict = uniqueByEmpresa(items as any, candidate as any, kind);
  if (conflict) throw new Error(kind === "operadores" ? "matricula deve ser unica por empresa" : "codigo deve ser unico por empresa");

  const nextItems = items.filter((item) => item.id !== candidate.id);
  nextItems.push(candidate as never);
  const nextStore = { ...store, [kind]: nextItems, updated_at: now } as WorkforceStore;
  await writeWorkforceStore(nextStore);
  return candidate;
}

export function workforceKindLabel(kind: WorkforceKind) {
  return { cargos: "Cargo", equipes: "Equipe", operadores: "Operador" }[kind];
}
