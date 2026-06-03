import { type Equipamento } from "@/lib/api";
import { getEquipmentTypeLabel, normalizeEquipmentType, type EquipmentType } from "@/lib/equipment-type";

export type EquipmentIconId =
  | "trator"
  | "colhedora"
  | "transbordo"
  | "caminhao"
  | "comboio"
  | "carregadeira"
  | "pulverizador"
  | "plantadeira"
  | "escavadeira"
  | "apoio"
  | "default";

export interface EquipmentIcon {
  id: EquipmentIconId;
  label: string;
  svgPath: string;
  color: string;
}

const ICON_CONFIGS: Record<EquipmentIconId, { svg: string, color: string, label: string }> = {
  trator: {
    label: "Trator",
    color: "#00e676", // Verde
    svg: `<path d="M20 18H18V15H17.5L16.5 12.5C16.3 12 15.8 11.5 15.3 11.5H11V10H12.5V8H7.5V10H9V18H4V19H20V18ZM13 13V18H11V13H13Z" fill="black"/>`
  },
  colhedora: {
    label: "Colhedora",
    color: "#fdd835", // Amarelo
    svg: `<path d="M22 15H18V10H6V15H2V18H22V15ZM4 16V17H16V16H4Z" fill="black"/>`
  },
  transbordo: {
    label: "Transbordo",
    color: "#ff9800", // Laranja
    svg: `<path d="M20 10H4L2 15H22L20 10ZM4 18H20V19H4V18ZM7 16V17H17V16H7Z" fill="black"/>`
  },
  caminhao: {
    label: "Caminhão",
    color: "#2196f3", // Azul
    svg: `<path d="M20 10H15V8H4C2.9 8 2 8.9 2 10V17H4C4 18.1 4.9 19 6 19C7.1 19 8 18.1 8 17H14C14 18.1 14.9 19 16 19C17.1 19 18 18.1 18 17H20V13L22 15V10C22 8.9 21.1 8 20 10ZM17 11H20V13H17V11Z" fill="black"/>`
  },
  comboio: {
    label: "Comboio",
    color: "#00bcd4",
    svg: `<path d="M3 14h10v4H3v-4Zm12-2h4l2 2v4h-6v-6Zm-2-4h3v2h-3V8Zm-1 8h2v2h-2v-2Z" fill="black"/>`
  },
  carregadeira: {
    label: "Carregadeira",
    color: "#8bc34a",
    svg: `<path d="M4 18h16v2H4v-2Zm3-2h10v-2H9.5L8 11H5l2 5Zm7.5-6L18 6h2l-2.5 4H14.5Z" fill="black"/>`
  },
  pulverizador: {
    label: "Pulverizador",
    color: "#9c27b0", // Roxo
    svg: `<path d="M12 8L10 12H4V14H20V12H14L12 8ZM4 15V16H20V15H4ZM12 18V19H12.5V18H12Z" fill="black"/>`
  },
  plantadeira: {
    label: "Plantadeira",
    color: "#00bcd4", // Ciano
    svg: `<path d="M22 12H2V14H4V18H6V14H9V18H11V14H13V18H15V14H18V18H20V14H22V12Z" fill="black"/>`
  },
  escavadeira: {
    label: "Escavadeira",
    color: "#f44336", // Vermelho
    svg: `<path d="M20 18H4V17H18L16 11H10L8 15H4V18ZM6 10L10 6L14 10H6Z" fill="black"/>`
  },
  apoio: {
    label: "Apoio / Serviço",
    color: "#e91e63", // Rosa
    svg: `<path d="M19 10H14V8H5C3.9 8 3 8.9 3 10V15H19V10ZM17 13H14V11H17V13ZM5 17C3.9 17 3 17.9 3 19C3 20.1 3.9 21 5 21C6.1 21 7 20.1 7 19C7 17.9 6.1 17 5 17ZM15 17C13.9 17 13 17.9 13 19C13 20.1 13.9 21 15 21C16.1 21 17 20.1 17 19C17 17.9 16.1 17 15 17Z" fill="black"/>`
  },
  default: {
    label: "Padrão",
    color: "#4a6a8a",
    svg: `<circle cx="12" cy="12" r="8" fill="black"/>`
  }
};

const TYPE_TO_ICON: Record<EquipmentType, EquipmentIconId> = {
  COLHEDORA: "colhedora",
  TRANSBORDO: "transbordo",
  CAMINHAO: "caminhao",
  COMBOIO: "comboio",
  TRATOR: "trator",
  CARREGADEIRA: "carregadeira",
  APOIO: "apoio",
  OUTRO: "default",
};

export function getIconForModel(model: string, config: Record<string, EquipmentIconId>): EquipmentIcon {
  const type = (model || "OUTRO").toUpperCase() as EquipmentType;
  const iconId: EquipmentIconId = config[type] || TYPE_TO_ICON[type] || "default";
  const cfg = ICON_CONFIGS[iconId] || ICON_CONFIGS.default;
  return { id: iconId, label: cfg.label, svgPath: cfg.svg, color: cfg.color };
}

export function getEquipmentModel(eq: Equipamento): string {
  return normalizeEquipmentType(eq as unknown as Record<string, unknown>);
}

export function getEquipmentType(eq: Equipamento | Record<string, unknown>): EquipmentType {
  return normalizeEquipmentType(eq as Record<string, unknown>);
}

export function getEquipmentTypeDisplay(type: string): string {
  return getEquipmentTypeLabel((type || "OUTRO").toUpperCase() as EquipmentType);
}

type EquipmentVisualState = "ONLINE" | "INSTAVEL" | "OFFLINE" | "DESLOCAMENTO" | "PARADO_APONTAMENTO" | "ALERTA";

export function resolveEquipmentVisualState(item: Record<string, unknown> & { last_seen?: string | null }): { key: EquipmentVisualState; color: string; label: string; short: string } {
  const status = String(item.status ?? item.presence ?? "").toUpperCase();
  const operational = String(item.estado_operacional ?? "").toUpperCase();
  const velocity = Number(item.velocidade ?? item.speed ?? 0);
  const hasStop = Boolean(item.codigo_parada || item.descricao_parada);
  const hasAlert = /ALERT|ERRO|FALH|INCID|CRIT/.test(`${status} ${operational}`);

  if (hasAlert) return { key: "ALERTA", color: "#a855f7", label: "Alerta operacional", short: "ALERTA" };
  if (/OFF|DESLIG|SEM SINAL|SEM_SINAL/.test(status)) return { key: "OFFLINE", color: "#ef4444", label: "Offline", short: "OFF" };
  if (/INST/.test(status) || /INST/.test(operational)) return { key: "INSTAVEL", color: "#f59e0b", label: "Instável", short: "INST" };

  // Handle normalized estado_operacional values
  if (operational === "PARADO" || (hasStop && /PARAD/.test(operational))) return { key: "PARADO_APONTAMENTO", color: "#ff9800", label: "Parado com apontamento", short: "PAR" };
  if (operational === "PAUSADO") return { key: "PARADO_APONTAMENTO", color: "#ff9800", label: "Pausado", short: "PAU" };
  if (operational === "EM_MOVIMENTO" || velocity > 1 || /DESLOC|MOV/.test(status) || /MOV/.test(operational)) return { key: "DESLOCAMENTO", color: "#2196f3", label: "Deslocamento", short: "MOV" };
  if (operational === "TRABALHANDO") return { key: "ONLINE", color: "#22c55e", label: "Trabalhando", short: "ON" };
  if (operational === "SEM_OPERACAO") return { key: "ONLINE", color: "#22c55e", label: "Sem operação ativa", short: "ON" };
  if (operational === "DESCONHECIDO") return { key: "ONLINE", color: "#4a6a8a", label: "Estado desconhecido", short: "--" };

  return { key: "ONLINE", color: "#22c55e", label: "Ativo", short: "ON" };
}

export function renderEquipmentIconSvg(svgPath: string, size = 24): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">${svgPath}</svg>`;
}

export function readIconConfig(): Record<string, EquipmentIconId> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("sil_equipment_icon_config");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveIconConfig(config: Record<string, EquipmentIconId>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("sil_equipment_icon_config", JSON.stringify(config));
  window.dispatchEvent(new Event("sil-equipment-icons-updated"));
}

export const ALL_ICONS: EquipmentIcon[] = (Object.keys(ICON_CONFIGS) as EquipmentIconId[]).filter(id => id !== "default").map((id) => ({
  id,
  label: ICON_CONFIGS[id].label,
  svgPath: ICON_CONFIGS[id].svg,
  color: ICON_CONFIGS[id].color
}));
