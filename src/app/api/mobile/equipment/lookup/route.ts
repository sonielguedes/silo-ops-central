import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { findEquipmentMasterRecordByFrota, readEquipmentMasterStore } from "@/lib/equipment-master-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  const { searchParams } = new URL(req.url);
  const fleetCode = searchParams.get("fleetCode") || searchParams.get("frota") || "";

  if (!session) {
    console.warn(`[MOBILE-LOOKUP] Unauthorized. Fleet: ${fleetCode}`);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!fleetCode) {
    return NextResponse.json({ error: "missing_fleet_code" }, { status: 400 });
  }

  const store = await readEquipmentMasterStore();
  const equipamento = findEquipmentMasterRecordByFrota(store.items, fleetCode, session);

  // Mandatory logging as per requirements
  console.log("[MOBILE-LOOKUP] Debug:", {
    companyId: session.empresa_id,
    companyTenantId: session.tenant_id,
    lookupTenantId: session.tenant_id,
    fleetCode: fleetCode,
    mobileEnabled: equipamento?.mobile_enabled ?? false,
    status: equipamento?.status ?? "NOT_FOUND"
  });

  if (!equipamento) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (equipamento.status !== "ATIVO") {
    return NextResponse.json({ error: "equipamento_inativo" }, { status: 409 });
  }

  if (!equipamento.mobile_enabled) {
    return NextResponse.json({ error: "equipamento_nao_habilitado_mobile" }, { status: 409 });
  }

  return NextResponse.json(equipamento, { status: 200 });
}
