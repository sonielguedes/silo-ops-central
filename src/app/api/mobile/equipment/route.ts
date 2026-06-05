import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { readEquipmentMasterStore, upsertEquipmentMaster, type EquipmentMasterInput } from "@/lib/equipment-master-store";
import { syncServerStorage } from "@/lib/server-storage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const input: EquipmentMasterInput = {
      ...body,
      tenant_id: session.tenant_id, // ensure equipment.tenantId = company.tenantId
      empresa_id: session.empresa_id
    };

    const equipamento = await upsertEquipmentMaster(input, session);

    // Sync to mobile storage
    const store = await readEquipmentMasterStore();
    await syncServerStorage(store.items);

    return NextResponse.json(equipamento, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar equipamento";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
