import { normalizeEquipmentList } from "@/lib/api";
import { normalizeScopeFields } from "@/lib/auth";
import { appendEquipmentTrailPoints, buildTrailPointFromRecord } from "@/lib/equipment-trail-store";

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
