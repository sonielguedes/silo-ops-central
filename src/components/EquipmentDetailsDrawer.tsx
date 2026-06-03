"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";
import { api, type EquipmentDetails } from "@/lib/api";
import { getEquipmentTypeDisplay, getIconForModel, getEquipmentType, renderEquipmentIconSvg, resolveEquipmentVisualState } from "@/lib/equipment-icons";

type Props = {
  tratorId: string | null;
  open: boolean;
  onClose: () => void;
};

function fmt(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return Number(value).toFixed(digits);
}

function row(label: string, value: string) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#1f334d]/60 py-3 last:border-b-0">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4a6a8a]">{label}</span>
      <span className="text-right text-sm font-mono text-[#dce8f5] break-words">{value}</span>
    </div>
  );
}

function emptyValue(value: string | null | undefined) {
  const v = (value || "").trim();
  return v ? v : "--";
}

function badgeVariantFromVisual(key: string): "offline" | "instavel" | "erro" | "pendente" | "enviado" | "online" {
  if (key === "OFFLINE") return "offline";
  if (key === "INSTAVEL") return "instavel";
  if (key === "ALERTA") return "erro";
  if (key === "PARADO_APONTAMENTO") return "pendente";
  if (key === "DESLOCAMENTO") return "enviado";
  return "online";
}

export default function EquipmentDetailsDrawer({ tratorId, open, onClose }: Props) {
  const [data, setData] = useState<EquipmentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!open || !tratorId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    api.equipamentoDetalhes(tratorId)
      .then((res) => {
        if (!active) return;
        if (res.ok) setData(res.data);
        else {
          setData(null);
          setError(res.error);
        }
      })
      .catch((err) => {
        if (!active) return;
        setData(null);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, tratorId, retryKey]);

  const visual = useMemo(() => {
    if (!data) return { key: "UNKNOWN", color: "#4a6a8a", label: "Sem dados", short: "--" };
    return resolveEquipmentVisualState({
      status: data.status,
      presence: data.presence,
      estado_operacional: data.estado_operacional,
      velocidade: data.velocidade,
      codigo_parada: data.codigo_parada,
      descricao_parada: data.descricao_parada,
    } as Record<string, unknown>);
  }, [data]);

  const icon = useMemo(() => {
    if (!data) return null;
    return getIconForModel(getEquipmentType(data as unknown as Record<string, unknown>), {});
  }, [data]);
  const equipmentType = useMemo(() => {
    if (!data) return null;
    return getEquipmentType(data as unknown as Record<string, unknown>);
  }, [data]);

  if (!open || !tratorId) return null;

  return (
    <aside className="fixed right-0 top-20 z-50 h-[calc(100vh-5rem)] w-full max-w-[440px] border-l border-[#1f334d] bg-[#0a1018]/96 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-[#1f334d] px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 shadow-lg"
              style={{ backgroundColor: `${visual.color}22`, borderColor: `${visual.color}55` }}
            >
              {icon ? <div dangerouslySetInnerHTML={{ __html: renderEquipmentIconSvg(icon.svgPath, 30) }} /> : null}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4a6a8a]">Painel de equipamento</p>
              <h2 className="text-xl font-black text-white leading-tight">{data?.nome_equipamento || tratorId}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono font-black uppercase tracking-widest text-[#8fdfff]">{tratorId}</span>
                <Badge label={equipmentType ? getEquipmentTypeDisplay(equipmentType) : "--"} variant="info" dot={false} />
                <Badge label={visual.label} variant={badgeVariantFromVisual(visual.key)} />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#1f334d] bg-[#0d1420] px-3 py-2 text-[#4a6a8a] transition-colors hover:text-white"
            aria-label="Fechar painel"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-4">
              <div className="h-28 animate-pulse rounded-3xl border border-[#1f334d] bg-[#101b2d]/60" />
              <div className="grid gap-3">
                <div className="h-24 animate-pulse rounded-2xl border border-[#1f334d] bg-[#101b2d]/60" />
                <div className="h-24 animate-pulse rounded-2xl border border-[#1f334d] bg-[#101b2d]/60" />
                <div className="h-24 animate-pulse rounded-2xl border border-[#1f334d] bg-[#101b2d]/60" />
              </div>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-[#ff3d57]/30 bg-[#2a0f15]/70 p-5">
              <p className="text-sm font-black uppercase tracking-widest text-[#ff7a8a]">Erro ao carregar detalhes</p>
              <p className="mt-2 text-sm text-[#ffb3bc]">{error.includes("404") ? "Equipamento fora do escopo ou indisponível." : error}</p>
              <button type="button" onClick={() => setRetryKey((v) => v + 1)} className="btn-primary mt-4">
                Tentar novamente
              </button>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Status resumo badge */}
              {data.status_resumo && (
                <div className="rounded-2xl border border-[#1f334d] bg-[#101b2d]/80 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4a6a8a] mb-1">Resumo</p>
                  <p className="text-sm font-bold text-[#dce8f5]">{data.status_resumo}</p>
                </div>
              )}

              {/* Bloco 1: Presença técnica */}
              <Section title="Presença técnica" tone={visual.color}>
                {row("Presença", emptyValue(data.presence))}
                {row("Comunicação", emptyValue(data.comunicacao))}
                {row("Atualizado", data.updated_at ? new Date(data.updated_at).toLocaleString("pt-BR") : "--")}
              </Section>

              {/* Bloco 2: Estado operacional */}
              <Section title="Estado operacional" tone={visual.color}>
                {row("Estado", emptyValue(data.estado_operacional))}
                {row("Operação atual", emptyValue(data.operacao_atual))}
                {row("Operador", emptyValue(data.operador))}
                {row("Descrição da operação", emptyValue(data.descricao_operacao))}
                {row("Código de parada", emptyValue(data.codigo_parada))}
                {row("Descrição da parada", emptyValue(data.descricao_parada))}
                {row("Evento", emptyValue(data.evento_status))}
                {row("Motivo", emptyValue(data.motivo_status))}
              </Section>

              {/* Bloco 3: Última operação conhecida */}
              <Section title="Última operação conhecida" tone={visual.color}>
                {row("Operação", emptyValue(data.ultima_operacao_conhecida))}
                {row("Nome da operação", emptyValue(data.operacao_nome))}
                {row("ID da operação", emptyValue(data.operacao_id))}
              </Section>

              <Section title="Telemetria" tone={visual.color}>
                {row("Velocidade", data.velocidade === null ? "--" : `${fmt(data.velocidade, 1)} km/h`)}
                {row("Bateria", data.bateria === null ? "--" : `${fmt(data.bateria, 0)}%`)}
              </Section>

              <Section title="Localização" tone={visual.color}>
                {row("Latitude", fmt(data.latitude, 6))}
                {row("Longitude", fmt(data.longitude, 6))}
                {row("Fazenda", emptyValue(data.fazenda))}
                {row("Frente", emptyValue(data.frente))}
                {row("Talhão", emptyValue(data.talhao))}
                {row("Zona", emptyValue(data.zona))}
              </Section>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#1f334d] bg-[#0d1420] p-6 text-center">
              <p className="text-sm font-black uppercase tracking-widest text-white">Nenhum detalhe disponível</p>
              <p className="mt-2 text-xs text-[#4a6a8a]">Escolha outro equipamento ou aguarde a sincronização.</p>
            </div>
          )}
        </div>

        {data && (
          <div className="border-t border-[#1f334d] px-5 py-4">
            <div className="grid grid-cols-3 gap-3">
              <Link href={`/equipamentos/${tratorId}/rastro`} className="btn-primary justify-center">
                Ver rastro
              </Link>
              <Link href="/eventos" className="btn-ghost justify-center">
                Ver eventos
              </Link>
              <Link href="/operacoes" className="btn-ghost justify-center">
                Ver operação
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function Section({ title, tone, children }: { title: string; tone: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#1f334d] bg-[#0d1420] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white">{title}</p>
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tone, boxShadow: `0 0 10px ${tone}` }} />
      </div>
      <div>{children}</div>
    </section>
  );
}
