import { NextRequest, NextResponse } from "next/server";
import { canReadAdminTenant, canWriteAdminTenant, forbidden, readJsonBody, requireSession, unauthorized } from "../_helpers";
import { getAccessibleUnidadeIds, readAdminTenantStore, upsertUnidade } from "@/lib/admin-tenant-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = requireSession(req);
  if (!session) return unauthorized();
  if (!canReadAdminTenant(session)) return forbidden();

  const store = await readAdminTenantStore();
  const ids = getAccessibleUnidadeIds(session, store);
  if (session.role === "ADMIN_GLOBAL") return NextResponse.json(store.unidades, { status: 200 });
  return NextResponse.json(store.unidades.filter((item) => ids.includes(item.unidade_id)), { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = requireSession(req);
  if (!session) return unauthorized();
  if (!canWriteAdminTenant(session)) return forbidden();

  const body = await readJsonBody(req);
  if (!body) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  try {
    const unidade = await upsertUnidade({
      unidade_id: typeof body.unidade_id === "string" ? body.unidade_id : "",
      usina_id: typeof body.usina_id === "string" ? body.usina_id : "",
      nome_unidade: typeof body.nome_unidade === "string" ? body.nome_unidade : "",
      status: typeof body.status === "string" ? body.status : undefined,
    });
    return NextResponse.json({ ok: true, unidade }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const status = message.includes("inexistente") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
