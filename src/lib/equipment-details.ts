import { IS_DEMO, SITE_URL } from "@/lib/app-env";
import { normalizeEquipmentList } from "@/lib/api";
import { filterItemsBySessionScope, normalizeScopeFields, type SessionPayload } from "@/lib/auth";
import { enrichEquipmentStatusWithMaster, findEquipmentMasterRecord, readEquipmentMasterStore } from "@/lib/equipment-master-store";
import { enrichTrailPointWithOperationalContext, fetchEquipmentStatusSnapshot } from "@/lib/equipment-status-trail";
import { normalizeEquipmentState } from "@/lib/equipment-state";
import { queryEquipmentTrailPoints } from "@/lib/equipment-trail-store";
import { normalizeEquipmentType, type EquipmentType } from "@/lib/equipment-type";

const BASE = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, "");

export type EquipmentDetails = {
  trator_id: string;
  frota: string | null;
  nome_equipamento: string | null;
  tipo_equipamento: EquipmentType;
  cadastro_status: "CADASTRADO" | "SEM_TELEMETRIA" | "NAO_CADASTRADO" | "DESCONHECIDO" | null;
  tem_telemetria?: boolean | null;
  presence: string | null;
  status: string | null;
  estado_operacional: string | null;
  status_operacional?: string | null;
  operacao_id: string | null;
  operacao_nome: string | null;
  descricao_operacao: string | null;
  codigo_parada: string | null;
  descricao_parada: string | null;
  velocidade: number | null;
  operador: string | null;
  comunicacao: string | null;
  latitude: number | null;
  longitude: number | null;
  bateria: number | null;
  fazenda: string | null;
  frente: string | null;
  talhao: string | null;
  zona: string | null;
  updated_at: string | null;
  evento_status: string | null;
  motivo_status: string | null;
  operacao_atual: string | null;
  ultima_operacao_conhecida: string | null;
  status_resumo: string | null;
};

type NormalizedStatus = Record<string, unknown> & {
  trator_id: string;
  frota?: string | null;
  tipo_equipamento?: string | null;
  nome?: string | null;
  modelo?: string | null;
  descricao?: string | null;
  presence?: string | null;
  status?: string | null;
  estado_operacional?: string | null;
  operacao_id?: string | null;
  operacao_nome?: string | null;
  descricao_operacao?: string | null;
  codigo_parada?: string | null;
  descricao_parada?: string | null;
  velocidade?: number | null;
  operador?: string | null;
  comunicacao?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  bateria?: number | null;
  fazenda?: string | null;
  frente?: string | null;
  talhao?: string | null;
  zona?: string | null;
  updated_at?: string | null;
  evento_status?: string | null;
  motivo_status?: string | null;
  cadastro_status?: string | null;
};

type NormalizedOperation = Record<string, unknown> & {
  operacao_id: string;
  trator_id: string;
  operador_id: string | null;
  nome_operador: string | null;
  status: string | null;
  inicio: string;
  velocidade_atual: number | null;
  bateria: number | null;
  last_seen: string | null;
  fazenda?: string | null;
  frente?: string | null;
  talhao?: string | null;
  zona?: string | null;
  operacao_atual?: string | null;
  descricao_operacao?: string | null;
};

type NormalizedEvent = Record<string, unknown> & {
  trator_id: string | null;
  operacao_id: string | null;
  tipo_evento: string;
  descricao: string | null;
  timestamp: string;
  origem: string | null;
  codigo_parada: string | null;
  descricao_parada: string | null;
  evento_status: string | null;
  motivo_status: string | null;
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseTime(value: unknown): number | null {
  if (!value) return null;
  const ms = new Date(String(value)).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function latestByTimestamp<T extends { timestamp?: string | null; updated_at?: string | null; last_seen?: string | null; inicio?: string | null }>(items: T[]): T | null {
  return [...items].sort((a, b) => {
    const aTs = parseTime(a.timestamp || a.updated_at || a.last_seen || a.inicio);
    const bTs = parseTime(b.timestamp || b.updated_at || b.last_seen || b.inicio);
    return (bTs || 0) - (aTs || 0);
  })[0] || null;
}

function normalizeStatusItem(item: Record<string, unknown>): NormalizedStatus {
  const coords = {
    latitude: numberValue(item.latitude ?? item.lat),
    longitude: numberValue(item.longitude ?? item.lng),
  };
  return {
    ...item,
    ...normalizeScopeFields({
      empresa_id: text(item.empresa_id) || undefined,
      usina_id: text(item.usina_id) || undefined,
      unidade_id: text(item.unidade_id) || undefined,
    }),
    trator_id: text(item.trator_id ?? item.id ?? item.equipamento_id) || "",
    frota: text(item.frota),
    tipo_equipamento: text(item.tipo_equipamento ?? item.tipo ?? item.category ?? item.categoria_equipamento),
    nome: text(item.nome ?? item.name ?? item.apelido),
    modelo: text(item.modelo ?? item.model ?? item.modelo_equipamento),
    descricao: text(item.descricao ?? item.description ?? item.descricao_modelo),
    presence: text(item.presence ?? item.presenca ?? item.presenca_operacional ?? item.status_presenca),
    status: text(item.status ?? item.operacao_atual ?? item.operacao),
    estado_operacional: text(item.estado_operacional),
    operacao_id: text(item.operacao_id),
    operacao_nome: text(item.operacao_nome ?? item.operacao_atual ?? item.operacao),
    descricao_operacao: text(item.descricao_operacao ?? item.operacao_descricao ?? item.descricao ?? item.mensagem),
    codigo_parada: text(item.codigo_parada ?? item.stop_code),
    descricao_parada: text(item.descricao_parada ?? item.motivo_parada ?? item.stop_reason ?? item.descricao),
    velocidade: numberValue(item.velocidade ?? item.speed),
    operador: text(item.operador ?? item.nome_operador ?? item.operador_nome),
    comunicacao: text(item.comunicacao ?? item.gps_source ?? item.coord_reason),
    latitude: coords.latitude,
    longitude: coords.longitude,
    bateria: numberValue(item.bateria ?? item.battery ?? item.battery_level),
    fazenda: text(item.fazenda),
    frente: text(item.frente),
    talhao: text(item.talhao),
    zona: text(item.zona),
    updated_at: text(item.updated_at ?? item.last_seen ?? item.timestamp),
    evento_status: text(item.evento_status),
    motivo_status: text(item.motivo_status),
  };
}

function normalizeOperationItem(item: Record<string, unknown>): NormalizedOperation {
  return {
    ...item,
    ...normalizeScopeFields({
      empresa_id: text(item.empresa_id) || undefined,
      usina_id: text(item.usina_id) || undefined,
      unidade_id: text(item.unidade_id) || undefined,
    }),
    operacao_id: text(item.id_local ?? item.operacao_id) || "",
    trator_id: text(item.trator_id) || "",
    operador_id: text(item.operador_id),
    nome_operador: text(item.nome_operador),
    status: text(item.status),
    inicio: text(item.inicio_real ?? item.criado_em ?? item.inicio) || new Date().toISOString(),
    velocidade_atual: numberValue(item.velocidade_atual),
    bateria: numberValue(item.bateria),
    last_seen: text(item.last_seen ?? item.criado_em),
    fazenda: text(item.fazenda),
    frente: text(item.frente),
    talhao: text(item.talhao),
    zona: text(item.zona),
    operacao_atual: text(item.operacao_atual ?? item.status),
    descricao_operacao: text(item.descricao_operacao ?? item.operacao_descricao ?? item.descricao ?? item.mensagem),
  };
}

function normalizeEventItem(item: Record<string, unknown>): NormalizedEvent {
  return {
    ...item,
    ...normalizeScopeFields({
      empresa_id: text(item.empresa_id) || undefined,
      usina_id: text(item.usina_id) || undefined,
      unidade_id: text(item.unidade_id) || undefined,
    }),
    trator_id: text(item.trator_id ?? item.equipamento_id ?? item.id) || null,
    operacao_id: text(item.operacao_id),
    tipo_evento: text(item.tipo_evento ?? item.evento ?? item.tipo) || "EVENTO",
    descricao: text(item.descricao ?? item.status ?? item.mensagem),
    timestamp: text(item.timestamp ?? item.horario ?? item.created_at ?? item.createdAt) || new Date().toISOString(),
    origem: text(item.origem ?? item.source) || "API",
    codigo_parada: text(item.codigo_parada ?? item.stop_code),
    descricao_parada: text(item.descricao_parada ?? item.motivo_parada ?? item.stop_reason ?? item.descricao),
    evento_status: text(item.evento_status ?? item.status ?? item.tipo_evento),
    motivo_status: text(item.motivo_status ?? item.motivo ?? item.descricao ?? item.mensagem ?? item.reason),
  };
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(9000) });
  const textBody = await res.text();
  let data: unknown = [];
  if (textBody.trim()) {
    try {
      data = JSON.parse(textBody);
    } catch {
      data = [];
    }
  }
  return { res, data };
}

export async function fetchOperacoesAtivasSnapshot() {
  if (IS_DEMO || (SITE_URL && BASE === SITE_URL)) return [];
  const { res, data } = await fetchJson(`${BASE}/api/operacoes/ativas`);
  if (!res.ok) return [];
  return (Array.isArray(data) ? data : []).map((item) => normalizeOperationItem((item ?? {}) as Record<string, unknown>));
}

export async function fetchEventosSnapshot() {
  if (IS_DEMO || (SITE_URL && BASE === SITE_URL)) return [];
  const { res, data } = await fetchJson(`${BASE}/api/eventos`);
  if (!res.ok) return [];
  const eventos = Array.isArray(data) ? data : Array.isArray((data as { eventos?: unknown[] })?.eventos) ? (data as { eventos: unknown[] }).eventos : [];
  return eventos.map((item) => normalizeEventItem((item ?? {}) as Record<string, unknown>));
}

export async function fetchEventosRecentesSnapshot() {
  if (IS_DEMO || (SITE_URL && BASE === SITE_URL)) return [];
  const { res, data } = await fetchJson(`${BASE}/api/eventos/recentes`);
  if (!res.ok) return [];
  const eventos = Array.isArray(data) ? data : Array.isArray((data as { eventos?: unknown[] })?.eventos) ? (data as { eventos: unknown[] }).eventos : [];
  return eventos.map((item) => normalizeEventItem((item ?? {}) as Record<string, unknown>));
}

function applyScope<T extends Record<string, unknown>>(rows: T[], session: SessionPayload | null | undefined): T[] {
  return filterItemsBySessionScope(rows, session || null);
}

export async function buildEquipmentDetails(tratorId: string, session: SessionPayload | null | undefined): Promise<EquipmentDetails | null> {
  const [statusSnapshot, operacoes, eventos, recentes, trail] = await Promise.all([
    fetchEquipmentStatusSnapshot(),
    fetchOperacoesAtivasSnapshot(),
    fetchEventosSnapshot(),
    fetchEventosRecentesSnapshot(),
    queryEquipmentTrailPoints({ tratorId, limit: 1, session: session || null }),
  ]);

  const statusItems = applyScope(
    normalizeEquipmentList(statusSnapshot.data)
      .map((item) => normalizeStatusItem(item as unknown as Record<string, unknown>))
      .filter((item) => item.trator_id),
    session,
  );
  const masterStore = await readEquipmentMasterStore();
  const statusItem = statusItems.find((item) => item.trator_id === tratorId) || null;
  const master = findEquipmentMasterRecord(masterStore.items, {
    trator_id: tratorId,
    empresa_id: statusItem?.empresa_id as string | undefined,
    usina_id: statusItem?.usina_id as string | undefined,
    unidade_id: statusItem?.unidade_id as string | undefined,
  }, session || null);
  const temTelemetria = Boolean(statusItem?.tem_telemetria ?? statusItem);
  const cadastroStatus = master ? "CADASTRADO" : ((statusItem?.cadastro_status as EquipmentDetails["cadastro_status"]) || (statusItem ? "NAO_CADASTRADO" : "DESCONHECIDO"));
  const opItem = applyScope(operacoes.filter((item) => item.trator_id === tratorId), session);
  const eventItems = applyScope([...eventos, ...recentes].filter((item) => item.trator_id === tratorId || item.operacao_id === statusItem?.operacao_id), session);
  const trailItem = trail.length > 0 ? enrichTrailPointWithOperationalContext(trail[trail.length - 1]) : null;

  if (!statusItem && !master && !opItem[0] && !trailItem && eventItems.length === 0) {
    return null;
  }

  const op = latestByTimestamp(opItem);
  const event = latestByTimestamp(eventItems);
  const statusBase = statusItem ? enrichEquipmentStatusWithMaster(statusItem, master, temTelemetria) : null;
  const base = statusBase || (master ? {
    trator_id: master.trator_id,
    frota: master.frota,
    nome: master.nome,
    tipo_equipamento: master.tipo_equipamento,
    modelo: master.modelo,
    grupo: master.grupo,
    perfil: master.perfil,
    status: "OFFLINE",
    presence: "OFFLINE",
    estado_operacional: null,
    operacao_id: null,
    operacao_nome: null,
    descricao_operacao: null,
    codigo_parada: null,
    descricao_parada: null,
    velocidade: null,
    operador: null,
    comunicacao: null,
    latitude: null,
    longitude: null,
    bateria: null,
    fazenda: null,
    frente: null,
    talhao: null,
    zona: null,
    updated_at: null,
    evento_status: null,
    motivo_status: null,
    cadastro_status: "CADASTRADO",
    tem_telemetria: false,
    empresa_id: master.empresa_id,
    usina_id: master.usina_id,
    unidade_id: master.unidade_id,
  } as NormalizedStatus : {
    trator_id: tratorId,
    cadastro_status: cadastroStatus,
    status: null,
    presence: null,
    estado_operacional: null,
    operacao_id: null,
    operacao_nome: null,
    descricao_operacao: null,
    codigo_parada: null,
    descricao_parada: null,
    velocidade: null,
    operador: null,
    comunicacao: null,
    latitude: null,
    longitude: null,
    bateria: null,
    fazenda: null,
    frente: null,
    talhao: null,
    zona: null,
    updated_at: null,
    evento_status: null,
    motivo_status: null,
  } as NormalizedStatus);

  const lastUpdatedMs = Math.max(
    parseTime(base.updated_at) || 0,
    parseTime(op?.last_seen || op?.inicio) || 0,
    parseTime(event?.timestamp) || 0,
    parseTime(trailItem?.timestamp) || 0,
  );
  const updatedAt = lastUpdatedMs > 0 ? new Date(lastUpdatedMs).toISOString() : base.updated_at || op?.last_seen || op?.inicio || event?.timestamp || trailItem?.timestamp || null;
  const type = normalizeEquipmentType({
    tipo_equipamento: base.tipo_equipamento,
    tipo: base.tipo,
    nome: base.nome,
    modelo: base.modelo,
    descricao: base.descricao,
    trator_id: base.trator_id,
  });

  const rawDetails = {
    trator_id: tratorId,
    frota: text(base.frota ?? master?.frota ?? null),
    nome_equipamento: text(base.nome ?? base.modelo ?? base.descricao ?? (cadastroStatus === "NAO_CADASTRADO" ? "Não cadastrado" : tratorId)),
    tipo_equipamento: type,
    cadastro_status: cadastroStatus,
    tem_telemetria: master
      ? temTelemetria
      : (typeof statusItem?.tem_telemetria === "boolean" ? statusItem.tem_telemetria : null),
    presence: base.presence || null,
    status: base.status || op?.status || (cadastroStatus === "NAO_CADASTRADO" ? "Não cadastrado" : null),
    estado_operacional: trailItem?.estado_operacional || base.estado_operacional || null,
    operacao_id: op?.operacao_id || base.operacao_id || event?.operacao_id || null,
    operacao_nome: op?.operacao_atual || op?.status || base.operacao_nome || null,
    descricao_operacao: op?.descricao_operacao || base.descricao_operacao || event?.descricao || null,
    codigo_parada: trailItem?.codigo_parada || base.codigo_parada || event?.codigo_parada || null,
    descricao_parada: trailItem?.descricao_parada || base.descricao_parada || event?.descricao_parada || null,
    velocidade: trailItem?.velocidade ?? op?.velocidade_atual ?? base.velocidade ?? null,
    operador: op?.nome_operador || base.operador || null,
    comunicacao: base.comunicacao || (base.presence ? `Presença ${base.presence}` : (temTelemetria ? null : "Sem telemetria")),
    latitude: trailItem?.latitude ?? base.latitude ?? null,
    longitude: trailItem?.longitude ?? base.longitude ?? null,
    bateria: op?.bateria ?? base.bateria ?? null,
    fazenda: op?.fazenda || base.fazenda || null,
    frente: op?.frente || base.frente || null,
    talhao: op?.talhao || base.talhao || null,
    zona: op?.zona || base.zona || null,
    updated_at: updatedAt,
    evento_status: event?.evento_status || trailItem?.evento_status || base.evento_status || null,
    motivo_status: event?.motivo_status || trailItem?.motivo_status || base.motivo_status || null,
  };

  // Aplicar normalizador central para separar presença técnica de estado operacional
  const normalized = normalizeEquipmentState({
    presence: rawDetails.presence,
    updated_at: rawDetails.updated_at,
    last_seen: updatedAt,
    estado_operacional: rawDetails.estado_operacional,
    operacao_nome: rawDetails.operacao_nome,
    operacao_id: rawDetails.operacao_id,
    velocidade: rawDetails.velocidade,
    codigo_parada: rawDetails.codigo_parada,
    descricao_parada: rawDetails.descricao_parada,
    evento_status: rawDetails.evento_status,
    status: rawDetails.status,
  });

  return {
    ...rawDetails,
    presence: normalized.presence,
    estado_operacional: normalized.estado_operacional,
    codigo_parada: normalized.codigo_parada,
    descricao_parada: normalized.descricao_parada,
    operacao_atual: normalized.operacao_atual,
    ultima_operacao_conhecida: normalized.ultima_operacao_conhecida,
    status_resumo: normalized.status_resumo,
    cadastro_status: cadastroStatus,
    frota: rawDetails.frota,
  };
}
