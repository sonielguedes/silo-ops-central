import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-server";
import { isAdminGlobal } from "@/lib/auth";
import { findEquipmentMasterRecordByFrota, normalizeFrotaCode, readEquipmentMasterStore } from "@/lib/equipment-master-store";
import { appendEquipmentTrailPoints, buildTrailPointFromRecord, readEquipmentTrailStore } from "@/lib/equipment-trail-store";
import { fetchEquipmentStatusSnapshot, persistTrailPointsFromEquipmentStatus } from "@/lib/equipment-status-trail";

import { SessionPayload } from "@/lib/auth";

const MOBILE_TOKEN_HEADER = "x-silo-mobile-token";
const LEGACY_COLLECTOR_TOKEN_HEADER = "x-collector-token";
const MOBILE_TOKEN = (process.env.MOBILE_INGEST_TOKEN || "").trim();
const COLLECTOR_TOKEN = (process.env.COLLECTOR_TOKEN || "").trim();

type AuthMode = "admin-session" | "mobile-token" | "collector-token";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

function extractItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  const candidates = ["points", "trail", "pontos", "rastro", "telemetria", "eventos", "items", "data", "rows", "registros", "results"];
  for (const key of candidates) {
    const value = record[key];
    if (Array.isArray(value)) return value as Record<string, unknown>[];
  }

  if ("trator_id" in record || "equipamento_id" in record || "latitude" in record || "longitude" in record || "timestamp" in record) {
    return [record];
  }

  return [];
}

function getHeaderToken(req: NextRequest, headerName: string) {
  return (req.headers.get(headerName) || "").trim();
}

async function authorize(req: NextRequest): Promise<{ ok: boolean; mode?: AuthMode; session?: SessionPayload | null; status?: number }> {
  const session = await getSessionFromRequest(req);
  if (session && isAdminGlobal(session)) {
    return { ok: true, mode: "admin-session", session };
  }

  const mobileToken = getHeaderToken(req, MOBILE_TOKEN_HEADER);
  if (mobileToken) {
    if (!MOBILE_TOKEN || mobileToken !== MOBILE_TOKEN) return { ok: false, status: 401 };
    return { ok: true, mode: "mobile-token", session: null };
  }

  const collectorToken = getHeaderToken(req, LEGACY_COLLECTOR_TOKEN_HEADER);
  if (collectorToken) {
    if (!COLLECTOR_TOKEN || collectorToken !== COLLECTOR_TOKEN) return { ok: false, status: 401 };
    return { ok: true, mode: "collector-token", session: null };
  }

  if (session) return { ok: false, status: 403 };
  return { ok: false, status: 401 };
}

function assertTenantCompatibility(raw: Record<string, unknown>, master: { empresa_id: string; usina_id: string; unidade_id: string }) {
  const payloadEmpresa = typeof raw.empresa_id === "string" ? raw.empresa_id.trim() : "";
  const payloadUsina = typeof raw.usina_id === "string" ? raw.usina_id.trim() : "";
  const payloadUnidade = typeof raw.unidade_id === "string" ? raw.unidade_id.trim() : "";
  if ((payloadEmpresa && payloadEmpresa !== master.empresa_id)
    || (payloadUsina && payloadUsina !== master.usina_id)
    || (payloadUnidade && payloadUnidade !== master.unidade_id)) {
    throw new Error("tenant_mismatch");
  }
}

function normalizeTrailPointInput(raw: Record<string, unknown>, master: { trator_id: string; frota: string; empresa_id: string; usina_id: string; unidade_id: string }) {
  const statusOperacional = typeof raw.status_operacional === "string" && raw.status_operacional.trim()
    ? raw.status_operacional.trim().toUpperCase()
    : typeof raw.estado_operacional === "string" && raw.estado_operacional.trim()
      ? raw.estado_operacional.trim().toUpperCase()
      : typeof raw.status === "string" && raw.status.trim()
        ? raw.status.trim().toUpperCase()
        : null;

  const normalized = {
    ...raw,
    trator_id: master.trator_id,
    frota: master.frota,
    empresa_id: master.empresa_id,
    usina_id: master.usina_id,
    unidade_id: master.unidade_id,
    estado_operacional: statusOperacional,
    status_operacional: statusOperacional,
  };

  const point = buildTrailPointFromRecord(normalized, master.trator_id, "mobile-ingest");
  if (!point) return null;

  return {
    ...point,
    status_operacional: statusOperacional ?? point.estado_operacional ?? null,
  };
}

async function ingestBodyTrailPoints(bodyText: string) {
  const body = (() => {
    try {
      return JSON.parse(bodyText);
    } catch {
      return null;
    }
  })();
  const items = extractItems(body);
  if (items.length === 0) return { points: [] as ReturnType<typeof normalizeTrailPointInput>[] };

  const masterStore = await readEquipmentMasterStore();
  const points = items.map((raw) => {
    const tratorId = typeof raw.trator_id === "string"
      ? raw.trator_id.trim().toUpperCase()
      : typeof raw.equipamento_id === "string"
        ? raw.equipamento_id.trim().toUpperCase()
        : "";
    const frota = normalizeFrotaCode(raw.frota);
    if (!tratorId || !frota) throw new Error("missing_trator_or_frota");

    const master = findEquipmentMasterRecordByFrota(masterStore.items, frota, null);
    if (!master || master.trator_id.toUpperCase() !== tratorId) throw new Error("equipment_not_found");
    assertTenantCompatibility(raw, master);
    const point = normalizeTrailPointInput(raw, master);
    if (!point) throw new Error("invalid_trail_point");
    return point;
  });

  await appendEquipmentTrailPoints(points);
  return { points };
}

async function ingestSnapshotTrailPoints() {
  const { upstream_status, data } = await fetchEquipmentStatusSnapshot();
  const points = await persistTrailPointsFromEquipmentStatus(data);
  return { upstream_status, points };
}

export async function POST(req: NextRequest) {
  const auth = await authorize(req);
  if (!auth.ok) {
    return auth.status === 403 ? forbidden() : unauthorized();
  }

  try {
    const before = await readEquipmentTrailStore();
    const bodyText = await req.clone().text().catch(() => "");
    if (bodyText.trim()) {
      const { points } = await ingestBodyTrailPoints(bodyText);
      if (points.length > 0) {
        const after = await readEquipmentTrailStore();
        return NextResponse.json(
          {
            collected: Math.max(after.points.length - before.points.length, 0),
            source_points: points.length,
            upstream_status: null,
            auth: auth.mode,
            status_operacional: points.at(-1)?.status_operacional || null,
            total_points: after.points.length,
          },
          { status: 200 },
        );
      }

      return NextResponse.json({ error: "bad_request", message: "empty_trail_payload" }, { status: 400 });
    }

    if (auth.mode === "mobile-token") {
      return NextResponse.json({ error: "bad_request", message: "empty_trail_payload" }, { status: 400 });
    }

    const snapshot = await ingestSnapshotTrailPoints();
    const after = await readEquipmentTrailStore();
    return NextResponse.json(
      {
        collected: Math.max(after.points.length - before.points.length, 0),
        source_points: snapshot.points.length,
        upstream_status: snapshot.upstream_status,
        auth: auth.mode,
        total_points: after.points.length,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "tenant_mismatch" || message === "missing_trator_or_frota" || message === "equipment_not_found" || message === "invalid_trail_point") {
      return NextResponse.json({ error: "bad_request", message }, { status: 400 });
    }
    const status = message === "invalid_trail_point" ? 400 : 500;
    return NextResponse.json({ error: status === 400 ? "bad_request" : "collector_failed", message }, { status });
  }
}
