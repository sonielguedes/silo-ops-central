import { NextRequest, NextResponse } from "next/server";
import { IS_DEMO, SITE_URL } from "@/lib/app-env";
import { normalizeEquipmentList } from "@/lib/api";
import { filterItemsBySessionScope, getSessionFromRequest, normalizeScopeFields } from "@/lib/auth";
import { fetchEquipmentStatusSnapshot, persistTrailPointsFromEquipmentStatus } from "@/lib/equipment-status-trail";
import { normalizeEquipmentState } from "@/lib/equipment-state";

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
    await persistTrailPointsFromEquipmentStatus(data);
    const items = filterItemsBySessionScope(normalizeEquipmentList(data).map((item) => ({
      ...item,
      ...normalizeScopeFields({
        empresa_id: (item as any).empresa_id,
        usina_id: (item as any).usina_id,
        unidade_id: (item as any).unidade_id,
      }),
    })), session);

    // Aplicar normalizador central de presença × estado operacional
    const enriched = items.map((item) => {
      const state = normalizeEquipmentState({
        presence: item.presence,
        updated_at: item.updated_at ?? item.last_seen,
        last_seen: item.last_seen,
        estado_operacional: item.estado_operacional,
        operacao_nome: item.operacao_nome,
        operacao_id: item.operacao_id,
        velocidade: item.velocidade,
        codigo_parada: item.codigo_parada,
        descricao_parada: item.descricao_parada,
        evento_status: item.evento_status,
        status: item.status,
      });
      return {
        ...item,
        presence: state.presence,
        estado_operacional: state.estado_operacional,
        operacao_atual: state.operacao_atual,
        ultima_operacao_conhecida: state.ultima_operacao_conhecida,
        status_resumo: state.status_resumo,
        codigo_parada: state.codigo_parada,
        descricao_parada: state.descricao_parada,
      };
    });

    return NextResponse.json(enriched, { status: 200 });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[SIL] endpoint failed", { endpoint: "/api/equipamentos/status", status: null, error });
    return NextResponse.json([], { status: 200 });
  }
}
