import { IS_DEMO, SITE_URL } from "@/lib/app-env";
import { appendEquipmentTrailPoints, buildTrailPointFromRecord, type TrailPoint } from "@/lib/equipment-trail-store";

const B = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");
const ENDPOINT = "/api/equipamentos/status";

function extractItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (!payload || typeof payload !== "object") return [];
  const candidates = ["pontos", "rastro", "telemetria", "eventos", "items", "data", "rows", "registros", "results", "equipamentos"];
  for (const key of candidates) {
    const value = (payload as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value as Record<string, unknown>[];
  }
  return [];
}

export function collectTrailPointsFromEquipmentStatus(payload: unknown) {
  const rawItems = extractItems(payload);
  return rawItems
    .map((item) => buildTrailPointFromRecord(item, String(item.trator_id || item.equipamento_id || item.id || "trail"), "status"))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function persistTrailPointsFromEquipmentStatus(payload: unknown) {
  const points = collectTrailPointsFromEquipmentStatus(payload);
  if (points.length > 0) {
    await appendEquipmentTrailPoints(points);
  }
  return points;
}

export function enrichTrailPointWithOperationalContext(point: TrailPoint) {
  return buildTrailPointFromRecord(point as unknown as Record<string, unknown>, point.trator_id, point.origem || "status") || point;
}

export async function fetchEquipmentStatusSnapshot() {
  if (IS_DEMO || (SITE_URL && B === SITE_URL)) {
    return { upstream_status: 200, data: [] as unknown[] };
  }

  const url = `${B}${ENDPOINT}`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  const text = await res.text();
  const data = text ? JSON.parse(text) : [];
  return { upstream_status: res.status, data };
}
