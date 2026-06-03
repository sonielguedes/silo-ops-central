export type FichaStatus = "PENDENTE" | "EXPORTADO" | "ATUALIZADO" | "INCONSISTENTE";
export type FichaExportFormat = "csv" | "txt";

export interface FichaOperacional {
  id_local: string;
  regiao: string;
  unidade: string;
  grupoEquipamento: string;
  equipamentoId: string;
  operadorId: string;
  dataHoraLocal: string;
  status: FichaStatus;
  tipoEquipamento: string;
  fazenda: string;
  zona: string;
  talhao: string;
  centroCusto: string;
  horas: number;
  origem: string;
  exportadoEm: string | null;
  operadorNome?: string | null;
  equipamentoNome?: string | null;
  observacao?: string | null;
}

export interface FichaExportResult {
  ok: boolean;
  reason?: string;
}

export interface FichaIntegracaoResumo {
  total: number;
  incluidos: number;
  alterados: number;
  erros: number;
  linhasComErro: string[];
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseStatus(value: unknown): FichaStatus {
  const status = toText(value).toUpperCase();
  if (status === "EXPORTADO") return "EXPORTADO";
  if (status === "ATUALIZADO") return "ATUALIZADO";
  if (status === "INCONSISTENTE") return "INCONSISTENTE";
  return "PENDENTE";
}

function deriveHoras(input: Record<string, unknown>): number {
  const explicit = toNumber(input.horas);
  if (explicit > 0) return explicit;

  const fromDelta = toNumber(input.horimetro_delta);
  if (fromDelta > 0) return fromDelta;

  const productive = toNumber(input.tempo_produtivo_segundos);
  if (productive > 0) return Number((productive / 3600).toFixed(2));

  return 0;
}

export function normalizeFicha(item: Record<string, unknown>): FichaOperacional {
  const payload = (item.payload_json && typeof item.payload_json === "object" ? item.payload_json : {}) as Record<string, unknown>;
  const status = parseStatus(item.status);
  const dataHoraLocal = toText(item.dataHoraLocal || item.inicio || item.criado_em || item.atualizado_em || item.timestamp || new Date().toISOString());
  const fazenda = toText(item.fazenda ?? payload.fazenda ?? payload.farm);
  const zona = toText(item.zona ?? payload.zona ?? payload.zone);
  const talhao = toText(item.talhao ?? payload.talhao ?? payload.plot);

  return {
    id_local: toText(item.id_local || item.idLocal || item.id || crypto.randomUUID()),
    regiao: toText(item.regiao ?? payload.regiao ?? payload.region ?? "REGIÃO PADRÃO"),
    unidade: toText(item.unidade ?? payload.unidade ?? payload.unit ?? "UNIDADE PADRÃO"),
    grupoEquipamento: toText(item.grupoEquipamento ?? payload.grupoEquipamento ?? payload.group ?? "GRUPO A"),
    equipamentoId: toText(item.equipamentoId ?? item.trator_id ?? item.equipamento_id ?? item.equipmentId ?? "N/A"),
    operadorId: toText(item.operadorId ?? item.operador_id ?? item.operatorId ?? "N/A"),
    dataHoraLocal,
    status,
    tipoEquipamento: toText(item.tipoEquipamento ?? item.implemento ?? payload.tipoEquipamento ?? "TRATOR"),
    fazenda,
    zona,
    talhao,
    centroCusto: toText(item.centroCusto ?? payload.centroCusto ?? payload.costCenter ?? "0000"),
    horas: deriveHoras(item),
    origem: toText(item.origem ?? payload.origem ?? "API"),
    exportadoEm: toText(item.exportadoEm ?? payload.exportadoEm) || null,
    operadorNome: item.nome_operador ? toText(item.nome_operador) : toText(payload.operadorNome) || null,
    equipamentoNome: item.equipamentoNome ? toText(item.equipamentoNome) : toText(payload.equipamentoNome) || null,
    observacao: toText(item.observacao ?? payload.observacao) || null,
  };
}

export function normalizeFichaList(data: unknown): FichaOperacional[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { fichas?: unknown[] } | null)?.fichas)
      ? (data as { fichas: unknown[] }).fichas
      : Array.isArray((data as { data?: unknown[] } | null)?.data)
        ? (data as { data: unknown[] }).data
        : [];
  return list.map(item => normalizeFicha((item ?? {}) as Record<string, unknown>));
}

export function fichaNeedsCorrection(ficha: FichaOperacional): boolean {
  return ficha.status === "INCONSISTENTE" && (!ficha.fazenda || !ficha.zona || !ficha.talhao || !ficha.centroCusto);
}

export function canExportFicha(ficha: FichaOperacional): FichaExportResult {
  if (ficha.status === "EXPORTADO") {
    return { ok: false, reason: "Ficha exportada precisa ser atualizada antes de novo envio." };
  }
  if (fichaNeedsCorrection(ficha)) {
    return { ok: false, reason: "Ficha inconsistente exige fazenda, zona, talhão e centro de custo antes de exportar." };
  }
  return { ok: true };
}

export function canIntegrateFicha(ficha: FichaOperacional): FichaExportResult {
  if (ficha.status === "INCONSISTENTE" || fichaNeedsCorrection(ficha)) {
    return { ok: false, reason: "Ficha inconsistente exige fazenda, zona, talhão e centro de custo antes de integrar." };
  }
  if (ficha.status === "EXPORTADO") {
    return { ok: false, reason: "Ficha exportada precisa ser marcada como atualizada antes de nova integração." };
  }
  return { ok: true };
}

export function canExportAll(fichas: FichaOperacional[]): FichaExportResult {
  for (const ficha of fichas) {
    const result = canExportFicha(ficha);
    if (!result.ok) return result;
  }
  return { ok: true };
}

export function buildIntegracaoResumo(fichas: FichaOperacional[]): FichaIntegracaoResumo {
  const blocked = fichas.filter(f => !canIntegrateFicha(f).ok);
  return {
    total: fichas.length,
    incluidos: fichas.length - blocked.length,
    alterados: fichas.filter(f => f.status === "ATUALIZADO").length,
    erros: blocked.length,
    linhasComErro: blocked.map(f => `${f.equipamentoId} - ${canIntegrateFicha(f).reason || "Erro técnico"}`),
  };
}

function csvEscape(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  return `"${raw.replaceAll('"', '""')}"`;
}

export function fichasToCsv(fichas: FichaOperacional[]): string {
  const headers = [
    "regiao",
    "unidade",
    "grupoEquipamento",
    "equipamentoId",
    "operadorId",
    "dataHoraLocal",
    "status",
    "tipoEquipamento",
    "fazenda",
    "zona",
    "talhao",
    "centroCusto",
    "horas",
    "origem",
    "exportadoEm",
  ];
  const rows = fichas.map(f => [
    f.regiao,
    f.unidade,
    f.grupoEquipamento,
    f.equipamentoId,
    f.operadorId,
    f.dataHoraLocal,
    f.status,
    f.tipoEquipamento,
    f.fazenda,
    f.zona,
    f.talhao,
    f.centroCusto,
    f.horas.toFixed(2),
    f.origem,
    f.exportadoEm || "",
  ]);
  return "\uFEFF" + [headers.join(","), ...rows.map(row => row.map(csvEscape).join(","))].join("\n");
}

export const gerarCSV = fichasToCsv;

export function fichasToTxt(fichas: FichaOperacional[]): string {
  const lines = fichas.map(f => [
    f.regiao,
    f.unidade,
    f.grupoEquipamento,
    f.equipamentoId,
    f.operadorId,
    f.dataHoraLocal,
    f.status,
    f.tipoEquipamento,
    f.fazenda,
    f.zona,
    f.talhao,
    f.centroCusto,
    f.horas.toFixed(2),
    f.origem,
    f.exportadoEm || "",
  ].join("\t"));
  return [
    "regiao\tunidade\tgrupoEquipamento\tequipamentoId\toperadorId\tdataHoraLocal\tstatus\ttipoEquipamento\tfazenda\tzona\ttalhao\tcentroCusto\thoras\torigem\texportadoEm",
    ...lines,
  ].join("\n");
}

export const gerarTXT = fichasToTxt;

export function buildDemoFichas(): FichaOperacional[] {
  const base = new Date("2026-06-01T08:00:00-03:00").toISOString();
  return [
    {
      id_local: "demo-001",
      regiao: "Norte",
      unidade: "U-01",
      grupoEquipamento: "Tratores",
      equipamentoId: "T01",
      operadorId: "44564",
      operadorNome: "Operador Alfa",
      dataHoraLocal: base,
      status: "PENDENTE",
      tipoEquipamento: "TRATOR",
      fazenda: "Fazenda Bela Vista",
      zona: "Zona A",
      talhao: "Talhão 12",
      centroCusto: "CC-100",
      horas: 4.5,
      origem: "DEMO",
      exportadoEm: null,
      equipamentoNome: "T01",
    },
    {
      id_local: "demo-002",
      regiao: "Sul",
      unidade: "U-02",
      grupoEquipamento: "Colhedoras",
      equipamentoId: "CH03",
      operadorId: "55211",
      operadorNome: "Operador Beta",
      dataHoraLocal: new Date("2026-06-01T10:30:00-03:00").toISOString(),
      status: "EXPORTADO",
      tipoEquipamento: "COLHEDORA",
      fazenda: "Fazenda Rio Grande",
      zona: "Zona B",
      talhao: "Talhão 04",
      centroCusto: "CC-200",
      horas: 6.2,
      origem: "DEMO",
      exportadoEm: new Date("2026-06-01T12:15:00-03:00").toISOString(),
      equipamentoNome: "CH03",
    },
    {
      id_local: "demo-003",
      regiao: "Leste",
      unidade: "U-03",
      grupoEquipamento: "Apoio",
      equipamentoId: "AP07",
      operadorId: "77881",
      operadorNome: "Operador Gama",
      dataHoraLocal: new Date("2026-06-01T11:10:00-03:00").toISOString(),
      status: "INCONSISTENTE",
      tipoEquipamento: "APOIO",
      fazenda: "",
      zona: "",
      talhao: "",
      centroCusto: "CC-300",
      horas: 2.1,
      origem: "DEMO",
      exportadoEm: null,
      observacao: "Ajustar fazenda, zona e talhão antes de exportar.",
      equipamentoNome: "AP07",
    },
    {
      id_local: "demo-004",
      regiao: "Oeste",
      unidade: "U-04",
      grupoEquipamento: "Tratores",
      equipamentoId: "T14",
      operadorId: "99110",
      operadorNome: "Operador Delta",
      dataHoraLocal: new Date("2026-06-01T12:00:00-03:00").toISOString(),
      status: "ATUALIZADO",
      tipoEquipamento: "TRATOR",
      fazenda: "Fazenda Modelo",
      zona: "Zona C",
      talhao: "Talhão 19",
      centroCusto: "CC-400",
      horas: 5.8,
      origem: "DEMO",
      exportadoEm: new Date("2026-06-01T13:10:00-03:00").toISOString(),
      equipamentoNome: "T14",
    },
  ];
}
