import { NextRequest, NextResponse } from "next/server";
import { IS_DEMO, SITE_URL } from "@/lib/app-env";
import { getScopeFilter, getSessionFromRequest, isAdminGlobal, normalizeScopeFields } from "@/lib/auth";

const B = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

function normalize(item: any) {
  return {
    operacao_id: item.id_local || item.operacao_id || "",
    trator_id: item.trator_id || "",
    operador_id: item.operador_id || null,
    nome_operador: item.nome_operador || null,
    status: item.status || "",
    inicio: item.inicio_real || item.criado_em || new Date().toISOString(),
    velocidade_atual: item.velocidade_atual !== undefined ? item.velocidade_atual : null,
    bateria: item.bateria !== undefined ? item.bateria : null,
    last_seen: item.last_seen || item.criado_em || null,
    fazenda: item.fazenda || undefined,
    talhao: item.talhao || undefined,
    ...normalizeScopeFields({
      empresa_id: item.empresa_id,
      usina_id: item.usina_id,
      unidade_id: item.unidade_id,
    }),
  };
}

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (IS_DEMO || (SITE_URL && B === SITE_URL)) {
    return NextResponse.json([], { status: 200 });
  }

  const scope = getScopeFilter(session);

  try {
    const r = await fetch(`${B}/api/operacoes/ativas`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) {
      return NextResponse.json(
        { error: `Backend retornou HTTP ${r.status}` },
        { status: 200 }
      );
    }
    const d = await r.json();
    const mapped = (Array.isArray(d) ? d : []).map(normalize).filter((item: any) => {
      if (!scope || isAdminGlobal(session)) return true;
      const empresaOk = !scope.empresa_id || item.empresa_id === scope.empresa_id;
      const usinaOk = !scope.usina_ids?.length || scope.usina_ids.includes("*") || scope.usina_ids.includes(item.usina_id);
      const unidadeOk = !scope.unidade_ids?.length || scope.unidade_ids.includes("*") || scope.unidade_ids.includes(item.unidade_id);
      return empresaOk && usinaOk && unidadeOk;
    });
    return NextResponse.json(mapped, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
