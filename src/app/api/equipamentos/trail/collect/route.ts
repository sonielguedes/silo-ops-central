import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, isAdminGlobal } from "@/lib/auth";
import { readEquipmentTrailStore } from "@/lib/equipment-trail-store";
import { persistTrailPointsFromEquipmentStatus } from "@/lib/equipment-status-trail";

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isAdminGlobal(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const before = await readEquipmentTrailStore();
  const origin = new URL(req.url).origin;
  const statusUrl = `${origin}/api/equipamentos/status`;

  try {
    const res = await fetch(statusUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "upstream_status_failed", upstream_status: res.status }, { status: 500 });
    }

    const data = await res.json().catch(() => []);
    const points = await persistTrailPointsFromEquipmentStatus(data);

    const after = await readEquipmentTrailStore();
    return NextResponse.json(
      {
        collected: Math.max(after.points.length - before.points.length, 0),
        source_points: points.length,
        upstream_status: res.status,
      },
      { status: 200 },
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "upstream_status_failed", detail: error }, { status: 500 });
  }
}
