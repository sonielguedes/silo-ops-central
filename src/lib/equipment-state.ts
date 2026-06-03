/**
 * equipment-state.ts
 *
 * Normalizador central de presença técnica × estado operacional.
 * Separa claramente:
 *   - presence        → derivado de heartbeat / updated_at / last_seen
 *   - estado_operacional → derivado de operação / parada / evento / velocidade
 *   - operacao_atual   → somente se jornada/operação ativa e válida
 *   - ultima_operacao_conhecida → última operação/evento conhecido, mesmo offline
 *   - status_resumo    → texto curto para UI
 *
 * Regras:
 *  1. presence vem exclusivamente de heartbeat/updated_at/last_seen.
 *  2. estado_operacional vem de operação/parada/evento/velocidade.
 *  3. Se presence=OFFLINE, não chamar de TRABALHANDO em texto principal.
 *  4. Se offline e houver operação anterior, mostrar como ultima_operacao_conhecida.
 *  5. Se há parada ativa, estado_operacional=PARADO + preencher parada.
 *  6. Se velocidade > 5 e online/instável, estado_operacional=EM_MOVIMENTO.
 *  7. Se operação ativa válida e sem parada, estado_operacional=TRABALHANDO.
 *  8. Se não houver operação ativa, estado_operacional=SEM_OPERACAO.
 *  9. UNKNOWN → DESCONHECIDO e só fallback final.
 * 10. Drawer mostra blocos separados.
 */

export type Presence = "ONLINE" | "INSTAVEL" | "OFFLINE";

export type EstadoOperacional =
  | "TRABALHANDO"
  | "PARADO"
  | "PAUSADO"
  | "EM_MOVIMENTO"
  | "SEM_OPERACAO"
  | "DESCONHECIDO";

export interface NormalizedEquipmentState {
  /** Presença técnica derivada de heartbeat / last_seen / updated_at */
  presence: Presence;
  /** Estado operacional derivado de operação / parada / velocidade */
  estado_operacional: EstadoOperacional;
  /** Operação atual — somente se jornada/operação ativa e válida */
  operacao_atual: string | null;
  /** Última operação/evento conhecido, mesmo se equipamento offline */
  ultima_operacao_conhecida: string | null;
  /** Texto curto para UI: "Online trabalhando", "Offline — última operação: X" */
  status_resumo: string;
  /** Código de parada se houver parada ativa */
  codigo_parada: string | null;
  /** Descrição de parada se houver parada ativa */
  descricao_parada: string | null;
}

export interface EquipmentStateInput {
  /** Valor raw de presence vindo do backend */
  presence?: string | null;
  /** Timestamp last_seen / updated_at para cálculo de heartbeat */
  updated_at?: string | null;
  last_seen?: string | null;
  /** Estado operacional raw vindo do backend */
  estado_operacional?: string | null;
  /** Nome/label da operação ativa */
  operacao_nome?: string | null;
  /** ID da operação ativa */
  operacao_id?: string | null;
  /** Velocidade atual em km/h */
  velocidade?: number | null;
  /** Código de parada ativa */
  codigo_parada?: string | null;
  /** Descrição de parada ativa */
  descricao_parada?: string | null;
  /** Status do evento associado */
  evento_status?: string | null;
  /** Status raw legado (pode conter nome de operação) */
  status?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function txt(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function upper(value: unknown): string {
  return (txt(value) || "").toUpperCase();
}

/**
 * Resolve presença técnica exclusivamente por heartbeat/timestamp.
 * Regra 1: presence vem de last_seen / updated_at.
 */
function resolvePresence(input: EquipmentStateInput): Presence {
  const ts = txt(input.last_seen) || txt(input.updated_at);
  if (ts) {
    const diffMs = Date.now() - new Date(ts).getTime();
    if (!Number.isFinite(diffMs)) return "OFFLINE";
    const diffSec = diffMs / 1000;
    if (diffSec <= 30) return "ONLINE";
    if (diffSec <= 90) return "INSTAVEL";
    return "OFFLINE";
  }

  // Fallback: usar valor raw de presence se não houver timestamp
  const raw = upper(input.presence);
  if (raw === "ONLINE") return "ONLINE";
  if (raw.startsWith("INST")) return "INSTAVEL";
  return "OFFLINE";
}

/**
 * Verifica se há uma operação ativa e válida.
 */
function hasActiveOperation(input: EquipmentStateInput): boolean {
  return Boolean(txt(input.operacao_id) || txt(input.operacao_nome));
}

/**
 * Verifica se há parada ativa (código ou descrição presentes).
 */
function hasActiveStop(input: EquipmentStateInput): boolean {
  return Boolean(txt(input.codigo_parada) || txt(input.descricao_parada));
}

/**
 * Retorna o label da operação — pode ser operacao_nome, status legado, ou evento_status.
 */
function resolveOperationLabel(input: EquipmentStateInput): string | null {
  return txt(input.operacao_nome) || txt(input.status) || txt(input.evento_status) || null;
}

/**
 * Sanitiza valores legados de estado_operacional.
 * Regra 9: UNKNOWN → DESCONHECIDO.
 */
function sanitizeEstadoOperacional(raw: string | null): EstadoOperacional | null {
  if (!raw) return null;
  const v = raw.toUpperCase().trim();
  if (v === "TRABALHANDO") return "TRABALHANDO";
  if (v === "PARADO") return "PARADO";
  if (v === "PAUSADO") return "PAUSADO";
  if (v === "EM_MOVIMENTO") return "EM_MOVIMENTO";
  if (v === "SEM_OPERACAO") return "SEM_OPERACAO";
  if (v === "DESCONHECIDO" || v === "UNKNOWN") return "DESCONHECIDO";
  return null;
}

/**
 * Resolve o estado operacional com base nas regras 2-9.
 */
function resolveEstadoOperacional(
  presence: Presence,
  input: EquipmentStateInput,
): EstadoOperacional {
  const velocity = typeof input.velocidade === "number" && Number.isFinite(input.velocidade)
    ? input.velocidade
    : 0;

  // Regra 5: parada ativa → PARADO
  if (hasActiveStop(input)) {
    return "PARADO";
  }

  // Regra 6: velocidade > 5 e online/instável → EM_MOVIMENTO
  if (velocity > 5 && (presence === "ONLINE" || presence === "INSTAVEL")) {
    return "EM_MOVIMENTO";
  }

  // Regra 7: operação ativa válida e sem parada → TRABALHANDO
  if (hasActiveOperation(input)) {
    return "TRABALHANDO";
  }

  // Tentar sanitizar estado_operacional raw vindo do backend
  const sanitized = sanitizeEstadoOperacional(txt(input.estado_operacional));
  if (sanitized && sanitized !== "DESCONHECIDO") {
    return sanitized;
  }

  // Regra 8: sem operação ativa → SEM_OPERACAO
  return "SEM_OPERACAO";
}

/**
 * Regra 3 e 4: gera o status_resumo levando em conta presence × estado.
 */
function buildStatusResumo(
  presence: Presence,
  estado: EstadoOperacional,
  operacaoAtual: string | null,
  ultimaOperacao: string | null,
): string {
  const labelEstado: Record<EstadoOperacional, string> = {
    TRABALHANDO: "trabalhando",
    PARADO: "parado",
    PAUSADO: "pausado",
    EM_MOVIMENTO: "em movimento",
    SEM_OPERACAO: "sem operação ativa",
    DESCONHECIDO: "estado desconhecido",
  };

  if (presence === "ONLINE") {
    const estadoLabel = labelEstado[estado] || "ativo";
    return operacaoAtual
      ? `Online ${estadoLabel} — ${operacaoAtual}`
      : `Online ${estadoLabel}`;
  }

  if (presence === "INSTAVEL") {
    return ultimaOperacao
      ? `Instável — última operação: ${ultimaOperacao}`
      : "Instável — sem atualização recente";
  }

  // OFFLINE — regra 3: nunca dizer "trabalhando"
  if (ultimaOperacao) {
    return `Offline — última operação: ${ultimaOperacao}`;
  }
  return "Offline — sem operação registrada";
}

// ---------------------------------------------------------------------------
// Função pública principal
// ---------------------------------------------------------------------------

/**
 * Normaliza o estado de um equipamento separando presença técnica do estado operacional.
 *
 * Entrada: campos brutos vindos do backend/status.
 * Saída: estado normalizado com presence, estado_operacional, operacao_atual,
 *        ultima_operacao_conhecida e status_resumo.
 */
export function normalizeEquipmentState(input: EquipmentStateInput): NormalizedEquipmentState {
  const presence = resolvePresence(input);
  const estado = resolveEstadoOperacional(presence, input);
  const operationLabel = resolveOperationLabel(input);

  // operacao_atual: somente se houver operação ativa E equipamento online/instável
  const operacaoAtual =
    hasActiveOperation(input) && (presence === "ONLINE" || presence === "INSTAVEL")
      ? operationLabel
      : null;

  // ultima_operacao_conhecida: sempre preenchido se houver qualquer referência de operação
  const ultimaOperacao = operationLabel;

  const statusResumo = buildStatusResumo(presence, estado, operacaoAtual, ultimaOperacao);

  return {
    presence,
    estado_operacional: estado,
    operacao_atual: operacaoAtual,
    ultima_operacao_conhecida: ultimaOperacao,
    status_resumo: statusResumo,
    codigo_parada: hasActiveStop(input) ? txt(input.codigo_parada) : null,
    descricao_parada: hasActiveStop(input) ? txt(input.descricao_parada) : null,
  };
}
