import { NextRequest, NextResponse } from "next/server";
import { IS_DEMO, SITE_URL } from "@/lib/app-env";
import { filterItemsBySessionScope, getSessionFromRequest, normalizeScopeFields } from "@/lib/auth";

const API_BASE = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

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

  if (IS_DEMO || (SITE_URL && API_BASE === SITE_URL)) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const res = await fetch(`${API_BASE}/api/operacoes/ativas`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend retornou HTTP ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const mapped = filterItemsBySessionScope((Array.isArray(data) ? data : []).map(normalize), session);
    return NextResponse.json(mapped, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
