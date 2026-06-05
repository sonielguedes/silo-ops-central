import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { findEquipmentMasterRecordByFrota, readEquipmentMasterStore } from "@/lib/equipment-master-store";

export const runtime = "nodejs";

function normalizeInputFrota(value: string) {
  return value.trim().toUpperCase();
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ frota: string }> }) {
  const session = await getSessionFromRequest(req);
  const { frota } = await params;
  const normalizedFrota = normalizeInputFrota(frota || "");

  if (!session) {
    console.warn(`[MOBILE-LOOKUP] Unauthorized. Fleet: ${normalizedFrota}`);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!normalizedFrota) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const store = await readEquipmentMasterStore();
  const equipamento = findEquipmentMasterRecordByFrota(store.items, normalizedFrota, session);

  // Logging requested in prompt
  console.log("[MOBILE-LOOKUP] Debug:", {
    companyId: session.empresa_id,
    companyTenantId: session.tenant_id,
    lookupTenantId: session.tenant_id,
    fleetCode: normalizedFrota,
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
