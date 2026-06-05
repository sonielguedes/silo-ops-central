import { NextRequest, NextResponse } from "next/server";
import { canReadAdminTenant, canWriteAdminTenant, forbidden, readJsonBody, requireSession, unauthorized } from "../_helpers";
import { getAccessibleUsinaIds, readAdminTenantStore, upsertUsina } from "@/lib/admin-tenant-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  if (!canReadAdminTenant(session)) return forbidden();

  const store = await readAdminTenantStore();
  const ids = getAccessibleUsinaIds(session, store);
  if (session.role === "ADMIN_GLOBAL") return NextResponse.json(store.usinas, { status: 200 });
  return NextResponse.json(store.usinas.filter((item) => ids.includes(item.usina_id)), { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) return unauthorized();
  if (!canWriteAdminTenant(session)) return forbidden();

  const body = await readJsonBody(req);
  if (!body) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  try {
    const usina = await upsertUsina({
      usina_id: typeof body.usina_id === "string" ? body.usina_id : "",
      empresa_id: typeof body.empresa_id === "string" ? body.empresa_id : "",
      nome_usina: typeof body.nome_usina === "string" ? body.nome_usina : "",
      status: typeof body.status === "string" ? body.status : undefined,
    });
    return NextResponse.json({ ok: true, usina }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const status = message.includes("inexistente") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
