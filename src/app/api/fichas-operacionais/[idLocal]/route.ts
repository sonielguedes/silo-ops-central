import { NextRequest, NextResponse } from "next/server";

const API_BASE = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

export async function GET(req: NextRequest, { params }: { params: Promise<{ idLocal: string }> }) {
  try {
    const { idLocal } = await params;
    const url = `${API_BASE}/api/fichas-operacionais/${idLocal}`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(9000) });
    if (!res.ok) {
      return NextResponse.json({ error: `Erro do servidor: HTTP ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
