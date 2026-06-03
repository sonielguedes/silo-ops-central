import { NextRequest, NextResponse } from "next/server";
import { APP_ENV, CAN_LOCAL_OPERADORES_CRUD, IS_DEMO } from "@/lib/app-env";
import { buildIntegracaoResumo, normalizeFichaList } from "@/lib/fichas-operacionais";

const TECH_EMPTY = IS_DEMO
  ? "Ambiente demonstrativo: integração controlada localmente."
  : CAN_LOCAL_OPERADORES_CRUD
    ? `Modo local (${APP_ENV}): integração sem backend real.`
    : "Serviço de integração indisponível.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const fichas = normalizeFichaList(body.fichas ?? body.records ?? body.data);
    const resumo = buildIntegracaoResumo(fichas);

    if (IS_DEMO || CAN_LOCAL_OPERADORES_CRUD) {
      return NextResponse.json({
        ok: true,
        status_tecnico: TECH_EMPTY,
        ...resumo,
        origem: "demo-local",
      }, { status: 200 });
    }

    return NextResponse.json({
      ok: true,
      status_tecnico: null,
      ...resumo,
      origem: "servico-local",
    }, { status: 200 });
  } catch (err) {
    console.error("[SIL] endpoint failed", { endpoint: "/api/fichas-operacionais/integrar", status: null, error: String(err), env: APP_ENV });
    return NextResponse.json({
      ok: false,
      status_tecnico: "Serviço de integração indisponível.",
      total: 0,
      incluidos: 0,
      alterados: 0,
      erros: 0,
      linhasComErro: [],
    }, { status: 502 });
  }
}
