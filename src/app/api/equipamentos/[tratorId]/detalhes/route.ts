import { NextRequest, NextResponse } from "next/server";
import { buildEquipmentDetails } from "@/lib/equipment-details";
import { getSessionFromRequest } from "@/lib/auth-server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ tratorId: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { tratorId } = await params;
  try {
    const details = await buildEquipmentDetails(tratorId, session);
    if (!details) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(details, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[SIL] endpoint failed", { endpoint: `/api/equipamentos/${tratorId}/detalhes`, error: message });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
