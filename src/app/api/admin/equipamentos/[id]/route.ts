import { NextRequest, NextResponse } from "next/server";
import { forbidden, readJsonBody, requireSession, unauthorized } from "../../_helpers";
import {
  getEquipmentMasterById,
  filterEquipmentMasterBySession,
  readEquipmentMasterStore,
  upsertEquipmentMaster,
  type EquipmentMasterRecord,
  type EquipmentMasterInput,
} from "@/lib/equipment-master-store";
import { isAdminGlobal } from "@/lib/auth";

export const runtime = "nodejs";

function canRead(sessionRole?: string | null) {
  return sessionRole === "ADMIN_GLOBAL" || sessionRole === "ADMIN_EMPRESA" || sessionRole === "VIEWER";
}

function canWrite(sessionRole?: string | null) {
  return sessionRole === "ADMIN_GLOBAL" || sessionRole === "ADMIN_EMPRESA";
}

function readTextField(body: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function mapBody(body: Record<string, unknown>, id: string, existing?: EquipmentMasterRecord | null): EquipmentMasterInput {
  return {
    id,
    trator_id: readTextField(body, "trator_id") ?? existing?.trator_id,
    nome: readTextField(body, "nome", "descricao", "descricao_equipamento") ?? existing?.nome,
    tipo_equipamento: readTextField(body, "tipo_equipamento", "tipo") ?? existing?.tipo_equipamento,
    modelo: readTextField(body, "modelo", "model") ?? existing?.modelo,
    grupo: readTextField(body, "grupo", "group") ?? existing?.grupo,
    perfil: readTextField(body, "perfil", "profile") ?? existing?.perfil,
    placa: readTextField(body, "placa") ?? existing?.placa,
    frota: readTextField(body, "frota", "codigo_frota", "codigo") ?? existing?.frota,
    fabricante: readTextField(body, "fabricante", "marca") ?? existing?.fabricante,
    ano: typeof body.ano === "string" || typeof body.ano === "number" ? body.ano : existing?.ano,
    status: readTextField(body, "status") ?? existing?.status,
    gera_rastro: typeof body.gera_rastro === "boolean" || typeof body.gera_rastro === "number" || typeof body.gera_rastro === "string" ? body.gera_rastro : existing?.gera_rastro,
    rotaciona_icone: typeof body.rotaciona_icone === "boolean" || typeof body.rotaciona_icone === "number" || typeof body.rotaciona_icone === "string" ? body.rotaciona_icone : existing?.rotaciona_icone,
    usa_horimetro: typeof body.usa_horimetro === "boolean" || typeof body.usa_horimetro === "number" || typeof body.usa_horimetro === "string" ? body.usa_horimetro : existing?.usa_horimetro,
    usa_odometro: typeof body.usa_odometro === "boolean" || typeof body.usa_odometro === "number" || typeof body.usa_odometro === "string" ? body.usa_odometro : existing?.usa_odometro,
    usa_area: typeof body.usa_area === "boolean" || typeof body.usa_area === "number" || typeof body.usa_area === "string" ? body.usa_area : existing?.usa_area,
    unidade_medida: readTextField(body, "unidade_medida") ?? existing?.unidade_medida,
    horimetro_inicial: typeof body.horimetro_inicial === "number" || typeof body.horimetro_inicial === "string" || body.horimetro_inicial === null ? body.horimetro_inicial : existing?.horimetro_inicial,
    odometro_inicial: typeof body.odometro_inicial === "number" || typeof body.odometro_inicial === "string" || body.odometro_inicial === null ? body.odometro_inicial : existing?.odometro_inicial,
    empresa_id: readTextField(body, "empresa_id") ?? existing?.empresa_id,
    usina_id: readTextField(body, "usina_id") ?? existing?.usina_id,
    unidade_id: readTextField(body, "unidade_id") ?? existing?.unidade_id,
  };
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = requireSession(req);
  if (!session) return unauthorized();
  if (!canRead(session.role)) return forbidden();

  const { id } = await context.params;
  const store = await readEquipmentMasterStore();
  const equipamento = getEquipmentMasterById(store.items, id);
  if (!equipamento) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isAdminGlobal(session) && filterEquipmentMasterBySession([equipamento], session).length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(equipamento, { status: 200 });
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = requireSession(req);
  if (!session) return unauthorized();
  if (!canWrite(session.role)) return forbidden();

  const body = await readJsonBody(req);
  if (!body) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const { id } = await context.params;
  try {
    const store = await readEquipmentMasterStore();
    const existing = getEquipmentMasterById(store.items, id);
    const equipamento = await upsertEquipmentMaster(mapBody(body, existing?.id || id, existing), session);
    return NextResponse.json({ ok: true, equipamento }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const status = message.includes("escopo") ? 403 : message.includes("obrigatórios") ? 400 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
