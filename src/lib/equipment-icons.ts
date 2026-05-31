import { type Equipamento } from "@/lib/api";

export type EquipmentIconId =
  | "trator"
  | "colhedora"
  | "transbordo"
  | "caminhao"
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

export function getIconForModel(model: string, config: Record<string, EquipmentIconId>): EquipmentIcon {
  const iconId: EquipmentIconId = config[model] || "trator";
  const cfg = ICON_CONFIGS[iconId] || ICON_CONFIGS.default;
  return { id: iconId, label: cfg.label, svgPath: cfg.svg, color: cfg.color };
}

export function getEquipmentModel(eq: Equipamento): string {
  // Tenta extrair o modelo do ID (ex: T01 -> Trator, CH01 -> Colhedora)
  const id = (eq.trator_id || "").toUpperCase();
  if (id.startsWith("T")) return "TRATOR";
  if (id.startsWith("CH") || id.startsWith("COL")) return "COLHEDORA";
  if (id.startsWith("TB")) return "TRANSBORDO";
  if (id.startsWith("CAM")) return "CAMINHAO";
  if (id.startsWith("PV") || id.startsWith("PUL")) return "PULVERIZADOR";
  if (id.startsWith("PL") || id.startsWith("PLAN")) return "PLANTADEIRA";
  if (id.startsWith("EX") || id.startsWith("ESC")) return "ESCAVADEIRA";
  if (id.startsWith("AP") || id.startsWith("SERV")) return "APOIO";

  // Fallback via status
  const status = (eq.status || "").toUpperCase();
  if (status.includes("COLHEIT")) return "COLHEDORA";
  if (status.includes("PULVER")) return "PULVERIZADOR";
  if (status.includes("CAMINHAO")) return "CAMINHAO";
  if (status.includes("ESCAVAD")) return "ESCAVADEIRA";

  return "TRATOR"; // Default
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
