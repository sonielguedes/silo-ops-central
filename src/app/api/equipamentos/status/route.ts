import { NextResponse } from "next/server";

const B = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");
const ENDPOINT = "/api/equipamentos/status";

export async function GET() {
  const url = `${B}${ENDPOINT}`;

  try {
    const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const text = await r.text();
    const data = text ? JSON.parse(text) : null;

    if (!r.ok) {
      console.error("[SIL] endpoint failed", { endpoint: ENDPOINT, status: r.status, url });
      return NextResponse.json({ error: `HTTP ${r.status}`, detail: data }, { status: r.status });
    }

    return NextResponse.json(Array.isArray(data) ? data : [], { status: 200 });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[SIL] endpoint failed", { endpoint: ENDPOINT, status: null, url, error });
    return NextResponse.json({ error }, { status: 502 });
  }
}
