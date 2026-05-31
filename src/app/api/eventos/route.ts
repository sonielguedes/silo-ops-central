import { NextRequest, NextResponse } from "next/server";
const BASE = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();
    const res = await fetch(`${BASE}/api/eventos${qs ? "?" + qs : ""}`, { cache: "no-store", signal: AbortSignal.timeout(9000) });
    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : [], { status: res.status });
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 502 }); }
}
