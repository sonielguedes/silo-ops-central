import type { EventoOperacional } from "@/lib/dashboard-types";

const API = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

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
  gps_source?: string | null;
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

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function fetchResult<T>(path: string): Promise<ApiResult<T>> {
  let baseUrl = ""; // Use relative proxies by default on client-side to avoid CORS
  
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("sil_api_base_url");
    // If the user entered a custom IP that isn't the production VPS, allow direct client fetch
    if (saved && !saved.includes("localhost:3000")) {
      baseUrl = saved.trim().replace(/\/$/, "");
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
      console.warn(`[SIL] API Warning: ${errorMsg}`);
      return { ok: false, error: errorMsg };
    }

    const text = await res.text();
    if (!text || text.trim().length === 0) {
      return { ok: true, data: [] as unknown as T };
    }

    try {
      const data = JSON.parse(text);
      return { ok: true, data: data as T };
    } catch (parseErr) {
      // Se não for JSON, pode ser um erro HTML do servidor
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
         console.error(`[SIL] API returned HTML instead of JSON from ${finalPath}`);
         return { ok: false, error: "Servidor retornou erro (HTML)" };
      }
      console.error(`[SIL] JSON Parse Error em ${finalPath}`, parseErr);
      return { ok: false, error: "Erro no formato dos dados" };
    }
  } catch (err) {
    const errorName = err instanceof Error ? err.name : "UnknownError";
    const errorMessage = err instanceof Error ? err.message : String(err);

    if (errorName === "TimeoutError") {
      console.error(`[SIL] Timeout 10s em ${finalPath}`);
      return { ok: false, error: "Tempo esgotado (10s)" };
    }

    // "Failed to fetch" geralmente é rede ou CORS
    console.warn(`[SIL] Fetch suppressed em ${finalPath}: ${errorMessage}`);
    return { ok: false, error: "Conexão indisponível" };
  }
}

export const api = {
  health: () => fetchResult<HealthResponse>("/health"),
  equipamentos: () => fetchResult<Equipamento[]>("/api/equipamentos/status"),
  operacoesAtivas: () => fetchResult<OperacaoAtiva[]>("/api/operacoes/ativas"),
  eventosRecentes: () => fetchResult<EventoOperacional[]>("/api/eventos/recentes"),
  rastro: (tratorId: string, limit = 500) => fetchResult<GpsPoint[]>(`/api/equipamentos/${tratorId}/rastro?limit=${limit}`),
  outbox: () => fetchResult<OutboxItem[]>("/api/outbox/queue"),
};

export type PresenceStatus = "ONLINE" | "INSTAVEL" | "OFFLINE";
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
