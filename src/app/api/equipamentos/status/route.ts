import { NextRequest, NextResponse } from "next/server";
import { IS_DEMO, SITE_URL } from "@/lib/app-env";
import { normalizeEquipmentList } from "@/lib/api";
import { filterItemsBySessionScope, getSessionFromRequest, normalizeScopeFields } from "@/lib/auth";
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

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (IS_DEMO || (SITE_URL && B === SITE_URL)) {
    return NextResponse.json([], { status: 200 });
  }

  const url = `${B}${ENDPOINT}`;

  try {
    const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const text = await r.text();
    const data = text ? JSON.parse(text) : null;

    if (!r.ok) {
      console.error("[SIL] endpoint failed", { endpoint: ENDPOINT, status: r.status, url });
      return NextResponse.json([], { status: 200 });
    }

    const normalized = withScope(normalizeEquipmentList(data));
    const trailPoints = normalized
      .map((item) => buildTrailPointFromRecord(item as unknown as Record<string, unknown>, item.trator_id, "status"))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (trailPoints.length > 0) {
      await appendEquipmentTrailPoints(trailPoints);
    }

    const items = filterItemsBySessionScope(normalized, session);

    return NextResponse.json(items, { status: 200 });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[SIL] endpoint failed", { endpoint: ENDPOINT, status: null, url, error });
    return NextResponse.json([], { status: 200 });
  }
}
