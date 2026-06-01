import { NextResponse } from "next/server";
import { IS_DEMO, SITE_URL } from "@/lib/app-env";
import { normalizeEquipmentList } from "@/lib/api";

const B = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");
const ENDPOINT = "/api/equipamentos/status";

export async function GET() {
  if (IS_DEMO || (SITE_URL && B === SITE_URL)) {
    return NextResponse.json([], { status: 200 });
  }

  const url = `${B}${ENDPOINT}`;

  try {
    const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const text = await r.text();
    const data = text ? JSON.parse(text) : null;

    if (!r.ok) {
      console.error("[SIL] endpoint failed", { endpoint: ENDPOINT, status: r.status, url });
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(normalizeEquipmentList(data), { status: 200 });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[SIL] endpoint failed", { endpoint: ENDPOINT, status: null, url, error });
    return NextResponse.json([], { status: 200 });
  }
}
