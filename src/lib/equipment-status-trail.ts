import { IS_DEMO, SITE_URL } from "@/lib/app-env";
import { normalizeEquipmentList } from "@/lib/api";
import { normalizeScopeFields } from "@/lib/auth";
import { appendEquipmentTrailPoints, buildTrailPointFromRecord } from "@/lib/equipment-trail-store";

const B = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");
const ENDPOINT = "/api/equipamentos/status";

function withScope(items: ReturnType<typeof normalizeEquipmentList>) {
  return items.map((item) => ({
    ...item,
    ...normalizeScopeFields({
      empresa_id: (item as any).empresa_id,
      usina_id: (item as any).usina_id,
      unidade_id: (item as any).unidade_id,
    }),
  }));
}

export function collectTrailPointsFromEquipmentStatus(payload: unknown) {
  const normalized = withScope(normalizeEquipmentList(payload));
  return normalized
    .map((item) => buildTrailPointFromRecord(item as unknown as Record<string, unknown>, item.trator_id, "status"))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function persistTrailPointsFromEquipmentStatus(payload: unknown) {
  const points = collectTrailPointsFromEquipmentStatus(payload);
  if (points.length > 0) {
    await appendEquipmentTrailPoints(points);
  }
  return points;
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
