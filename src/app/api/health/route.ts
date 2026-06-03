import { NextResponse } from "next/server";
import { IS_DEMO, SITE_URL } from "@/lib/app-env";

const B = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");
const ENDPOINT = "/health";

export const runtime = "nodejs";

export async function GET() {
  const timestamp = new Date().toISOString();

  if (IS_DEMO || (SITE_URL && B === SITE_URL)) {
    return NextResponse.json({
      ok: true,
      status: "online",
      ambiente: "demo",
      timestamp,
      version: "1.0.0-demo",
      uptime: process.uptime()
    }, { status: 200 });
  }

  const startedAt = Date.now();
  const url = `${B}${ENDPOINT}`;

  try {
    const r = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000)
    });

    const text = await r.text();
    let upstream: any = null;

    try {
      upstream = text ? JSON.parse(text) : null;
    } catch {
      upstream = { raw: text.slice(0, 500) };
    }

    const latency_ms = Date.now() - startedAt;

    if (!r.ok) {
      console.error("[SIL] Health proxy: upstream failed", { status: r.status, url });
      return NextResponse.json({
        ok: false,
        status: "degraded",
        upstream_status: r.status,
        latency_ms,
        timestamp,
      }, { status: 200 }); // We return 200 so the frontend can parse the "ok: false"
    }

    return NextResponse.json({
      ok: true,
      status: "online",
      upstream_status: r.status,
      latency_ms,
      timestamp,
      version: upstream?.version || "1.0.0",
      uptime: upstream?.uptime || process.uptime()
    }, { status: 200 });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    const isTimeout = error.includes("timeout") || error.includes("Aborted");

    console.error("[SIL] Health proxy: fetch exception", { url, error });

    return NextResponse.json({
      ok: false,
      status: isTimeout ? "instavel" : "offline",
      error,
      latency_ms: Date.now() - startedAt,
      timestamp,
    }, { status: 200 });
  }
}
