import { NextRequest, NextResponse } from "next/server";
import { APP_ENV, CAN_LOCAL_OPERADORES_CRUD, IS_DEMO } from "@/lib/app-env";
import { normalizeFichaList } from "@/lib/fichas-operacionais";

const API_BASE_RAW = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
const HAS_EXPLICIT_BACKEND = Boolean(API_BASE_RAW);
const API_BASE = API_BASE_RAW.replace(/\/$/, "");
const TECH_EMPTY = IS_DEMO
  ? "Ambiente demonstrativo: fichas controladas localmente."
  : CAN_LOCAL_OPERADORES_CRUD
    ? `Modo local (${APP_ENV}): consulta sem backend real.`
    : "Serviço de fichas indisponível.";

async function readJsonSafe(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json") && !contentType.includes("+json")) return null;
  return res.json().catch(() => null);
}

export async function GET(req: NextRequest) {
  if (IS_DEMO || CAN_LOCAL_OPERADORES_CRUD) {
    return NextResponse.json({ fichas: [], status_tecnico: TECH_EMPTY }, { status: 200 });
  }

  if (!HAS_EXPLICIT_BACKEND) {
    return NextResponse.json({ fichas: [], status_tecnico: "Serviço de fichas indisponível." }, { status: 200 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();
    const url = `${API_BASE}/api/fichas-operacionais${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(9000) });
    const data = await readJsonSafe(res);

    if (!res.ok) {
      console.error("[SIL] endpoint failed", { endpoint: "/api/fichas-operacionais", status: res.status, url });
      return NextResponse.json({ fichas: [], status_tecnico: "Serviço de fichas indisponível." }, { status: 200 });
    }

    return NextResponse.json({ fichas: normalizeFichaList(data), status_tecnico: null }, { status: 200 });
  } catch (err) {
    console.error("[SIL] endpoint failed", { endpoint: "/api/fichas-operacionais", status: null, error: String(err) });
    return NextResponse.json({ fichas: [], status_tecnico: "Serviço de fichas indisponível." }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  if (IS_DEMO || CAN_LOCAL_OPERADORES_CRUD) {
    return NextResponse.json({ ok: false, status_tecnico: TECH_EMPTY }, { status: 200 });
  }

  if (!HAS_EXPLICIT_BACKEND) {
    return NextResponse.json({ ok: false, status_tecnico: "Serviço de fichas temporariamente indisponível." }, { status: 200 });
  }

  try {
    const body = await req.json();
    const res = await fetch(`${API_BASE}/api/fichas-operacionais`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(9000),
    });
    const data = await readJsonSafe(res);

    if (!res.ok) {
      console.error("[SIL] endpoint failed", { endpoint: "/api/fichas-operacionais", status: res.status, url: `${API_BASE}/api/fichas-operacionais` });
      return NextResponse.json({ ok: false, status_tecnico: "Falha técnica ao salvar ficha." }, { status: res.status });
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[SIL] endpoint failed", { endpoint: "/api/fichas-operacionais", status: null, error: String(err) });
    return NextResponse.json({ ok: false, status_tecnico: "Serviço de fichas temporariamente indisponível." }, { status: 502 });
  }
}
