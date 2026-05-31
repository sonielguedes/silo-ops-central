import { NextRequest, NextResponse } from "next/server";

const API_BASE = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ matricula: string }> }) {
  const { matricula } = await params;
  try {
    const body = await req.json();
    const res = await fetch(`${API_BASE}/api/operadores/${matricula}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
