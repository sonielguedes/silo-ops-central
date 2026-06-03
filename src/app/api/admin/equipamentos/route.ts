import { NextRequest, NextResponse } from "next/server";
import { forbidden, readJsonBody, requireSession, unauthorized } from "../_helpers";
import {
  filterEquipmentMasterBySession,
  readEquipmentMasterStore,
  upsertEquipmentMaster,
  type EquipmentMasterInput,
} from "@/lib/equipment-master-store";

export const runtime = "nodejs";

function canRead(sessionRole?: string | null) {
  return sessionRole === "ADMIN_GLOBAL" || sessionRole === "ADMIN_EMPRESA" || sessionRole === "VIEWER";
}

function canWrite(sessionRole?: string | null) {
  return sessionRole === "ADMIN_GLOBAL" || sessionRole === "ADMIN_EMPRESA";
}

function mapBody(body: Record<string, unknown>): EquipmentMasterInput {
  return {
    id: typeof body.id === "string" ? body.id : undefined,
    trator_id: typeof body.trator_id === "string" ? body.trator_id : undefined,
    nome: typeof body.nome === "string" ? body.nome : undefined,
    tipo_equipamento: typeof body.tipo_equipamento === "string" ? body.tipo_equipamento : undefined,
    modelo: typeof body.modelo === "string" ? body.modelo : undefined,
    grupo: typeof body.grupo === "string" ? body.grupo : undefined,
    perfil: typeof body.perfil === "string" ? body.perfil : undefined,
    placa: typeof body.placa === "string" ? body.placa : undefined,
    frota: typeof body.frota === "string" ? body.frota : undefined,
    fabricante: typeof body.fabricante === "string" ? body.fabricante : undefined,
    ano: typeof body.ano === "string" || typeof body.ano === "number" ? body.ano : undefined,
    status: typeof body.status === "string" ? body.status : undefined,
    gera_rastro: typeof body.gera_rastro === "boolean" || typeof body.gera_rastro === "number" || typeof body.gera_rastro === "string" ? body.gera_rastro : undefined,
    rotaciona_icone: typeof body.rotaciona_icone === "boolean" || typeof body.rotaciona_icone === "number" || typeof body.rotaciona_icone === "string" ? body.rotaciona_icone : undefined,
    usa_horimetro: typeof body.usa_horimetro === "boolean" || typeof body.usa_horimetro === "number" || typeof body.usa_horimetro === "string" ? body.usa_horimetro : undefined,
    usa_odometro: typeof body.usa_odometro === "boolean" || typeof body.usa_odometro === "number" || typeof body.usa_odometro === "string" ? body.usa_odometro : undefined,
    usa_area: typeof body.usa_area === "boolean" || typeof body.usa_area === "number" || typeof body.usa_area === "string" ? body.usa_area : undefined,
    unidade_medida: typeof body.unidade_medida === "string" ? body.unidade_medida : undefined,
    horimetro_inicial: typeof body.horimetro_inicial === "number" || typeof body.horimetro_inicial === "string" || body.horimetro_inicial === null ? body.horimetro_inicial : undefined,
    odometro_inicial: typeof body.odometro_inicial === "number" || typeof body.odometro_inicial === "string" || body.odometro_inicial === null ? body.odometro_inicial : undefined,
    empresa_id: typeof body.empresa_id === "string" ? body.empresa_id : undefined,
    usina_id: typeof body.usina_id === "string" ? body.usina_id : undefined,
    unidade_id: typeof body.unidade_id === "string" ? body.unidade_id : undefined,
  };
}

export async function GET(req: NextRequest) {
  const session = requireSession(req);
  if (!session) return unauthorized();
  if (!canRead(session.role)) return forbidden();

  const store = await readEquipmentMasterStore();
  return NextResponse.json(filterEquipmentMasterBySession(store.items, session), { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = requireSession(req);
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();

  const body = await readJsonBody(req);
  if (!body) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  try {
    const equipamento = await upsertEquipmentMaster(mapBody(body), session);
    return NextResponse.json({ ok: true, equipamento }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const status = typeof error === "object" && error && "status" in error
      ? Number((error as { status?: unknown }).status) || 400
      : message.includes("escopo") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
