import { NextRequest, NextResponse } from "next/server";
import { IS_DEMO, SITE_URL } from "@/lib/app-env";
import {
  applyScopeToUrl,
  getScopeFilter,
  getSessionFromRequest,
  isAdminGlobal,
  normalizeScopeFields,
} from "@/lib/auth";

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
    origem: item.origem ?? item.source ?? "API",
    ...normalizeScopeFields({
      empresa_id: item.empresa_id,
      usina_id: item.usina_id,
      unidade_id: item.unidade_id,
    }),
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
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (IS_DEMO || (SITE_URL && BASE === SITE_URL)) {
    return NextResponse.json({ eventos: [], status_tecnico: TECH_EMPTY, upstream_status: null, reason: "demo-mode" }, { status: 200 });
  }

  const origin = new URL(req.url).origin;
  const { searchParams } = new URL(req.url);
  const qs = searchParams.toString();
  const scope = getScopeFilter(session);
  const tech = (status: number | null, reason: string) =>
    NextResponse.json(
      { eventos: [], status_tecnico: TECH_EMPTY, upstream_status: status, reason },
      { status: 200 }
    );

  if (!BASE || BASE === origin) {
    return tech(null, "fallback-local");
  }

  const url = applyScopeToUrl(`${BASE}/api/eventos${qs ? `?${qs}` : ""}`, session);

  try {
    const { res, data } = await fetchUpstream(url);
    if (!res.ok) {
      console.error("[SIL] /api/eventos upstream failed", { status: res.status, url });
      return tech(res.status, "upstream-not-ok");
    }
    const eventos = normalizeEventos(data).filter((item) => {
      if (!scope || isAdminGlobal(session)) return true;
      const empresaOk = !scope.empresa_id || item.empresa_id === scope.empresa_id;
      const usinaOk = !scope.usina_ids?.length || scope.usina_ids.includes("*") || scope.usina_ids.includes(item.usina_id);
      const unidadeOk = !scope.unidade_ids?.length || scope.unidade_ids.includes("*") || scope.unidade_ids.includes(item.unidade_id);
      return empresaOk && usinaOk && unidadeOk;
    });
    return NextResponse.json(
      { eventos, status_tecnico: "ok", upstream_status: res.status },
      { status: 200 }
    );
  } catch (err) {
    console.error("[SIL] /api/eventos upstream error", { url, err: err instanceof Error ? err.message : String(err) });
    return tech(null, "upstream-error");
  }
}
