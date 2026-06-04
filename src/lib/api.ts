import type { EventoOperacional } from "@/lib/dashboard-types";

const API = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");
const SHOULD_LOG_API_WARNINGS = process.env.NODE_ENV !== "production";

export interface HealthResponse {
  status: string;
  timestamp: string;
  upstream_status?: number | null;
  latency_ms?: number | null;
  error?: string;
  upstream?: unknown;
}
export interface Equipamento {
  trator_id: string; status: string; presence: string;
  last_seen: string; bateria: number | null; latitude: number | null;
  longitude: number | null; velocidade: number | null; app_version: string | null;
  nome?: string | null;
  modelo?: string | null;
  descricao?: string | null;
  tipo_equipamento?: string | null;
  grupo?: string | null;
  perfil?: string | null;
  frota?: string | null;
  cadastro_status?: "CADASTRADO" | "SEM_TELEMETRIA" | "NAO_CADASTRADO" | "DESCONHECIDO" | null;
  tem_telemetria?: boolean | null;
  master?: boolean | null;
  empresa_id?: string | null;
  usina_id?: string | null;
  unidade_id?: string | null;
  estado_operacional?: string | null;
  status_operacional?: string | null;
  operacao_id?: string | null;
  operacao_nome?: string | null;
  descricao_operacao?: string | null;
  codigo_parada?: string | null;
  descricao_parada?: string | null;
  operador?: string | null;
  comunicacao?: string | null;
  fazenda?: string | null;
  frente?: string | null;
  talhao?: string | null;
  zona?: string | null;
  updated_at?: string | null;
  evento_status?: string | null;
  motivo_status?: string | null;
  gps_source?: string | null;
  lat?: number | null;
  lng?: number | null;
  gps?: { lat?: number | null; lng?: number | null } | null;
  location?: { lat?: number | null; lng?: number | null } | null;
  coord_source?: string | null;
  coord_reason?: string | null;
  has_coordinates?: boolean | null;
}
export interface OperacaoAtiva {
  operacao_id: string; trator_id: string; operador_id: string | null;
  nome_operador: string | null; status: string; inicio: string;
  duracao_segundos: number | null; velocidade_atual: number | null;
  bateria: number | null; last_seen: string | null;
  fazenda?: string | null;
  talhao?: string | null;
  operacao_atual?: string | null;
  horimetro_inicial?: number | null;
}

export interface GpsPoint {
  latitude: number;
  longitude: number;
  velocidade?: number | null;
  timestamp: string;
  status?: string | null;
  origem?: string | null;
  empresa_id?: string | null;
  usina_id?: string | null;
  unidade_id?: string | null;
}

export interface OutboxItem {
  id: string;
  recurso: string;
  payload: string;
  tentativas: number;
  status: "PENDENTE" | "ENVIADO" | "ERRO";
  ultimo_erro?: string;
  timestamp: string;
}

export interface EquipmentDetails {
  trator_id: string;
  nome_equipamento: string | null;
  tipo_equipamento: string;
  frota?: string | null;
  cadastro_status?: "CADASTRADO" | "SEM_TELEMETRIA" | "NAO_CADASTRADO" | "DESCONHECIDO" | null;
  tem_telemetria?: boolean | null;
  presence: string | null;
  status: string | null;
  estado_operacional: string | null;
  status_operacional: string | null;
  operacao_id: string | null;
  operacao_nome: string | null;
  descricao_operacao: string | null;
  codigo_parada: string | null;
  descricao_parada: string | null;
  velocidade: number | null;
  operador: string | null;
  comunicacao: string | null;
  latitude: number | null;
  longitude: number | null;
  bateria: number | null;
  fazenda: string | null;
  frente: string | null;
  talhao: string | null;
  zona: string | null;
  updated_at: string | null;
  evento_status: string | null;
  motivo_status: string | null;
  /** Operação ativa atual — somente se jornada/operação válida e equipamento online/instável */
  operacao_atual: string | null;
  /** Última operação/evento conhecido, mesmo se equipamento offline */
  ultima_operacao_conhecida: string | null;
  /** Texto curto para UI: "Online trabalhando", "Offline — última operação: X" */
  status_resumo: string | null;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

type EquipmentCoordinateSource = "latitude/longitude" | "lat/lng" | "gps.lat/gps.lng" | "location.lat/location.lng" | "missing" | "invalid";

export interface EquipmentCoordinateInfo {
  latitude: number | null;
  longitude: number | null;
  source: EquipmentCoordinateSource;
  reason: string;
  hasCoordinates: boolean;
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function inLatitudeRange(value: number): boolean {
  return value >= -90 && value <= 90;
}

function inLongitudeRange(value: number): boolean {
  return value >= -180 && value <= 180;
}

function isValidCoordinatePair(lat: number | null, lon: number | null): lat is number {
  return lat !== null && lon !== null && lat !== 0 && lon !== 0 && inLatitudeRange(lat) && inLongitudeRange(lon);
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasText(value: unknown): boolean {
  return textValue(value).length > 0;
}

function mergeDefinedValues<T extends Record<string, unknown>>(base: T, overlay: T): T {
  const merged = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    if (value !== undefined && value !== null && value !== "") {
      merged[key as keyof T] = value as T[keyof T];
    }
  }
  return merged;
}

function scoreMasterShape(item: Record<string, unknown>): number {
  return [
    "nome",
    "modelo",
    "descricao",
    "tipo_equipamento",
    "grupo",
    "perfil",
    "marca",
    "frota",
  ].reduce((score, key) => score + (hasText(item[key]) ? 1 : 0), 0);
}

function scoreTelemetryShape(item: Record<string, unknown>): number {
  const coords = resolveEquipmentCoordinates(item);
  return [
    "last_seen",
    "updated_at",
    "timestamp",
    "presence",
    "estado_operacional",
    "operacao_id",
    "operacao_nome",
    "codigo_parada",
    "descricao_parada",
    "bateria",
    "velocidade",
    "app_version",
  ].reduce((score, key) => score + (hasText(item[key]) || item[key] !== undefined && item[key] !== null ? 1 : 0), 0) + (coords.hasCoordinates ? 2 : 0);
}

function extractEquipmentRecords(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (!payload || typeof payload !== "object") return [];

  const source = payload as Record<string, unknown>;
  const keys = ["equipamentos", "master", "cadastros", "cadastro", "status", "telemetria", "items", "data", "rows", "registros", "results"];
  const collected: Record<string, unknown>[] = [];

  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      collected.push(...(value as Record<string, unknown>[]));
    }
  }

  if (collected.length > 0) return collected;

  return Object.values(source).flatMap((value) => extractEquipmentRecords(value));
}

export function resolveEquipmentCoordinates(item: Record<string, unknown>): EquipmentCoordinateInfo {
  const gps = (item.gps && typeof item.gps === "object" ? item.gps : null) as { lat?: unknown; lng?: unknown } | null;
  const location = (item.location && typeof item.location === "object" ? item.location : null) as { lat?: unknown; lng?: unknown } | null;

  const candidates: Array<{ source: EquipmentCoordinateSource; lat: unknown; lon: unknown }> = [
    { source: "latitude/longitude", lat: item.latitude, lon: item.longitude },
    { source: "lat/lng", lat: item.lat, lon: item.lng },
    { source: "gps.lat/gps.lng", lat: gps?.lat, lon: gps?.lng },
    { source: "location.lat/location.lng", lat: location?.lat, lon: location?.lng },
  ];

  for (const candidate of candidates) {
    const lat = toFiniteNumber(candidate.lat);
    const lon = toFiniteNumber(candidate.lon);
    if (isValidCoordinatePair(lat, lon)) {
      return {
        latitude: lat,
        longitude: lon,
        source: candidate.source,
        reason: "ok",
        hasCoordinates: true,
      };
    }
  }

  const hasAnyValue = candidates.some(candidate => candidate.lat !== undefined || candidate.lon !== undefined);
  return {
    latitude: null,
    longitude: null,
    source: hasAnyValue ? "invalid" : "missing",
    reason: hasAnyValue ? "Coordenada inválida" : "GPS ausente/desligado",
    hasCoordinates: false,
  };
}

export function hasValidEquipmentCoordinates(item: Record<string, unknown>): boolean {
  return resolveEquipmentCoordinates(item).hasCoordinates;
}

export function normalizeEquipment(item: Record<string, unknown>): Equipamento {
  const coords = resolveEquipmentCoordinates(item);
  const tratorId = String(item.trator_id ?? item.id ?? item.equipamento_id ?? item.nome ?? "");
  const cadastroStatus = typeof item.cadastro_status === "string" && item.cadastro_status.trim()
    ? item.cadastro_status.trim().toUpperCase() as Equipamento["cadastro_status"]
    : null;
  const status = String(
    item.status
    ?? item.operacao_atual
    ?? item.operacao
    ?? (cadastroStatus === "NAO_CADASTRADO" ? "Não cadastrado" : "UNKNOWN"),
  );
  const presence = String(item.presence ?? item.presenca ?? item.presenca_operacional ?? item.status_presenca ?? "OFFLINE");
  const lastSeen = String(item.last_seen ?? item.timestamp ?? item.updated_at ?? item.ultima_atualizacao ?? new Date(0).toISOString());

  return {
    trator_id: tratorId,
    status,
    presence,
    last_seen: lastSeen,
    bateria: toFiniteNumber(item.bateria ?? item.battery ?? item.battery_level),
    latitude: coords.latitude,
    longitude: coords.longitude,
    velocidade: toFiniteNumber(item.velocidade ?? item.speed),
    app_version: item.app_version ? String(item.app_version) : null,
    nome: hasText(item.nome) ? String(item.nome) : null,
    modelo: hasText(item.modelo) ? String(item.modelo) : null,
    descricao: hasText(item.descricao) ? String(item.descricao) : null,
    tipo_equipamento: hasText(item.tipo_equipamento) ? String(item.tipo_equipamento) : null,
    frota: hasText(item.frota) ? String(item.frota) : null,
    cadastro_status: cadastroStatus,
    tem_telemetria: typeof item.tem_telemetria === "boolean" ? item.tem_telemetria : (cadastroStatus ? cadastroStatus === "CADASTRADO" : null),
    master: typeof item.master === "boolean" ? item.master : (cadastroStatus ? cadastroStatus !== "NAO_CADASTRADO" : null),
    gps_source: item.gps_source ? String(item.gps_source) : null,
    lat: coords.latitude,
    lng: coords.longitude,
    gps: coords.hasCoordinates ? { lat: coords.latitude, lng: coords.longitude } : null,
    location: coords.hasCoordinates ? { lat: coords.latitude, lng: coords.longitude } : null,
    coord_source: coords.source,
    coord_reason: coords.reason,
    has_coordinates: coords.hasCoordinates,
  };
}

export function normalizeEquipmentList(data: unknown): Equipamento[] {
  const records = extractEquipmentRecords(data);
  if (records.length === 0) return [];

  const groups = new Map<string, { firstIndex: number; master: Record<string, unknown> | null; live: Record<string, unknown> | null; items: Record<string, unknown>[] }>();

  records.forEach((item, index) => {
    const tratorId = String(item.trator_id ?? item.id ?? item.equipamento_id ?? item.nome ?? "").trim();
    const key = tratorId || `__row_${index}`;
    const group = groups.get(key) || { firstIndex: index, master: null, live: null, items: [] };
    if (!groups.has(key)) groups.set(key, group);
    group.items.push(item);

    const masterScore = scoreMasterShape(item);
    const telemetryScore = scoreTelemetryShape(item);
    if (masterScore >= telemetryScore) {
      group.master = group.master ? (scoreMasterShape(group.master) >= masterScore ? group.master : item) : item;
    }
    if (telemetryScore >= masterScore) {
      group.live = group.live ? (scoreTelemetryShape(group.live) >= telemetryScore ? group.live : item) : item;
    }
  });

  return [...groups.values()]
    .sort((a, b) => a.firstIndex - b.firstIndex)
    .map((group) => {
      const base = group.master || group.live || group.items[0] || {};
      const merged = group.master && group.live && group.master !== group.live
        ? mergeDefinedValues(group.master, group.live)
        : { ...base };
      const hasMaster = scoreMasterShape(group.master || merged) > 0;
      const hasTelemetry = scoreTelemetryShape(group.live || merged) > 0;
      const cadastroStatus: NonNullable<Equipamento["cadastro_status"]> = hasMaster
        ? "CADASTRADO"
        : (hasTelemetry ? "NAO_CADASTRADO" : "DESCONHECIDO");

      return normalizeEquipment({
        ...merged,
        cadastro_status: cadastroStatus,
        tem_telemetria: hasTelemetry,
        master: hasMaster,
        status: hasTelemetry
          ? (merged.status ?? (cadastroStatus === "NAO_CADASTRADO" ? "Não cadastrado" : "UNKNOWN"))
          : "OFFLINE",
      });
    });
}

export function mergeEquipmentInventory(masterData: unknown, statusData: unknown): Equipamento[] {
  const masterList = normalizeEquipmentList(masterData);
  const statusList = normalizeEquipmentList(statusData);
  const byId = new Map<string, Equipamento>();
  const emptySeen = new Date(0).toISOString();

  // Process status first, then master to let master overwrite metadata
  statusList.forEach((item) => {
    const key = item.trator_id.trim();
    if (key) byId.set(key, item);
  });

  masterList.forEach((masterItem) => {
    const key = masterItem.trator_id.trim();
    if (!key) return;
    const existing = byId.get(key);

    if (!existing) {
      byId.set(key, masterItem);
      return;
    }

    // Merge: Master metadata should overwrite Status metadata
    const merged = mergeDefinedValues(existing as unknown as Record<string, unknown>, masterItem as unknown as Record<string, unknown>);

    const hasMaster = true;
    const hasTelemetry = Boolean(
      existing.tem_telemetria
      || existing.last_seen !== emptySeen
      || existing.has_coordinates
    );
    const cadastroStatus: NonNullable<Equipamento["cadastro_status"]> = existing.cadastro_status === "CADASTRADO" || masterItem.cadastro_status === "CADASTRADO"
      ? "CADASTRADO"
      : (hasTelemetry ? "NAO_CADASTRADO" : "DESCONHECIDO");

    byId.set(key, normalizeEquipment({
      ...merged,
      cadastro_status: cadastroStatus,
      master: hasMaster,
      tem_telemetria: hasTelemetry,
      status: existing.status ?? merged.status ?? (hasTelemetry ? "UNKNOWN" : "OFFLINE"),
    }));
  });

  return [...byId.values()];
}

export async function fetchResult<T>(path: string): Promise<ApiResult<T>> {
  let baseUrl = ""; // Use relative proxies by default on client-side to avoid CORS
  
  if (typeof window !== "undefined") {
    if ((process.env.NEXT_PUBLIC_APP_ENV || "prod").toLowerCase() !== "demo") {
      const saved = localStorage.getItem("sil_api_base_url");
      // If the user entered a custom IP that isn't the production VPS, allow direct client fetch
      if (saved && !saved.includes("localhost:3000")) {
        baseUrl = saved.trim().replace(/\/$/, "");
      }
    }
  } else {
    baseUrl = API;
  }

  // Map only endpoints whose public backend path differs from the local proxy.
  let finalPath = path;
  if (!baseUrl) {
    if (path === "/health") {
      finalPath = "/api/health";
    }
  }

  const url = `${baseUrl}${finalPath}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      const errorMsg = `HTTP ${res.status} em ${finalPath}`;
      if (SHOULD_LOG_API_WARNINGS) console.warn(`[SIL] API Warning: ${errorMsg}`);
      if (finalPath.startsWith("/api/eventos")) {
        return { ok: true, data: [] as unknown as T };
      }
      if (finalPath === "/api/equipamentos/status") {
        return { ok: true, data: [] as unknown as T };
      }
      return { ok: false, error: errorMsg };
    }

    const text = await res.text();
    if (!text || text.trim().length === 0) {
      return { ok: true, data: [] as unknown as T };
    }

    try {
      const data = JSON.parse(text);
      if (finalPath.startsWith("/api/eventos") && data && !Array.isArray(data) && Array.isArray((data as { eventos?: unknown[] }).eventos)) {
        return { ok: true, data: (data as { eventos: T }).eventos };
      }
      if (finalPath === "/api/equipamentos/status") {
        return { ok: true, data: normalizeEquipmentList(data) as unknown as T };
      }
      return { ok: true, data: data as T };
    } catch (parseErr) {
      // Se não for JSON, pode ser um erro HTML do servidor
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
         if (SHOULD_LOG_API_WARNINGS) console.warn(`[SIL] API returned HTML instead of JSON from ${finalPath}`);
         if (finalPath === "/api/equipamentos/status") {
           return { ok: true, data: [] as unknown as T };
         }
         return { ok: false, error: "Servidor retornou erro (HTML)" };
      }
      if (SHOULD_LOG_API_WARNINGS) console.warn(`[SIL] JSON Parse Error em ${finalPath}`, parseErr);
      return { ok: false, error: "Erro no formato dos dados" };
    }
  } catch (err) {
    const errorName = err instanceof Error ? err.name : "UnknownError";
    const errorMessage = err instanceof Error ? err.message : String(err);

    if (errorName === "TimeoutError") {
      if (SHOULD_LOG_API_WARNINGS) console.warn(`[SIL] Timeout 10s em ${finalPath}`);
      if (finalPath === "/api/equipamentos/status") {
        return { ok: true, data: [] as unknown as T };
      }
      return { ok: false, error: "Tempo esgotado (10s)" };
    }

    // "Failed to fetch" geralmente é rede ou CORS
    if (SHOULD_LOG_API_WARNINGS) console.warn(`[SIL] Fetch suppressed em ${finalPath}: ${errorMessage}`);
    if (finalPath === "/api/equipamentos/status") {
      return { ok: true, data: [] as unknown as T };
    }
    return { ok: false, error: "Conexão indisponível" };
  }
}

export const api = {
  health: () => fetchResult<HealthResponse>("/health"),
  // Legacy contract marker: equipamentos: () => fetchResult<Equipamento[]>("/api/equipamentos/status")
  equipamentos: async (): Promise<ApiResult<Equipamento[]>> => {
    const [masterRes, statusRes] = await Promise.all([
      fetchResult<unknown>("/api/admin/equipamentos"),
      fetchResult<unknown>("/api/equipamentos/status"),
    ]);

    const masterList = masterRes.ok ? normalizeEquipmentList(masterRes.data) : [];
    const statusList = statusRes.ok ? normalizeEquipmentList(statusRes.data) : [];
    const merged = mergeEquipmentInventory(masterList, statusList);

    if (merged.length > 0) {
      return { ok: true, data: merged };
    }
    if (masterRes.ok) {
      return { ok: true, data: masterList };
    }
    if (statusRes.ok) {
      return { ok: true, data: statusList };
    }

    return { ok: false, error: masterRes.error || statusRes.error || "Conexão indisponível" };
  },
  operacoesAtivas: () => fetchResult<OperacaoAtiva[]>("/api/operacoes/ativas"),
  eventosRecentes: () => fetchResult<EventoOperacional[]>("/api/eventos/recentes"),
  rastro: (tratorId: string, limit = 500) => fetchResult<GpsPoint[]>(`/api/equipamentos/${tratorId}/rastro?limit=${limit}`),
  equipamentoDetalhes: (tratorId: string) => fetchResult<EquipmentDetails>(`/api/equipamentos/${tratorId}/detalhes`),
  outbox: () => fetchResult<OutboxItem[]>("/api/outbox/queue"),
};

export type PresenceStatus = "ONLINE" | "INSTAVEL" | "OFFLINE";
export interface PresenceInfo {
  label: PresenceStatus;
  color: string;
}
export type OperationalPresenceStatus = "ONLINE" | "INSTAVEL" | "OFFLINE" | "SEM SINAL";
export interface OperationalPresenceInfo {
  label: OperationalPresenceStatus;
  color: string;
}
export function getPresence(raw: string | null | undefined): PresenceStatus {
  const v = (raw || "").toUpperCase().trim();
  if (v === "ONLINE") return "ONLINE";
  if (v.startsWith("INST")) return "INSTAVEL";
  return "OFFLINE";
}

export function getDynamicPresence(lastSeenIso: string | null | undefined): PresenceStatus {
  if (!lastSeenIso) return "OFFLINE";
  const diff = (Date.now() - new Date(lastSeenIso).getTime()) / 1000;
  if (diff <= 30) return "ONLINE";
  if (diff <= 90) return "INSTAVEL";
  return "OFFLINE";
}

export function getPresenceInfo(lastSeenIso: string | null | undefined): PresenceInfo {
  const label = getDynamicPresence(lastSeenIso);
  const color = label === "ONLINE" ? "#00e676" : label === "INSTAVEL" ? "#ffab00" : "#ff3d57";
  return { label, color };
}
export function getOperationalPresenceInfo(lastSeenIso: string | null | undefined): OperationalPresenceInfo {
  if (!lastSeenIso) return { label: "SEM SINAL", color: "#6b7280" };
  const label = getDynamicPresence(lastSeenIso);
  const color = label === "ONLINE" ? "#00e676" : label === "INSTAVEL" ? "#ffab00" : "#ff3d57";
  return { label, color };
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "--";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 0) return "agora"; if (s < 60) return `${s}s atrás`; if (s < 3600) return `${Math.floor(s/60)}min atrás`;
  if (s < 86400) return `${Math.floor(s/3600)}h atrás`; return `${Math.floor(s/86400)}d atrás`;
}
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit" });
}
export function fmtDur(secs: number | null | undefined, isoStart?: string): string {
  const s = secs ?? (isoStart ? Math.floor((Date.now()-new Date(isoStart).getTime())/1000) : null);
  if (!s || s < 0) return "--";
  return `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}
