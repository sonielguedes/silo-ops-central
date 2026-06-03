import { NextResponse } from "next/server";
import { APP_ENV, CAN_LOCAL_OPERADORES_CRUD, IS_DEMO } from "@/lib/app-env";

const TECH_EMPTY = IS_DEMO
  ? "Ambiente demonstrativo: histórico controlado localmente."
  : CAN_LOCAL_OPERADORES_CRUD
    ? `Modo local (${APP_ENV}): histórico sem backend real.`
    : "Serviço de histórico indisponível.";

export async function GET() {
  if (IS_DEMO || CAN_LOCAL_OPERADORES_CRUD) {
    return NextResponse.json({ historico: [], status_tecnico: TECH_EMPTY }, { status: 200 });
  }

  return NextResponse.json({
    historico: [],
    status_tecnico: "Histórico indisponível no momento.",
  }, { status: 200 });
}
