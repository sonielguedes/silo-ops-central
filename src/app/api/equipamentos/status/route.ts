import { NextRequest, NextResponse } from "next/server";
import { IS_DEMO, SITE_URL } from "@/lib/app-env";
import { normalizeEquipmentList } from "@/lib/api";
import { filterItemsBySessionScope, getSessionFromRequest, normalizeScopeFields } from "@/lib/auth";
import { fetchEquipmentStatusSnapshot, persistTrailPointsFromEquipmentStatus } from "@/lib/equipment-status-trail";
import { normalizeEquipmentState } from "@/lib/equipment-state";
import { enrichEquipmentStatusWithMaster, findEquipmentMasterRecord, readEquipmentMasterStore } from "@/lib/equipment-master-store";

const B = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
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
      const merged = enrichEquipmentStatusWithMaster(item as Record<string, unknown>, master, true) as Record<string, unknown> & {
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
      };
      const state = normalizeEquipmentState({
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
        presence: state.presence,
        estado_operacional: state.estado_operacional,
        operacao_atual: state.operacao_atual,
        ultima_operacao_conhecida: state.ultima_operacao_conhecida,
        status_resumo: state.status_resumo,
        codigo_parada: state.codigo_parada,
        descricao_parada: state.descricao_parada,
        master: Boolean(master),
        cadastro_status: master ? "CADASTRADO" : (merged as any).cadastro_status || "NAO_CADASTRADO",
      };
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
        }, master, false) as Record<string, unknown> & {
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
        };
        const state = normalizeEquipmentState({
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
          presence: state.presence,
          estado_operacional: state.estado_operacional,
          operacao_atual: state.operacao_atual,
          ultima_operacao_conhecida: state.ultima_operacao_conhecida,
          status_resumo: state.status_resumo,
          codigo_parada: state.codigo_parada,
          descricao_parada: state.descricao_parada,
          master: true,
          tem_telemetria: false,
          cadastro_status: "CADASTRADO",
          has_coordinates: false,
          coord_source: "missing",
          coord_reason: "missing",
        };
      });

    return NextResponse.json([...enriched, ...missingMasterItems], { status: 200 });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[SIL] endpoint failed", { endpoint: "/api/equipamentos/status", status: null, error });
    return NextResponse.json([], { status: 200 });
  }
}
