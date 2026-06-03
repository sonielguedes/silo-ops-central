import { NextRequest, NextResponse } from "next/server";
import { forbidden, readJsonBody, requireSession, unauthorized } from "@/app/api/admin/_helpers";
import { getWorkforceById, listWorkforce, upsertWorkforce } from "@/lib/workforce-store";

function canRead(role?: string | null) {
  return role === "ADMIN_GLOBAL" || role === "ADMIN_EMPRESA" || role === "VIEWER";
}

function canWrite(role?: string | null) {
  return role === "ADMIN_GLOBAL" || role === "ADMIN_EMPRESA";
}

export function createWorkforceListRoute(kind: "cargos" | "equipes" | "operadores") {
  return async function GET(req: NextRequest) {
    const session = requireSession(req);
    if (!session) return unauthorized();
    if (!canRead(session.role)) return forbidden();
    const items = await listWorkforce(kind, session);
    return NextResponse.json(items, { status: 200 });
  };
}

export function createWorkforceCreateRoute(kind: "cargos" | "equipes" | "operadores") {
  return async function POST(req: NextRequest) {
    const session = requireSession(req);
    if (!session) return unauthorized();
    if (!canWrite(session.role)) return forbidden();
    const body = await readJsonBody(req);
    if (!body) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    try {
      const item = await upsertWorkforce(kind, body, session);
      return NextResponse.json({ ok: true, item }, { status: 200 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      const status = /escopo/i.test(message) ? 403 : 400;
      return NextResponse.json({ error: message }, { status });
    }
  };
}

export function createWorkforceGetRoute(kind: "cargos" | "equipes" | "operadores") {
  return async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const session = requireSession(req);
    if (!session) return unauthorized();
    if (!canRead(session.role)) return forbidden();
    const { id } = await context.params;
    const item = await getWorkforceById(kind, id, session);
    if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(item, { status: 200 });
  };
}

export function createWorkforceUpdateRoute(kind: "cargos" | "equipes" | "operadores") {
  return async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const session = requireSession(req);
    if (!session) return unauthorized();
    if (!canWrite(session.role)) return forbidden();
    const body = await readJsonBody(req);
    if (!body) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    const { id } = await context.params;
    const existing = await getWorkforceById(kind, id, session);
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try {
      const item = await upsertWorkforce(kind, { ...body, id }, session);
      return NextResponse.json({ ok: true, item }, { status: 200 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      const status = /escopo/i.test(message) ? 403 : 400;
      return NextResponse.json({ error: message }, { status });
    }
  };
}
