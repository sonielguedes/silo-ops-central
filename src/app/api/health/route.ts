import { NextResponse } from "next/server";
import { IS_DEMO } from "@/lib/app-env";

const B = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");
const ENDPOINT = "/health";

export async function GET() {
  if (IS_DEMO) {
    return NextResponse.json({ status: "ok", ambiente: "demo" }, { status: 200 });
  }

  const startedAt = Date.now();
  const url = `${B}${ENDPOINT}`;

  try {
    const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const text = await r.text();
    let upstream: unknown = null;

    try {
      upstream = text ? JSON.parse(text) : null;
    } catch {
      upstream = { raw: text.slice(0, 500) };
    }

    if (!r.ok) {
      console.error("[SIL] endpoint failed", { endpoint: ENDPOINT, status: r.status, url });
    }

    return NextResponse.json({
      status: r.ok ? "ok" : "degraded",
      upstream_status: r.status,
      upstream,
      latency_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }, { status: r.ok ? 200 : 502 });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[SIL] endpoint failed", { endpoint: ENDPOINT, status: null, url, error });
    return NextResponse.json({
      status: "down",
      error,
      latency_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }, { status: 502 });
  }
}
