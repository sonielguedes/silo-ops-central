import { NextRequest, NextResponse } from "next/server";
import { canReadAdminTenant, canWriteAdminTenant, forbidden, readJsonBody, requireSession, unauthorized } from "../_helpers";
import { getAccessibleEmpresaIds, readAdminTenantStore, upsertEmpresa } from "@/lib/admin-tenant-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = requireSession(req);
  if (!session) return unauthorized();
  if (!canReadAdminTenant(session)) return forbidden();

  const store = await readAdminTenantStore();
  const ids = getAccessibleEmpresaIds(session, store);
  if (session.role === "ADMIN_GLOBAL") return NextResponse.json(store.empresas, { status: 200 });
  return NextResponse.json(store.empresas.filter((item) => ids.includes(item.empresa_id)), { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = requireSession(req);
  if (!session) return unauthorized();
  if (!canWriteAdminTenant(session)) return forbidden();

  const body = await readJsonBody(req);
  if (!body) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  try {
    const empresa = await upsertEmpresa({
      empresa_id: typeof body.empresa_id === "string" ? body.empresa_id : "",
      nome_empresa: typeof body.nome_empresa === "string" ? body.nome_empresa : "",
      status: typeof body.status === "string" ? body.status : undefined,
    });
    return NextResponse.json({ ok: true, empresa }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
