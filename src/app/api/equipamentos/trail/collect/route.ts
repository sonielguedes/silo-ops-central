import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, isAdminGlobal } from "@/lib/auth";
import { readEquipmentTrailStore } from "@/lib/equipment-trail-store";
import { fetchEquipmentStatusSnapshot, persistTrailPointsFromEquipmentStatus } from "@/lib/equipment-status-trail";

export async function POST(req: NextRequest) {
  const hasCollectorToken = req.headers.has("x-collector-token");
  if (hasCollectorToken) {
    const collectorToken = req.headers.get("x-collector-token") || "";
    const expectedToken = (process.env.COLLECTOR_TOKEN || "").trim();
    if (!expectedToken || collectorToken !== expectedToken) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!isAdminGlobal(session)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const before = await readEquipmentTrailStore();

  try {
    const { upstream_status, data } = await fetchEquipmentStatusSnapshot();
    const points = await persistTrailPointsFromEquipmentStatus(data);

    const after = await readEquipmentTrailStore();
    return NextResponse.json(
      {
        collected: Math.max(after.points.length - before.points.length, 0),
        source_points: points.length,
        upstream_status,
      },
      { status: 200 },
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "collector_failed", message: error }, { status: 500 });
  }
}
