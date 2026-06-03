import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { findEquipmentMasterRecordByFrota, readEquipmentMasterStore } from "@/lib/equipment-master-store";

export const runtime = "nodejs";

function normalizeInputFrota(value: string) {
  return value.trim().toUpperCase();
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ frota: string }> }) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { frota } = await params;
  const normalizedFrota = normalizeInputFrota(frota || "");
  if (!normalizedFrota) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const store = await readEquipmentMasterStore();
  const equipamento = findEquipmentMasterRecordByFrota(store.items, normalizedFrota, session);
  if (!equipamento) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (equipamento.status !== "ATIVO") {
    return NextResponse.json({ error: "equipamento_inativo" }, { status: 409 });
  }

  return NextResponse.json(equipamento, { status: 200 });
}
