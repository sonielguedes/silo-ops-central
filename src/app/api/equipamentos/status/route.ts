import { NextRequest, NextResponse } from "next/server";
import { IS_DEMO, SITE_URL } from "@/lib/app-env";
import { normalizeEquipmentList } from "@/lib/api";
import { filterItemsBySessionScope, getSessionFromRequest, normalizeScopeFields } from "@/lib/auth";
import { fetchEquipmentStatusSnapshot, persistTrailPointsFromEquipmentStatus } from "@/lib/equipment-status-trail";

const B = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (IS_DEMO || (SITE_URL && B === SITE_URL)) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const { data } = await fetchEquipmentStatusSnapshot();
    await persistTrailPointsFromEquipmentStatus(data);
    const items = filterItemsBySessionScope(normalizeEquipmentList(data).map((item) => ({
      ...item,
      ...normalizeScopeFields({
        empresa_id: (item as any).empresa_id,
        usina_id: (item as any).usina_id,
        unidade_id: (item as any).unidade_id,
      }),
    })), session);

    return NextResponse.json(items, { status: 200 });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[SIL] endpoint failed", { endpoint: "/api/equipamentos/status", status: null, error });
    return NextResponse.json([], { status: 200 });
  }
}
