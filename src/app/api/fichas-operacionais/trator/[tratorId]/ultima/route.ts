import { NextRequest, NextResponse } from "next/server";

const API_BASE = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

export async function GET(_: NextRequest, { params }: { params: Promise<{ tratorId: string }> }) {
  try {
    const { tratorId } = await params;
    const url = `${API_BASE}/api/fichas-operacionais/trator/${tratorId}/ultima`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(9000) });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json({ ficha: null, status_tecnico: `Erro do servidor: HTTP ${res.status}` }, { status: 200 });
    }
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ ficha: null, status_tecnico: String(err) }, { status: 200 });
  }
}
