import { NextResponse } from "next/server";
const BASE = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");
export async function GET() {
  try {
    const res = await fetch(`${BASE}/api/operacoes/historico`, { cache: "no-store", signal: AbortSignal.timeout(9000) });
    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : [], { status: res.status });
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 502 }); }
}
