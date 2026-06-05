import { NextRequest, NextResponse } from "next/server";
import { IS_DEMO, SITE_URL } from "@/lib/app-env";
import { normalizeEquipmentList } from "@/lib/api";
import { filterItemsBySessionScope, normalizeScopeFields } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/auth-server";
import { fetchEquipmentStatusSnapshot, persistTrailPointsFromEquipmentStatus } from "@/lib/equipment-status-trail";
import { normalizeEquipmentState } from "@/lib/equipment-state";
import { enrichEquipmentStatusWithMaster, findEquipmentMasterRecord, readEquipmentMasterStore } from "@/lib/equipment-master-store";
import { mergeStatusItemWithTrailPoint, readEquipmentTrailStore, type TrailPoint } from "@/lib/equipment-trail-store";

const B = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

function buildLatestTrailMap(points: TrailPoint[]) {
  const latest = new Map<string, TrailPoint>();
  for (const point of points) {
    const current = latest.get(point.trator_id);
    const currentTs = current ? new Date(current.timestamp).getTime() : -1;
    const nextTs = new Date(point.timestamp).getTime();
    if (!current || nextTs >= currentTs) {
      latest.set(point.trator_id, point);
    }
  }
  return latest;
}

function finalizeStatusRow<T extends Record<string, unknown>>(
  item: T,
  master: { trator_id: string; frota: string; empresa_id: string; usina_id: string; unidade_id: string } | null,
  trailPoint: TrailPoint | null,
) {
  const merged = mergeStatusItemWithTrailPoint(item, trailPoint, master ? {
    trator_id: master.trator_id,
    frota: master.frota,
    empresa_id: master.empresa_id,
    usina_id: master.usina_id,
    unidade_id: master.unidade_id,
  } : null) as T & {
    presence?: string | null;
    updated_at?: string | null;
    last_seen?: string | null;
    estado_operacional?: string | null;
    operacao_nome?: string | null;
    operacao_id?: string | null;
    velocidade?: number | null;
    codigo_parada?: string | null;
    descricao_parada?: string | null;
    evento_status?: string | null;
    status?: string | null;
    status_operacional?: string | null;
    has_coordinates?: boolean | null;
    coord_source?: string | null;
    coord_reason?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    tem_telemetria?: boolean | null;
  };

  const normalized = normalizeEquipmentState({
    presence: merged.presence,
    updated_at: merged.updated_at ?? merged.last_seen,
    last_seen: merged.last_seen,
    estado_operacional: merged.estado_operacional,
    operacao_nome: merged.operacao_nome,
    operacao_id: merged.operacao_id,
    velocidade: merged.velocidade,
    codigo_parada: merged.codigo_parada,
    descricao_parada: merged.descricao_parada,
    evento_status: merged.evento_status,
    status: merged.status,
  });

  return {
    ...merged,
    presence: normalized.presence,
    estado_operacional: normalized.estado_operacional,
    operacao_atual: normalized.operacao_atual,
    ultima_operacao_conhecida: normalized.ultima_operacao_conhecida,
    status_resumo: normalized.status_resumo,
    codigo_parada: normalized.codigo_parada,
    descricao_parada: normalized.descricao_parada,
    status_operacional: typeof merged.status_operacional === "string" && merged.status_operacional.trim()
      ? merged.status_operacional.trim()
      : normalized.estado_operacional,
    master: Boolean(master),
    tem_telemetria: Boolean(merged.tem_telemetria ?? trailPoint ?? master),
    cadastro_status: master ? "CADASTRADO" : (merged as any).cadastro_status || "NAO_CADASTRADO",
  };
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (IS_DEMO || (SITE_URL && B === SITE_URL)) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const { data } = await fetchEquipmentStatusSnapshot();
    const masterStore = await readEquipmentMasterStore();
    await persistTrailPointsFromEquipmentStatus(data);
    const trailStore = await readEquipmentTrailStore();
    const latestTrailByTractor = buildLatestTrailMap(trailStore.points);

    const telemetryItems = filterItemsBySessionScope(normalizeEquipmentList(data).map((item) => ({
      ...item,
      ...normalizeScopeFields({
        empresa_id: (item as any).empresa_id,
        usina_id: (item as any).usina_id,
        unidade_id: (item as any).unidade_id,
      }),
    })), session);

    const telemetryById = new Map<string, Record<string, unknown>>();
    telemetryItems.forEach((item) => {
      const key = String(item.trator_id ?? "").trim();
      if (key) telemetryById.set(key, item as Record<string, unknown>);
    });

    const enriched = telemetryItems.map((item) => {
      const master = findEquipmentMasterRecord(masterStore.items, {
        trator_id: item.trator_id,
        empresa_id: (item as any).empresa_id,
        usina_id: (item as any).usina_id,
        unidade_id: (item as any).unidade_id,
      }, session);
      const merged = enrichEquipmentStatusWithMaster(item as Record<string, unknown>, master, true);
      const trailPoint = latestTrailByTractor.get(String(item.trator_id ?? "").trim()) || null;
      return finalizeStatusRow(merged as Record<string, unknown>, master, trailPoint);
    });

    const missingMasterItems = masterStore.items
      .filter((item) => !telemetryById.has(item.trator_id))
      .filter((item) => filterItemsBySessionScope([{
        trator_id: item.trator_id,
        empresa_id: item.empresa_id,
        usina_id: item.usina_id,
        unidade_id: item.unidade_id,
      }], session).length > 0)
      .map((master) => {
        const trailPoint = latestTrailByTractor.get(master.trator_id) || null;
        const merged = enrichEquipmentStatusWithMaster({
          trator_id: master.trator_id,
          status: "OFFLINE",
          presence: "OFFLINE",
          last_seen: new Date(0).toISOString(),
          updated_at: new Date(0).toISOString(),
          velocidade: null,
          latitude: null,
          longitude: null,
          has_coordinates: false,
          coord_source: "missing",
          coord_reason: "missing",
        }, master, false);

        return finalizeStatusRow(merged as Record<string, unknown>, master, trailPoint);
      });

    return NextResponse.json([...enriched, ...missingMasterItems], { status: 200 });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[SIL] endpoint failed", { endpoint: "/api/equipamentos/status", status: null, error });
    return NextResponse.json([], { status: 200 });
  }
}
