export type EquipmentType =
  | "COLHEDORA"
  | "TRANSBORDO"
  | "CAMINHAO"
  | "COMBOIO"
  | "TRATOR"
  | "CARREGADEIRA"
  | "APOIO"
  | "OUTRO";

type EquipmentLike = Record<string, unknown>;

const EXPLICIT_FIELDS = [
  "tipo_equipamento",
  "tipo",
  "equipment_type",
  "categoria",
  "categoria_equipamento",
];

const TEXT_FIELDS = [
  "nome",
  "modelo",
  "descricao",
  "descricao_modelo",
  "nome_equipamento",
  "equipamento",
  "frota",
  "marca",
];

const DIRECT_PATTERNS: Array<{ type: EquipmentType; patterns: RegExp[] }> = [
  { type: "COLHEDORA", patterns: [/\bCOLH\b/, /\bCOLHEDORA\b/, /\bHARVESTER\b/] },
  { type: "TRANSBORDO", patterns: [/\bTRANSBORDO\b/, /\bGRANELEIRO\b/, /\bWAGON\b/] },
  { type: "CAMINHAO", patterns: [/\bCAMINH[AÃ]O\b/, /\bTRUCK\b/, /\bCAVALO\b/] },
  { type: "COMBOIO", patterns: [/\bCOMBOIO\b/, /\bCONVOY\b/, /\bABASTECIMENTO\b/] },
  { type: "TRATOR", patterns: [/\bTRATOR\b/, /\bTRACTOR\b/] },
  { type: "CARREGADEIRA", patterns: [/\bCARREGADEIRA\b/, /\bLOADER\b/, /\bP[AÃ]\s*CARREGADEIRA\b/] },
  { type: "APOIO", patterns: [/\bAPOIO\b/, /\bUTILIT[AÁ]RIO\b/, /\bSERVI[CÇ]O\b/, /\bSUPORTE\b/, /\bMANUT\b/] },
];

const PREFIX_PATTERNS: Array<{ type: EquipmentType; patterns: RegExp[] }> = [
  { type: "COLHEDORA", patterns: [/^CH/, /^COL/] },
  { type: "TRANSBORDO", patterns: [/^TB/, /^TRB/] },
  { type: "CAMINHAO", patterns: [/^CAM/, /^CAMI/] },
  { type: "COMBOIO", patterns: [/^CB/, /^COMB/] },
  { type: "TRATOR", patterns: [/^T(?!R[A-Z])/, /^TRT/] },
  { type: "CARREGADEIRA", patterns: [/^CAR/, /^PACL/, /^PAL/] },
  { type: "APOIO", patterns: [/^AP/, /^UTI/, /^SER/] },
];

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeText(value: unknown): string {
  return stripAccents(textValue(value)).toUpperCase();
}

function normalizeExplicitType(raw: unknown): EquipmentType | null {
  const normalized = normalizeText(raw).replace(/[\s\-\/]+/g, "_");
  if (!normalized) return null;

  if (["COLHEDORA", "COLH"].includes(normalized)) return "COLHEDORA";
  if (["TRANSBORDO", "TB", "TRANSPORTE_DE_TRANSBORDO"].includes(normalized)) return "TRANSBORDO";
  if (["CAMINHAO", "CAMINHÃO", "TRUCK"].includes(normalized)) return "CAMINHAO";
  if (["COMBOIO", "CONVOY"].includes(normalized)) return "COMBOIO";
  if (["TRATOR", "TRACTOR"].includes(normalized)) return "TRATOR";
  if (["CARREGADEIRA", "LOADER", "PA_CARREGADEIRA"].includes(normalized)) return "CARREGADEIRA";
  if (["APOIO", "UTILITARIO", "SERVICO", "SUPORTE"].includes(normalized)) return "APOIO";
  if (["OUTRO", "OUTROS", "OTHER", "UNKNOWN"].includes(normalized)) return "OUTRO";
  return null;
}

function inferByText(value: string): EquipmentType | null {
  if (!value) return null;
  for (const group of DIRECT_PATTERNS) {
    if (group.patterns.some((pattern) => pattern.test(value))) return group.type;
  }
  return null;
}

function inferByPrefix(value: string): EquipmentType | null {
  if (!value) return null;
  for (const group of PREFIX_PATTERNS) {
    if (group.patterns.some((pattern) => pattern.test(value))) return group.type;
  }
  return null;
}

export function normalizeEquipmentType(item: EquipmentLike): EquipmentType {
  for (const field of EXPLICIT_FIELDS) {
    const explicit = normalizeExplicitType(item[field]);
    if (explicit) return explicit;
  }

  for (const field of TEXT_FIELDS) {
    const inferred = inferByText(normalizeText(item[field]));
    if (inferred) return inferred;
  }

  const idSource = normalizeText(item.trator_id ?? item.id ?? item.equipamento_id ?? item.codigo ?? "");
  const prefix = inferByPrefix(idSource);
  if (prefix) return prefix;

  const combined = normalizeText([item.trator_id, item.nome, item.modelo, item.descricao].filter(Boolean).join(" "));
  const fallback = inferByText(combined) || inferByPrefix(combined);
  if (fallback) return fallback;

  return "OUTRO";
}

export function getEquipmentTypeLabel(type: EquipmentType): string {
  switch (type) {
    case "COLHEDORA":
      return "Colhedora";
    case "TRANSBORDO":
      return "Transbordo";
    case "CAMINHAO":
      return "Caminhão";
    case "COMBOIO":
      return "Comboio";
    case "TRATOR":
      return "Trator";
    case "CARREGADEIRA":
      return "Carregadeira";
    case "APOIO":
      return "Apoio";
    default:
      return "Outro";
  }
}

