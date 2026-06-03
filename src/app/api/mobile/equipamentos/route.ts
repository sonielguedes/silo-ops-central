import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { listActiveEquipmentMaster, readEquipmentMasterStore } from "@/lib/equipment-master-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const store = await readEquipmentMasterStore();
  const items = listActiveEquipmentMaster(store.items, session);
  return NextResponse.json(items, { status: 200 });
}
