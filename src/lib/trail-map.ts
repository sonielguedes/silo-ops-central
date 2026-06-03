import type { GpsPoint } from "@/lib/api";

export type TrailPointLike = GpsPoint & {
  estado_operacional?: string | null;
  codigo_parada?: string | null;
  descricao_parada?: string | null;
  operacao_id?: string | null;
  operacao_nome?: string | null;
  evento_status?: string | null;
  motivo_status?: string | null;
};

export type TrailSegment = {
  from: TrailPointLike;
  to: TrailPointLike;
  distanceKm: number;
  deltaMinutes: number;
  bearing: number;
  jump: boolean;
  state: string;
  color: string;
};

export type TrailVisualization = {
  points: TrailPointLike[];
  segments: TrailSegment[];
  jumpCount: number;
};

const STATE_COLORS: Record<string, string> = {
  TRABALHANDO: "#22c55e",
  EM_MOVIMENTO: "#00d4ff",
  PARADO: "#ffb020",
  SEM_OPERACAO: "#64748b",
  UNKNOWN: "#a855f7",
};

const JUMP_COLOR = "#ff7a45";
const JUMP_DISTANCE_KM = 2;
const JUMP_TIME_MINUTES = 3;

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatState(raw: string | null | undefined): string {
  const normalized = String(raw || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!normalized) return "UNKNOWN";
  if (normalized === "EM_MOVIMENTO" || normalized === "EM_MOVIMENTO.") return "EM_MOVIMENTO";
  if (normalized.includes("TRABALH")) return "TRABALHANDO";
  if (normalized.includes("PARAD")) return "PARADO";
  if (normalized.includes("SEM_OPER")) return "SEM_OPERACAO";
  if (normalized.includes("MOV")) return "EM_MOVIMENTO";
  if (normalized.includes("UNKNOWN")) return "UNKNOWN";
  return normalized;
}

export function sortTrailPoints(points: TrailPointLike[]): TrailPointLike[] {
  return [...points].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function getTrailState(point: TrailPointLike): string {
  return formatState(point.estado_operacional);
}

export function getTrailColor(point: TrailPointLike): string {
  const state = getTrailState(point);
  return STATE_COLORS[state] || STATE_COLORS.UNKNOWN;
}

export function getJumpColor(): string {
  return JUMP_COLOR;
}

export function haversineKm(a: TrailPointLike, b: TrailPointLike): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const c = 2 * Math.atan2(
    Math.sqrt(sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon),
    Math.sqrt(1 - sinLat * sinLat - Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon),
  );
  return R * c;
}

export function bearingDegrees(a: TrailPointLike, b: TrailPointLike): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function getDeltaMinutes(a: TrailPointLike, b: TrailPointLike): number {
  return (new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) / 60000;
}

export function isGpsJump(a: TrailPointLike, b: TrailPointLike): boolean {
  const distanceKm = haversineKm(a, b);
  const deltaMinutes = getDeltaMinutes(a, b);
  return distanceKm > JUMP_DISTANCE_KM && deltaMinutes > 0 && deltaMinutes < JUMP_TIME_MINUTES;
}

export function buildTrailVisualization(points: TrailPointLike[]): TrailVisualization {
  const ordered = sortTrailPoints(points);
  const segments = ordered.slice(1).map((to, index) => {
    const from = ordered[index];
    const jump = isGpsJump(from, to);
    const state = getTrailState(to);
    return {
      from,
      to,
      distanceKm: haversineKm(from, to),
      deltaMinutes: getDeltaMinutes(from, to),
      bearing: bearingDegrees(from, to),
      jump,
      state,
      color: jump ? JUMP_COLOR : (STATE_COLORS[state] || STATE_COLORS.UNKNOWN),
    };
  });

  return {
    points: ordered,
    segments,
    jumpCount: segments.filter((segment) => segment.jump).length,
  };
}

export function formatTrailSpeed(speed: unknown): string {
  const value = toFiniteNumber(speed);
  if (value === null) return "--";
  return `${value.toFixed(1)} km/h`;
}

export function formatTrailDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildPointTooltip(point: TrailPointLike): string {
  const lines = [
    ["Horário", formatTrailDateTime(point.timestamp)],
    ["Velocidade", formatTrailSpeed(point.velocidade)],
    ["Estado operacional", point.estado_operacional || "UNKNOWN"],
    ["Operação", point.operacao_nome || point.operacao_id || "--"],
    ["Código de parada", point.codigo_parada || "--"],
    ["Descrição da parada", point.descricao_parada || "--"],
  ];

  return `
    <div style="min-width:220px;max-width:280px;color:#e5eef7;font-family:ui-sans-serif,system-ui,sans-serif;">
      ${lines
        .map(([label, value]) => `
          <div style="display:flex;gap:10px;justify-content:space-between;margin:0 0 6px;">
            <span style="color:#7f9bb8;font-size:10px;text-transform:uppercase;letter-spacing:.12em;white-space:nowrap;">${escapeHtml(label)}</span>
            <span style="color:#ffffff;font-size:11px;font-weight:700;text-align:right;line-height:1.35;">${escapeHtml(value)}</span>
          </div>`)
        .join("")}
    </div>
  `.trim();
}

export function buildJumpTooltip(segment: TrailSegment): string {
  return `
    <div style="min-width:220px;max-width:280px;color:#e5eef7;font-family:ui-sans-serif,system-ui,sans-serif;">
      <div style="margin-bottom:8px;color:#ffb020;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;">Salto GPS</div>
      <div style="display:flex;gap:10px;justify-content:space-between;margin:0 0 6px;">
        <span style="color:#7f9bb8;font-size:10px;text-transform:uppercase;letter-spacing:.12em;">Distância</span>
        <span style="color:#ffffff;font-size:11px;font-weight:700;">${segment.distanceKm.toFixed(2)} km</span>
      </div>
      <div style="display:flex;gap:10px;justify-content:space-between;margin:0 0 6px;">
        <span style="color:#7f9bb8;font-size:10px;text-transform:uppercase;letter-spacing:.12em;">Intervalo</span>
        <span style="color:#ffffff;font-size:11px;font-weight:700;">${segment.deltaMinutes.toFixed(1)} min</span>
      </div>
      <div style="display:flex;gap:10px;justify-content:space-between;">
        <span style="color:#7f9bb8;font-size:10px;text-transform:uppercase;letter-spacing:.12em;">Estado</span>
        <span style="color:#ffffff;font-size:11px;font-weight:700;">${escapeHtml(segment.state)}</span>
      </div>
    </div>
  `.trim();
}

