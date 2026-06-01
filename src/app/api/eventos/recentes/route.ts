import { NextRequest, NextResponse } from "next/server";
import { IS_DEMO, SITE_URL } from "@/lib/app-env";

const BASE = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/$/, "");
const TECH_EMPTY = "Nenhum evento real recebido ainda";

function normalizeEventos(payload: unknown) {
  const items = Array.isArray(payload) ? payload : [];
  return items.map((item: any) => ({
    horario: item.horario || item.timestamp || item.created_at || item.createdAt || new Date().toISOString(),
    equipamento: item.equipamento || item.trator_id || item.equipamento_id || "desconhecido",
    tipo_evento: item.tipo_evento || item.evento || item.tipo || "EVENTO",
    status: item.status || item.descricao || item.mensagem || "",
    origem: item.origem || item.source || "API",
    operacao_id: item.operacao_id || item.id_operacao || null,
    trator_id: item.trator_id || item.equipamento_id || item.equipamento || null,
  }));
}

async function fetchUpstream(url: string) {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(9000) });
  const text = await res.text();
  let data: unknown = [];
  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      data = [];
    }
  }
  return { res, data };
}

export async function GET(req: NextRequest) {
  if (IS_DEMO || (SITE_URL && BASE === SITE_URL)) {
    return NextResponse.json({ eventos: [], status_tecnico: TECH_EMPTY, upstream_status: null, reason: "demo-mode" }, { status: 200 });
  }

  const origin = new URL(req.url).origin;
  const { searchParams } = new URL(req.url);
  const qs = searchParams.toString();
  const tech = (status: number | null, reason: string) =>
    NextResponse.json(
      { eventos: [], status_tecnico: TECH_EMPTY, upstream_status: status, reason },
      { status: 200 }
    );

  if (!BASE || BASE === origin) {
    return tech(null, "fallback-local");
  }

  const candidates = [
    `${BASE}/api/eventos${qs ? `?${qs}` : ""}`,
    `${BASE}/api/eventos/recentes${qs ? `?${qs}` : ""}`,
  ];

  for (const url of candidates) {
    try {
      const { res, data } = await fetchUpstream(url);
      if (!res.ok) continue;
      return NextResponse.json(
        { eventos: normalizeEventos(data), status_tecnico: "ok", upstream_status: res.status },
        { status: 200 }
      );
    } catch (err) {
      console.error("[SIL] /api/eventos/recentes upstream error", { url, err: err instanceof Error ? err.message : String(err) });
    }
  }

  return tech(404, "upstream-empty");
}
