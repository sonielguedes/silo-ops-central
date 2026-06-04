import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { SessionPayload } from "@/lib/auth";

export type TrailPoint = {
  trator_id: string;
  status_operacional?: string | null;
  timestamp: string;
  latitude: number;
  longitude: number;
  velocidade: number | null;
  status: string | null;
  origem: string | null;
  empresa_id: string;
  usina_id: string;
  unidade_id: string;
  estado_operacional?: "TRABALHANDO" | "PARADO" | "EM_MOVIMENTO" | "SEM_OPERACAO" | "UNKNOWN" | null;
  codigo_parada?: string | null;
  descricao_parada?: string | null;
  operacao_id?: string | null;
  operacao_nome?: string | null;
  evento_status?: string | null;
  motivo_status?: string | null;
};

export interface TrailStore {
  points: TrailPoint[];
  updated_at: string;
}

export interface TrailQuery {
  tratorId: string;
  from?: string | null;
  to?: string | null;
  limit?: number;
  session?: SessionPayload | null;
}

const DEFAULT_PATH = "/app/data/equipment-trail.json";
export const EQUIPMENT_TRAIL_STORE_PATH = (process.env.EQUIPMENT_TRAIL_STORE_PATH || DEFAULT_PATH).trim();

const EMPTY_STORE: TrailStore = { points: [], updated_at: new Date(0).toISOString() };
const MAX_POINTS_TOTAL = 10000;
const MAX_POINTS_PER_TRACTOR = 2000;
let writeQueue: Promise<void> = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function scopeValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function isValidCoordinatePair(lat: number | null, lon: number | null): lat is number {
  return lat !== null && lon !== null && lat !== 0 && lon !== 0 && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function resolveEquipmentCoordinates(item: Record<string, unknown>) {
  const gps = (item.gps && typeof item.gps === "object" ? item.gps : null) as { lat?: unknown; lng?: unknown } | null;
  const location = (item.location && typeof item.location === "object" ? item.location : null) as { lat?: unknown; lng?: unknown } | null;

  const candidates: Array<{ lat: unknown; lon: unknown }> = [
    { lat: item.latitude, lon: item.longitude },
    { lat: item.lat, lon: item.lng },
    { lat: gps?.lat, lon: gps?.lng },
    { lat: location?.lat, lon: location?.lng },
  ];

  for (const candidate of candidates) {
    const lat = toFiniteNumber(candidate.lat);
    const lon = toFiniteNumber(candidate.lon);
    if (isValidCoordinatePair(lat, lon)) {
      return { hasCoordinates: true, latitude: lat, longitude: lon };
    }
  }

  return { hasCoordinates: false, latitude: null, longitude: null };
}

function parseMs(value: string | null | undefined) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function haversineMeters(a: TrailPoint, b: TrailPoint) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

function normalizePoint(point: Partial<TrailPoint>): TrailPoint | null {
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  const timestampMs = parseMs(point.timestamp);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || timestampMs === null) return null;
  const estadoOperacional = typeof point.estado_operacional === "string" && point.estado_operacional.trim()
    ? point.estado_operacional.trim()
    : typeof point.status_operacional === "string" && point.status_operacional.trim()
      ? point.status_operacional.trim()
      : null;
  return {
    trator_id: String(point.trator_id || "").trim(),
    status_operacional: typeof point.status_operacional === "string" && point.status_operacional.trim() ? point.status_operacional.trim() : estadoOperacional,
    timestamp: new Date(timestampMs).toISOString(),
    latitude,
    longitude,
    velocidade: Number.isFinite(Number(point.velocidade)) ? Number(point.velocidade) : null,
    status: typeof point.status === "string" && point.status.trim() ? point.status.trim() : null,
    origem: typeof point.origem === "string" && point.origem.trim() ? point.origem.trim() : null,
    empresa_id: scopeValue(point.empresa_id, "SILOOPS"),
    usina_id: scopeValue(point.usina_id, "USINA_PADRAO"),
    unidade_id: scopeValue(point.unidade_id, "UNIDADE_PADRAO"),
    estado_operacional: textValue(estadoOperacional) as TrailPoint["estado_operacional"],
    codigo_parada: textValue(point.codigo_parada),
    descricao_parada: textValue(point.descricao_parada),
    operacao_id: textValue(point.operacao_id),
    operacao_nome: textValue(point.operacao_nome),
    evento_status: textValue(point.evento_status),
    motivo_status: textValue(point.motivo_status),
  };
}

function normalizeOperationalStatus(value: unknown): TrailPoint["estado_operacional"] | null {
  const normalized = textValue(value)?.toUpperCase() || null;
  if (!normalized) return null;
  if (["TRABALHANDO", "PARADO", "EM_MOVIMENTO", "SEM_OPERACAO", "UNKNOWN"].includes(normalized)) {
    return normalized as TrailPoint["estado_operacional"];
  }
  return null;
}

function hasStopSignal(item: Record<string, unknown>, point?: Partial<TrailPoint> | null) {
  const pool = [
    item.codigo_parada,
    item.descricao_parada,
    item.motivo_parada,
    item.stop_code,
    item.stop_reason,
    item.descricao,
    item.mensagem,
    item.reason,
    item.parada,
    item.parada_descricao,
    item.evento_status,
    item.motivo_status,
    item.status,
    point?.codigo_parada,
    point?.descricao_parada,
    point?.evento_status,
    point?.motivo_status,
    point?.status,
  ];
  return pool.some((value) => {
    const text = textValue(value)?.toUpperCase();
    if (!text) return false;
    return /PARAD|STOP|STOPPED|PAUS|ABAST|MANUT|DESCANS|FALHA/.test(text);
  });
}

function inferOperationalState(item: Record<string, unknown>, point: Partial<TrailPoint>): TrailPoint["estado_operacional"] {
  const explicit = normalizeOperationalStatus(item.estado_operacional ?? item.status_operacional ?? point.estado_operacional ?? point.status_operacional);
  if (explicit) return explicit;

  const velocidade = Number(point.velocidade ?? item.velocidade ?? item.speed ?? 0);
  const operacaoId = textValue(item.operacao_id ?? point.operacao_id);
  const operacaoNome = textValue(item.operacao_nome ?? item.operacao_atual ?? item.operacao ?? point.operacao_nome);
  const stop = hasStopSignal(item, point);
  if (stop) return "PARADO";
  if (velocidade > 5) return "EM_MOVIMENTO";
  if (operacaoId || operacaoNome) return "TRABALHANDO";
  if (!operacaoId && !operacaoNome) return "SEM_OPERACAO";
  return "UNKNOWN";
}

export function buildOperationalTrailFields(item: Record<string, unknown>, point: Partial<TrailPoint>): Pick<TrailPoint, "estado_operacional" | "codigo_parada" | "descricao_parada" | "operacao_id" | "operacao_nome" | "evento_status" | "motivo_status"> {
  const operacaoId = textValue(item.operacao_id ?? point.operacao_id);
  const operacaoNome = textValue(item.operacao_nome ?? item.operacao_atual ?? item.operacao ?? point.operacao_nome);
  const codigoParada = textValue(item.codigo_parada ?? item.stop_code ?? point.codigo_parada);
  const descricaoParada = textValue(item.descricao_parada ?? item.motivo_parada ?? item.stop_reason ?? item.descricao ?? item.mensagem ?? point.descricao_parada);
  const eventoStatus = textValue(item.evento_status ?? item.status ?? item.tipo_evento ?? point.evento_status);
  const motivoStatus = textValue(item.motivo_status ?? item.motivo ?? item.descricao ?? item.mensagem ?? item.reason ?? point.motivo_status);

  return {
    estado_operacional: inferOperationalState(item, point),
    codigo_parada: codigoParada,
    descricao_parada: descricaoParada,
    operacao_id: operacaoId,
    operacao_nome: operacaoNome,
    evento_status: eventoStatus,
    motivo_status: motivoStatus,
  };
}

export function buildTrailPointFromRecord(item: Record<string, unknown>, fallbackTratorId: string, source: string): TrailPoint | null {
  const coords = resolveEquipmentCoordinates(item);
  if (!coords.hasCoordinates || coords.latitude === null || coords.longitude === null) return null;

  const timestampRaw =
    item.timestamp ??
    item.horario ??
    item.created_at ??
    item.createdAt ??
    item.data_hora ??
    item.last_seen ??
    item.updated_at;
  const timestampMs = parseMs(typeof timestampRaw === "string" ? timestampRaw : timestampRaw === undefined || timestampRaw === null ? null : String(timestampRaw));
  if (timestampMs === null) return null;

  const latitude = Number(coords.latitude);
  const longitude = Number(coords.longitude);
  const velocidadeRaw = item.velocidade ?? item.speed ?? item.velocidade_kmh ?? item.velocity;
  const velocidade = velocidadeRaw === undefined || velocidadeRaw === null || velocidadeRaw === ""
    ? null
    : Number.isFinite(Number(velocidadeRaw))
      ? Number(velocidadeRaw)
      : null;
  const status = typeof item.status === "string"
    ? item.status.trim() || null
    : typeof item.estado === "string"
      ? item.estado.trim() || null
      : typeof item.evento === "string"
        ? item.evento.trim() || null
        : null;
  const origem = typeof item.origem === "string"
    ? item.origem.trim() || null
    : typeof item.source === "string"
      ? item.source.trim() || null
      : source;
  const operational = buildOperationalTrailFields(item, {
    trator_id: String(item.trator_id || item.equipamento_id || item.id || fallbackTratorId).trim() || fallbackTratorId,
    timestamp: new Date(timestampMs).toISOString(),
    latitude,
    longitude,
    velocidade,
    status,
    origem,
    empresa_id: scopeValue(item.empresa_id, "SILOOPS"),
    usina_id: scopeValue(item.usina_id, "USINA_PADRAO"),
    unidade_id: scopeValue(item.unidade_id, "UNIDADE_PADRAO"),
  });

  return {
    trator_id: String(item.trator_id || item.equipamento_id || item.id || fallbackTratorId).trim() || fallbackTratorId,
    timestamp: new Date(timestampMs).toISOString(),
    latitude,
    longitude,
    velocidade,
    status,
    origem,
    empresa_id: scopeValue(item.empresa_id, "SILOOPS"),
    usina_id: scopeValue(item.usina_id, "USINA_PADRAO"),
    unidade_id: scopeValue(item.unidade_id, "UNIDADE_PADRAO"),
    ...operational,
  };
}

function dedupeKey(point: TrailPoint) {
  return `${point.trator_id}|${point.timestamp}|${point.latitude}|${point.longitude}|${point.origem || ""}`;
}

function shouldDropJitter(prev: TrailPoint | undefined, next: TrailPoint) {
  if (!prev) return false;
  const prevSpeed = Number(prev.velocidade ?? 0);
  const nextSpeed = Number(next.velocidade ?? 0);
  const prevStatus = (prev.status || "").trim();
  const nextStatus = (next.status || "").trim();
  const prevOperational = (prev.estado_operacional || "").trim();
  const nextOperational = (next.estado_operacional || "").trim();
  const prevStopCode = (prev.codigo_parada || "").trim();
  const nextStopCode = (next.codigo_parada || "").trim();
  const prevOperation = (prev.operacao_id || "").trim();
  const nextOperation = (next.operacao_id || "").trim();
  const distance = haversineMeters(prev, next);
  return distance < 5 && prevStatus === nextStatus && prevOperational === nextOperational && prevStopCode === nextStopCode && prevOperation === nextOperation && prevSpeed <= 1 && nextSpeed <= 1;
}

function trimStore(points: TrailPoint[]) {
  const byTrator = new Map<string, TrailPoint[]>();
  for (const point of points) {
    const list = byTrator.get(point.trator_id) || [];
    list.push(point);
    byTrator.set(point.trator_id, list);
  }

  const trimmed: TrailPoint[] = [];
  for (const [, list] of byTrator) {
    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    trimmed.push(...list.slice(-MAX_POINTS_PER_TRACTOR));
  }

  trimmed.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return trimmed.slice(-MAX_POINTS_TOTAL);
}

async function ensureStoreFile() {
  await mkdir(dirname(EQUIPMENT_TRAIL_STORE_PATH), { recursive: true });
  try {
    await readFile(EQUIPMENT_TRAIL_STORE_PATH, "utf8");
  } catch {
    await writeFile(EQUIPMENT_TRAIL_STORE_PATH, `${JSON.stringify(EMPTY_STORE, null, 2)}\n`, "utf8");
  }
}

async function withWriteQueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(() => undefined, () => undefined);
  return run;
}

export async function readEquipmentTrailStore(): Promise<TrailStore> {
  await ensureStoreFile();
  try {
    const raw = await readFile(EQUIPMENT_TRAIL_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<TrailStore>;
    const points = Array.isArray(parsed.points) ? parsed.points.map((item) => normalizePoint(item as Partial<TrailPoint>)).filter(Boolean) as TrailPoint[] : [];
    return {
      points: trimStore(points),
      updated_at: typeof parsed.updated_at === "string" ? parsed.updated_at : nowIso(),
    };
  } catch {
    return { ...EMPTY_STORE };
  }
}

export async function writeEquipmentTrailStore(store: TrailStore): Promise<TrailStore> {
  await ensureStoreFile();
  const next = { points: trimStore(store.points), updated_at: nowIso() };
  await writeFile(EQUIPMENT_TRAIL_STORE_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export async function appendEquipmentTrailPoints(points: Partial<TrailPoint>[]): Promise<TrailStore> {
  const normalized = points.map((point) => normalizePoint(point)).filter(Boolean) as TrailPoint[];
  if (normalized.length === 0) return readEquipmentTrailStore();

  return withWriteQueue(async () => {
    const store = await readEquipmentTrailStore();
    const merged = [...store.points, ...normalized].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const filtered: TrailPoint[] = [];
    const lastByTractor = new Map<string, TrailPoint>();

    for (const point of merged) {
      const last = lastByTractor.get(point.trator_id);
      if (shouldDropJitter(last, point)) continue;
      filtered.push(point);
      lastByTractor.set(point.trator_id, point);
    }

    const deduped = Array.from(new Map(filtered.map((point) => [dedupeKey(point), point])).values());
    return writeEquipmentTrailStore({ points: deduped, updated_at: nowIso() });
  });
}

export async function queryEquipmentTrailPoints(query: TrailQuery): Promise<TrailPoint[]> {
  const store = await readEquipmentTrailStore();
  const fromMs = parseMs(query.from || undefined);
  const toMs = parseMs(query.to || undefined);
  const allowedEmpresa = query.session?.role === "ADMIN_GLOBAL" ? null : query.session?.empresa_id || null;
  const allowedUsinas = query.session?.role === "ADMIN_GLOBAL" ? null : new Set(query.session?.usinas || []);
  const allowedUnidades = query.session?.role === "ADMIN_GLOBAL" ? null : new Set(query.session?.unidades || []);

  return store.points.filter((point) => {
    if (point.trator_id !== query.tratorId) return false;
    const ts = new Date(point.timestamp).getTime();
    if (!Number.isFinite(ts)) return false;
    if (fromMs !== null && ts < fromMs) return false;
    if (toMs !== null && ts > toMs) return false;
    if (allowedEmpresa && point.empresa_id !== allowedEmpresa) return false;
    if (allowedUsinas && allowedUsinas.size > 0 && !allowedUsinas.has("*") && !allowedUsinas.has(point.usina_id)) return false;
    if (allowedUnidades && allowedUnidades.size > 0 && !allowedUnidades.has("*") && !allowedUnidades.has(point.unidade_id)) return false;
    return true;
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).slice(0, query.limit || MAX_POINTS_PER_TRACTOR);
}

export function makeTrailPointId(prefix = "trail") {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}
