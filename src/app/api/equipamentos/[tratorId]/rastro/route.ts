import { NextRequest, NextResponse } from "next/server";
import { IS_DEMO, SITE_URL } from "@/lib/app-env";
import { normalizeEquipment, normalizeEquipmentList, resolveEquipmentCoordinates } from "@/lib/api";
import { filterItemsBySessionScope, getScopeFilter, getSessionFromRequest, isAdminGlobal, normalizeScopeFields } from "@/lib/auth";

const BASE = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

type TrailPoint = {
  trator_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  velocidade: number | null;
  status: string | null;
  origem: string | null;
  empresa_id: string;
  usina_id: string;
  unidade_id: string;
};

function parseDateMs(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const ms = new Date(String(value)).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function parseLimit(value: string | null): number {
  const raw = Number.parseInt(value || "", 10);
  if (!Number.isFinite(raw) || raw <= 0) return 500;
  return Math.min(raw, 2000);
}

function extractItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const candidates = ["pontos", "rastro", "telemetria", "eventos", "items", "data", "rows", "registros", "results"];
  for (const key of candidates) {
    const value = (payload as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function scopeField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeTrailPoint(item: Record<string, unknown>, fallbackTratorId: string, source: string): TrailPoint | null {
  const coords = resolveEquipmentCoordinates(item);
  if (!coords.hasCoordinates || coords.latitude === null || coords.longitude === null) return null;

  const timestampMs = parseDateMs(
    item.timestamp ??
    item.horario ??
    item.created_at ??
    item.createdAt ??
    item.data_hora ??
    item.last_seen ??
    item.updated_at,
  );
  if (timestampMs === null) return null;

  const scope = normalizeScopeFields({
    empresa_id: scopeField(item.empresa_id),
    usina_id: scopeField(item.usina_id),
    unidade_id: scopeField(item.unidade_id),
  });

  return {
    trator_id: String(item.trator_id ?? item.equipamento_id ?? item.id ?? fallbackTratorId),
    timestamp: new Date(timestampMs).toISOString(),
    latitude: coords.latitude,
    longitude: coords.longitude,
    velocidade: toFiniteNumber(item.velocidade ?? item.speed ?? item.velocidade_kmh ?? item.velocity),
    status: typeof item.status === "string"
      ? item.status
      : typeof item.estado === "string"
        ? item.estado
        : typeof item.evento === "string"
          ? item.evento
          : null,
    origem: typeof item.origem === "string"
      ? item.origem
      : typeof item.source === "string"
        ? item.source
        : source,
    ...scope,
  };
}

function normalizeStatusSnapshot(item: Record<string, unknown>, fallbackTratorId: string): TrailPoint | null {
  const normalized = normalizeEquipment(item);
  if (!normalized.has_coordinates || normalized.latitude === null || normalized.longitude === null) return null;
  const timestampMs = parseDateMs(normalized.last_seen);
  if (timestampMs === null) return null;

  const scope = normalizeScopeFields({
    empresa_id: scopeField(item.empresa_id),
    usina_id: scopeField(item.usina_id),
    unidade_id: scopeField(item.unidade_id),
  });

  return {
    trator_id: normalized.trator_id || fallbackTratorId,
    timestamp: new Date(timestampMs).toISOString(),
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    velocidade: normalized.velocidade,
    status: normalized.status || normalized.presence || null,
    origem: "status",
    ...scope,
  };
}

function normalizeTrailPoints(payload: unknown, fallbackTratorId: string, source: string) {
  return extractItems(payload)
    .map((item) => normalizeTrailPoint((item ?? {}) as Record<string, unknown>, fallbackTratorId, source))
    .filter((item): item is TrailPoint => Boolean(item));
}

function normalizeStatusPoints(payload: unknown, fallbackTratorId: string) {
  return normalizeEquipmentList(payload)
    .map((item) => normalizeStatusSnapshot(item as unknown as Record<string, unknown>, fallbackTratorId))
    .filter((item): item is TrailPoint => Boolean(item));
}

function filterTrailByRange(points: TrailPoint[], from: string | null, to: string | null) {
  const fromMs = parseDateMs(from);
  const toMs = parseDateMs(to);
  return points.filter((point) => {
    const ts = new Date(point.timestamp).getTime();
    if (!Number.isFinite(ts)) return false;
    if (fromMs !== null && ts < fromMs) return false;
    if (toMs !== null && ts > toMs) return false;
    return true;
  });
}

function dedupeAndSort(points: TrailPoint[]) {
  const seen = new Set<string>();
  return points
    .filter((point) => {
      const key = `${point.trator_id}|${point.timestamp}|${point.latitude}|${point.longitude}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(9000) });
  const text = await res.text();
  let data: unknown = [];
  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      data = [];
    }
  }
  return { res, data };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tratorId: string }> },
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { tratorId } = await params;
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = parseLimit(searchParams.get("limit"));

    if (IS_DEMO || (SITE_URL && BASE === SITE_URL)) {
      return NextResponse.json([], { status: 200 });
    }

    const scope = getScopeFilter(session);
    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    query.set("limit", String(limit));
    query.set("trator_id", tratorId);

    const upstreamSources = [
      `${BASE}/api/equipamentos/${tratorId}/rastro${query.toString() ? `?${query}` : ""}`,
      `${BASE}/api/equipamentos/${tratorId}/telemetria${query.toString() ? `?${query}` : ""}`,
      `${BASE}/api/telemetria/${tratorId}${query.toString() ? `?${query}` : ""}`,
      `${BASE}/api/telemetria${query.toString() ? `?${query}` : ""}`,
      `${BASE}/api/eventos${query.toString() ? `?${query}` : ""}`,
      `${BASE}/api/eventos/recentes${query.toString() ? `?${query}` : ""}`,
    ];

    let points: TrailPoint[] = [];
    for (const url of upstreamSources) {
      try {
        const { res, data } = await fetchJson(url);
        if (!res.ok) continue;
        const normalized = normalizeTrailPoints(data, tratorId, new URL(url).pathname);
        if (normalized.length > 0) {
          points = normalized;
          break;
        }
      } catch (err) {
        console.warn(`[Proxy Rastro] Falha ao buscar ${url}: ${err}`);
      }
    }

    if (points.length === 0) {
      try {
        const { res, data } = await fetchJson(`${BASE}/api/equipamentos/status`);
        if (res.ok) {
          points = normalizeStatusPoints(data, tratorId).filter((item) => item.trator_id === tratorId);
        }
      } catch (err) {
        console.warn(`[Proxy Rastro] Falha ao buscar snapshot de status para ${tratorId}: ${err}`);
      }
    }

    const scoped = !scope || isAdminGlobal(session)
      ? points
      : filterItemsBySessionScope(points, session);

    const ranged = filterTrailByRange(scoped, from, to);
    const output = dedupeAndSort(ranged).slice(0, limit);

    return NextResponse.json(output, { status: 200 });
  } catch (err) {
    console.warn(`[Proxy Rastro Warning] Falha na conexão com VPS para rastro: ${err}`);
    return NextResponse.json([], { status: 200 });
  }
}
