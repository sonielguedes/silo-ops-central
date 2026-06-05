import { NextRequest, NextResponse } from "next/server";
import { forbidden, readJsonBody, requireSession, unauthorized } from "../../_helpers";
import { readEquipmentVisualStore, upsertVisualConfig } from "@/lib/equipment-visual-store";
import { filterItemsBySessionScope, isAdminGlobal } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorized();

  const store = await readEquipmentVisualStore();
  const filtered = filterItemsBySessionScope(store.configs, session);

  return NextResponse.json(filtered, { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorized();

  const isAuthorized = isAdminGlobal(session) || session.role === "ADMIN_EMPRESA";
  if (!isAuthorized) return forbidden();

  const body = await readJsonBody(req);
  if (!body) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  try {
    const item = await upsertVisualConfig(body, session);
    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
