import { NextResponse } from "next/server";

const B = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

export async function GET() {
  try {
    const r = await fetch(`${B}/api/comando-online`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (err) {
    return NextResponse.json({ error: String(err), apiOnline: false }, { status: 502 });
  }
}
