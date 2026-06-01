import { NextRequest, NextResponse } from "next/server";
import { IS_DEMO, SITE_URL } from "@/lib/app-env";

const BASE = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/$/, "");
const TECH_EMPTY = "Nenhum evento real recebido ainda";

function normalizeEventos(payload: unknown) {
  const items = Array.isArray(payload) ? payload : [];
  return items.map((item: any) => ({
    id: item.id ?? item.id_local ?? `${item.trator_id || "evt"}-${item.timestamp || item.horario || Date.now()}`,
    id_local: item.id_local ?? null,
    operacao_id: item.operacao_id ?? null,
    trator_id: item.trator_id ?? null,
    tipo_evento: item.tipo_evento ?? item.evento ?? "EVENTO",
    descricao: item.descricao ?? item.status ?? item.mensagem ?? null,
    timestamp: item.timestamp ?? item.horario ?? item.created_at ?? new Date().toISOString(),
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

  const url = `${BASE}/api/eventos${qs ? `?${qs}` : ""}`;

  try {
    const { res, data } = await fetchUpstream(url);
    if (!res.ok) {
      console.error("[SIL] /api/eventos upstream failed", { status: res.status, url });
      return tech(res.status, "upstream-not-ok");
    }
    return NextResponse.json(
      { eventos: normalizeEventos(data), status_tecnico: "ok", upstream_status: res.status },
      { status: 200 }
    );
  } catch (err) {
    console.error("[SIL] /api/eventos upstream error", { url, err: err instanceof Error ? err.message : String(err) });
    return tech(null, "upstream-error");
  }
}
