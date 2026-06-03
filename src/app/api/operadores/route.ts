import { NextRequest, NextResponse } from "next/server";
import { APP_ENV, CAN_LOCAL_OPERADORES_CRUD, IS_DEMO } from "@/lib/app-env";

const API_BASE = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");
const TECH = IS_DEMO
  ? "Ambiente demonstrativo: escrita desativada"
  : CAN_LOCAL_OPERADORES_CRUD
    ? `Modo local (${APP_ENV}): cadastro salvo apenas no navegador`
    : "Serviço de operadores indisponível";

export async function GET() {
  if (IS_DEMO || CAN_LOCAL_OPERADORES_CRUD) {
    return NextResponse.json({ operadores: [], status_tecnico: TECH }, { status: 200 });
  }

  try {
    const res = await fetch(`${API_BASE}/api/operadores`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.error("[SIL] endpoint failed", { endpoint: "/api/operadores", status: res.status, url: `${API_BASE}/api/operadores` });
      return NextResponse.json({ operadores: [], status_tecnico: "Serviço de operadores indisponível." }, { status: 200 });
    }
    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : [], { status: 200 });
  } catch (err) {
    console.error("[SIL] endpoint failed", { endpoint: "/api/operadores", status: null, error: String(err) });
    return NextResponse.json({ operadores: [], status_tecnico: "Serviço de operadores indisponível." }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  if (IS_DEMO || CAN_LOCAL_OPERADORES_CRUD) {
    return NextResponse.json({ ok: false, status_tecnico: TECH }, { status: 200 });
  }

  try {
    const body = await req.json();
    const res = await fetch(`${API_BASE}/api/operadores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();

    if (!res.ok) {
      console.error("[SIL] endpoint failed", { endpoint: "/api/operadores", status: res.status, url: `${API_BASE}/api/operadores` });
      return NextResponse.json({ ok: false, status_tecnico: "Falha técnica ao salvar operador." }, { status: res.status });
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[SIL] endpoint failed", { endpoint: "/api/operadores", status: null, error: String(err) });
    return NextResponse.json({ ok: false, status_tecnico: "Serviço de operadores temporariamente indisponível." }, { status: 502 });
  }
}
