import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, isAdminGlobal } from "@/lib/auth";
import { appendEquipmentTrailPoints, buildTrailPointFromRecord, readEquipmentTrailStore } from "@/lib/equipment-trail-store";

function extractItems(payload: unknown): unknown[] {
  return Array.isArray(payload) ? payload : [];
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isAdminGlobal(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const before = await readEquipmentTrailStore();
  const statusUrl = new URL("/api/equipamentos/status", req.url);

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
      return NextResponse.json({ collected: 0, upstream_status: res.status }, { status: 200 });
    }

    const data = await res.json().catch(() => []);
    const points = extractItems(data)
      .map((item) => buildTrailPointFromRecord((item ?? {}) as Record<string, unknown>, String((item as { trator_id?: unknown }).trator_id ?? "trail"), "collect"))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (points.length > 0) {
      await appendEquipmentTrailPoints(points);
    }

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
    return NextResponse.json({ collected: 0, error }, { status: 200 });
  }
}
