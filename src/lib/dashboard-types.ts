export type AmbienteSistema = "LOCAL" | "DEMO" | "PRODUCAO";

export type StatusSistema = {
  ambiente: AmbienteSistema;
  versao: string;
  api: "online" | "offline" | "degraded";
  mqtt: "online" | "offline" | "unknown";
  lastCheck: string;
};

export type EventoOperacional = {
  horario: string;
  equipamento: string;
  tipo_evento: string;
  status: string;
  origem: "APK" | "API" | "MQTT" | "OfflineSync";
};

export type AlertaOperacional = {
  id: string;
  equipamento: string;
  titulo: string;
  severidade: "info" | "warning" | "critical";
  atualizado_em: string;
};
