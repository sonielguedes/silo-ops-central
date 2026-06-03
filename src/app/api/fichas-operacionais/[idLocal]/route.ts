import { NextRequest, NextResponse } from "next/server";
import { APP_ENV, CAN_LOCAL_OPERADORES_CRUD, IS_DEMO } from "@/lib/app-env";
import { normalizeFicha } from "@/lib/fichas-operacionais";

const API_BASE_RAW = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
const HAS_EXPLICIT_BACKEND = Boolean(API_BASE_RAW);
const API_BASE = API_BASE_RAW.replace(/\/$/, "");
const TECH = IS_DEMO
  ? "Ambiente demonstrativo: edição desativada."
  : CAN_LOCAL_OPERADORES_CRUD
    ? `Modo local (${APP_ENV}): alterações gravadas apenas no navegador.`
    : "Serviço de fichas indisponível.";

async function readJsonSafe(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json") && !contentType.includes("+json")) return null;
  return res.json().catch(() => null);
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ idLocal: string }> }) {
  const { idLocal } = await params;

  if (IS_DEMO || CAN_LOCAL_OPERADORES_CRUD) {
    return NextResponse.json({ ficha: null, status_tecnico: TECH, idLocal }, { status: 200 });
  }

  if (!HAS_EXPLICIT_BACKEND) {
    return NextResponse.json({ ficha: null, status_tecnico: "Serviço de fichas indisponível.", idLocal }, { status: 200 });
  }

  try {
    const url = `${API_BASE}/api/fichas-operacionais/${idLocal}`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(9000) });
    const data = await readJsonSafe(res);

    if (!res.ok) {
      console.error("[SIL] endpoint failed", { endpoint: "/api/fichas-operacionais/[idLocal]", status: res.status, url });
      return NextResponse.json({ ficha: null, status_tecnico: "Serviço de fichas indisponível.", idLocal }, { status: 200 });
    }

    return NextResponse.json({ ficha: normalizeFicha((data ?? {}) as Record<string, unknown>), status_tecnico: null, idLocal }, { status: 200 });
  } catch (err) {
    console.error("[SIL] endpoint failed", { endpoint: "/api/fichas-operacionais/[idLocal]", status: null, error: String(err) });
    return NextResponse.json({ ficha: null, status_tecnico: "Serviço de fichas indisponível.", idLocal }, { status: 200 });
  }
}

async function updateFicha(req: NextRequest, { params }: { params: Promise<{ idLocal: string }> }) {
  const { idLocal } = await params;

  if (IS_DEMO || CAN_LOCAL_OPERADORES_CRUD) {
    return NextResponse.json({ ok: true, idLocal, status_tecnico: TECH }, { status: 200 });
  }

  if (!HAS_EXPLICIT_BACKEND) {
    return NextResponse.json({ ok: false, status_tecnico: "Serviço de fichas temporariamente indisponível.", idLocal }, { status: 200 });
  }

  try {
    const body = await req.json();
    const url = `${API_BASE}/api/fichas-operacionais/${idLocal}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(9000),
    });
    const data = await readJsonSafe(res);

    if (!res.ok) {
      console.error("[SIL] endpoint failed", { endpoint: "/api/fichas-operacionais/[idLocal]", status: res.status, url });
      return NextResponse.json({ ok: false, status_tecnico: "Falha técnica ao atualizar ficha.", idLocal }, { status: res.status });
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[SIL] endpoint failed", { endpoint: "/api/fichas-operacionais/[idLocal]", status: null, error: String(err) });
    return NextResponse.json({ ok: false, status_tecnico: "Serviço de fichas temporariamente indisponível.", idLocal }, { status: 502 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ idLocal: string }> }) {
  return updateFicha(req, context);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ idLocal: string }> }) {
  return updateFicha(req, context);
}
