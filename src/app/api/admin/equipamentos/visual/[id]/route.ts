import { NextRequest, NextResponse } from "next/server";
import { forbidden, readJsonBody, requireSession, unauthorized } from "../../../_helpers";
import { readEquipmentVisualStore, upsertVisualConfig } from "@/lib/equipment-visual-store";
import { filterItemsBySessionScope, isAdminGlobal } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireSession(req);
  if (!session) return unauthorized();

  const { id } = await params;
  const store = await readEquipmentVisualStore();
  const item = store.configs.find(it => it.id === id);

  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const filtered = filterItemsBySessionScope([item], session);
  if (filtered.length === 0) return forbidden();

  return NextResponse.json(item, { status: 200 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireSession(req);
  if (!session) return unauthorized();

  const isAuthorized = isAdminGlobal(session) || session.role === "ADMIN_EMPRESA";
  if (!isAuthorized) return forbidden();

  const body = await readJsonBody(req);
  if (!body) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const { id } = await params;
  const store = await readEquipmentVisualStore();
  const existing = store.configs.find(it => it.id === id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Tenant check
  if (!isAdminGlobal(session) && existing.empresa_id !== session.empresa_id) {
    return forbidden();
  }

  try {
    const item = await upsertVisualConfig({ ...body, id }, session);
    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
