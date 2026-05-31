"use client";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import Badge from "@/components/Badge";
import ApiErr from "@/components/ApiErr";
import EmptyState from "@/components/dashboard/EmptyState";
import ErrorState from "@/components/dashboard/ErrorState";
import SectionHeader from "@/components/dashboard/SectionHeader";
import StatusRow from "@/components/dashboard/StatusRow";
import { api, getDynamicPresence, timeAgo, fmtDur, fmtDate, type Equipamento, type OperacaoAtiva, type HealthResponse } from "@/lib/api";
import { getEquipmentModel, getIconForModel, readIconConfig, renderEquipmentIconSvg, type EquipmentIconId } from "@/lib/equipment-icons";
import type { AmbienteSistema, EventoOperacional, StatusSistema } from "@/lib/dashboard-types";
import { APP_ENV } from "@/lib/app-env";

type EventoApi = Partial<EventoOperacional> & {
  id?: number | string;
  id_local?: string | null;
  operacao_id?: string | null;
  trator_id?: string | null;
  timestamp?: string;
  descricao?: string | null;
  status?: string | null;
  origem?: string | null;
};

interface State {
  health: HealthResponse | null;
  healthErr: string | null;
  equip: Equipamento[];
  equipErr: string | null;
  ops: OperacaoAtiva[];
  opsErr: string | null;
  events: EventoOperacional[];
  eventsErr: string | null;
  status: StatusSistema;
  lastUpdate: Date | null;
  loading: boolean;
}

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "SILO OPS v0.1.0-enterprise";
const ENVIRONMENT = ((APP_ENV === "demo" ? "DEMO" : APP_ENV === "local" ? "LOCAL" : "PRODUCAO") as AmbienteSistema);

function toTechStatus(eq: Equipamento): string {
  if (!eq.trator_id) return "Equipamento sem cadastro vinculado";
  if (!eq.last_seen) return "Aguardando heartbeat";
  if (!eq.status || eq.status.toUpperCase() === "UNKNOWN") return "Sem telemetria recebida";
  return eq.status;
}

function toEventSource(value?: string | null): EventoOperacional["origem"] {
  const v = (value || "").toUpperCase();
  if (v.includes("MQTT")) return "MQTT";
  if (v.includes("API")) return "API";
  if (v.includes("OFFLINE") || v.includes("SYNC")) return "OfflineSync";
  return "APK";
}

function normalizeEvent(item: EventoApi): EventoOperacional {
  return {
    horario: item.horario || item.timestamp || new Date().toISOString(),
    equipamento: item.equipamento || item.trator_id || "--",
    tipo_evento: item.tipo_evento || "EVENTO",
    status: item.status || item.descricao || "Recebido",
    origem: toEventSource(item.origem),
  };
}

function formatFrame(op: OperacaoAtiva | undefined) {
  if (!op) return "Sem jornada ativa";
  const fazenda = op.fazenda || "Fazenda não informada";
  const talhao = op.talhao || "Talhão não informado";
  return `${fazenda} / ${talhao}`;
}

function apiStatusTone(status?: string) {
  if (status === "ok") return "good";
  if (status === "degraded") return "warn";
  return "bad";
}

export default function DashboardPage() {
  const [s, setS] = useState<State>({
    health: null,
    healthErr: null,
    equip: [],
    equipErr: null,
    ops: [],
    opsErr: null,
    events: [],
    eventsErr: null,
    status: {
      ambiente: ENVIRONMENT,
      versao: VERSION,
      api: "offline",
      mqtt: "unknown",
      lastCheck: new Date().toISOString(),
    },
    lastUpdate: null,
    loading: true,
  });
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [iconConfig, setIconConfig] = useState<Record<string, EquipmentIconId>>({});
  const [pollSeconds, setPollSeconds] = useState(10);
  const ref = useRef<(() => Promise<void>) | null>(null);

  const poll = useCallback(async () => {
    const healthTask = fetch("/api/health", { cache: "no-store", signal: AbortSignal.timeout(5000) })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        const status = res.ok ? "online" : (data?.status === "degraded" ? "degraded" : "offline");
        return {
          health: {
            status: data?.status || status,
            timestamp: data?.timestamp || new Date().toISOString(),
            upstream_status: data?.upstream_status ?? null,
            latency_ms: data?.latency_ms ?? null,
            upstream: data?.upstream,
            error: data?.error,
          } as HealthResponse,
          status: {
            ambiente: ENVIRONMENT,
            versao: VERSION,
            api: status,
            mqtt: data?.upstream?.mqtt ? "online" : "unknown",
            lastCheck: new Date().toISOString(),
          } as StatusSistema,
        };
      })
      .catch(() => ({
        health: null,
        status: {
          ambiente: ENVIRONMENT,
          versao: VERSION,
          api: "offline",
          mqtt: "unknown",
          lastCheck: new Date().toISOString(),
        } as StatusSistema,
      }));

    const [healthPack, e, o, ev] = await Promise.all([
      healthTask,
      api.equipamentos(),
      api.operacoesAtivas(),
      api.eventosRecentes(),
    ]);

    setS({
      health: healthPack.health,
      healthErr: healthPack.health ? null : "API /health indisponível",
      equip: e.ok ? e.data : [],
      equipErr: e.ok ? null : e.error,
      ops: o.ok ? o.data : [],
      opsErr: o.ok ? null : o.error,
      events: ev.ok ? ev.data.map(normalizeEvent) : [],
      eventsErr: ev.ok ? null : ev.error,
      status: healthPack.status,
      lastUpdate: new Date(),
      loading: false,
    });
  }, []);

  ref.current = poll;

  useEffect(() => {
    setIconConfig(readIconConfig());
    const savedPolling = Number(localStorage.getItem("sil_polling_interval") || "10");
    setPollSeconds(Number.isFinite(savedPolling) && savedPolling > 0 ? savedPolling : 10);
    ref.current?.();
    const intervalMs = Math.max(5000, (Number(localStorage.getItem("sil_polling_interval") || "10") || 10) * 1000);
    const id = setInterval(() => ref.current?.(), intervalMs);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const total = s.equip.length;
  const online = s.equip.filter(e => getDynamicPresence(e.last_seen) === "ONLINE").length;
  const instavel = s.equip.filter(e => getDynamicPresence(e.last_seen) === "INSTAVEL").length;
  const offline = s.equip.filter(e => getDynamicPresence(e.last_seen) === "OFFLINE").length;

  const events = useMemo(() => s.events.slice(0, 6), [s.events]);

  const filteredEquip = useMemo(() => s.equip.filter(e => {
    const op = s.ops.find(x => x.trator_id === e.trator_id);
    const haystack = [
      e.trator_id,
      e.status || "",
      op?.nome_operador || "",
      op?.fazenda || "",
      op?.talhao || "",
      op?.operacao_atual || "",
    ].join(" ").toLowerCase();
    return !search || haystack.includes(search.toLowerCase());
  }), [s.equip, s.ops, search]);

  const onlineMessage = online > 0 ? `${online} equipamentos online agora` : "Nenhum equipamento online agora";

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#07111f]">
      <Header title="SILO OPS Central" sub="Centro de Operações Agrícolas em Tempo Real" />

      <main className="p-8 space-y-8 flex-1 flex flex-col min-h-0 animate-fade-in max-w-[1920px] mx-auto w-full" data-tick={tick}>
        <div className="card-p grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatusRow label="Ambiente" value={s.status.ambiente} tone={s.status.ambiente === "PRODUCAO" ? "good" : "warn"} />
          <StatusRow label="Versão" value={s.status.versao} />
          <StatusRow label="API" value={s.health?.status ? s.health.status.toUpperCase() : s.status.api.toUpperCase()} tone={apiStatusTone(s.health?.status || s.status.api)} />
          <StatusRow label="MQTT" value={s.status.mqtt === "unknown" ? "DESCONHECIDO" : s.status.mqtt.toUpperCase()} tone={s.status.mqtt === "online" ? "good" : s.status.mqtt === "offline" ? "bad" : "warn"} />
          <StatusRow label="Último check" value={s.status.lastCheck ? new Date(s.status.lastCheck).toLocaleTimeString("pt-BR") : "--:--:--"} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <StatCard label="Total Equipamentos" value={total} info="cadastrados" color="blue" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h4m0 0l3-4h-5v4M13 8h7v2M13 12h5" /></svg>} />
          <StatCard label="Online" value={online} info="último heartbeat válido" color="green" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a9.5 9.5 0 0113.436 0M4.222 9.222a13.5 13.5 0 0115.556 0" /></svg>} />
          <StatCard label="Instável" value={instavel} info="sem atualização recente" color="yellow" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
          <StatCard label="Offline" value={offline} info="sem sinal > 90s" color="red" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>} />
          <StatCard label="Operações Ativas" value={s.ops.length} info="jornadas em andamento" color="purple" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
          <div className="lg:col-span-8 flex flex-col min-h-[520px]">
            <div className="card-p flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 flex-none">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-[22px] bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center text-[#00d4ff] shadow-xl">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h4m0 0l3-4h-5v4M13 8h7v2M13 12h5" /></svg>
                  </div>
                  <div>
                    <h2 className="text-white font-black text-2xl uppercase tracking-tighter">Equipamentos</h2>
                    <p className="text-[#4a6a8a] text-xs font-black uppercase tracking-[0.2em] mt-1 opacity-70">Monitoramento em tempo real</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-1 max-w-lg">
                  <div className="relative flex-1 group">
                    <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6a8a] group-focus-within:text-[#00d4ff] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                      type="text"
                      placeholder="Pesquisar frota por ID, operador, frente ou status..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="sil-input pl-14 h-14 text-sm"
                    />
                  </div>
                  <div className="bg-[#0d1420] px-6 py-4 rounded-2xl border border-[#1f334d] text-[#4a6a8a] text-xs font-black uppercase whitespace-nowrap shadow-inner">
                    {total} Registros
                  </div>
                </div>
              </div>

              {s.equipErr && <ApiErr label="/api/equipamentos/status" msg={s.equipErr} />}
              {!s.equipErr && s.equip.length === 0 && !s.loading && <EmptyState title="Aguardando sincronização dos APKs" sub="Nenhum equipamento com telemetria foi recebido ainda." />}

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <table className="w-full">
                  <thead className="sticky top-0 bg-[#101b2d] z-20">
                    <tr className="text-[#4a6a8a] text-[11px] font-black uppercase tracking-[0.25em] border-b border-[#1f334d]">
                      <th className="px-6 py-5 text-left">Equipamento</th>
                      <th className="px-6 py-5 text-center">Status</th>
                      <th className="px-6 py-5 text-left">Operador</th>
                      <th className="px-6 py-5 text-left">Frente/Talhão</th>
                      <th className="px-6 py-5 text-center">Velocidade</th>
                      <th className="px-6 py-5 text-center">Bateria / Sinal</th>
                      <th className="px-6 py-5 text-center">Última Atualização</th>
                      <th className="px-6 py-5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f334d]/40">
                    {s.loading ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={8} className="px-6 py-8"><div className="h-8 bg-[#1f334d]/50 rounded-xl w-full" /></td>
                      </tr>
                    )) : filteredEquip.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-24 text-center text-[#4a6a8a] font-bold uppercase italic opacity-30 tracking-[0.3em] text-sm">
                          {s.equip.length === 0 ? "Nenhum evento real recebido ainda" : "Nenhum equipamento localizado"}
                        </td>
                      </tr>
                    ) : filteredEquip.map((eq, idx) => {
                      const p = getDynamicPresence(eq.last_seen);
                      const model = getEquipmentModel(eq);
                      const op = s.ops.find(o => o.trator_id === eq.trator_id);
                      const iconData = getIconForModel(model, iconConfig);
                      const techStatus = toTechStatus(eq);
                      const battery = eq.bateria !== null ? `${eq.bateria}%` : "Sem telemetria recebida";
                      const signal = eq.gps_source || "Sem telemetria recebida";

                      return (
                        <tr key={`${eq.trator_id}-${idx}`} className="group hover:bg-[#00d4ff]/5 transition-all">
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-5">
                              <div className="relative">
                                <div className="w-14 h-14 rounded-[18px] bg-[#0d1420] border border-[#1f334d] flex items-center justify-center overflow-hidden group-hover:border-[#00d4ff]/40 transition-all shadow-lg group-hover:shadow-[#00d4ff]/10">
                                  <div className="w-11 h-11 object-contain opacity-90 brightness-110 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: renderEquipmentIconSvg(iconData.svgPath, 34) }} />
                                </div>
                                <div title={techStatus} className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-[#101b2d] ${p === "ONLINE" ? "bg-[#22c55e] pulse-green" : p === "INSTAVEL" ? "bg-[#f59e0b] pulse-yellow" : "bg-[#ef4444]"}`} />
                              </div>
                              <div>
                                <p className="text-white font-black text-base tracking-tight leading-none">{eq.trator_id}</p>
                                <p className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest mt-2 opacity-80">{techStatus}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <div className="space-y-1">
                              <Badge label={p} variant={p === "ONLINE" ? "online" : p === "INSTAVEL" ? "instavel" : "offline"} dot={false} />
                              <p className="text-[10px] text-[#4a6a8a] uppercase font-bold">{p === "ONLINE" ? "Heartbeat válido" : p === "INSTAVEL" ? "Atualização recente" : "Sem sinal > 90s"}</p>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-left">
                            <p className="text-white font-bold text-sm">{op?.nome_operador || "Operador não identificado"}</p>
                            <p className="text-[#4a6a8a] text-[10px] uppercase font-bold tracking-widest mt-1">{op?.operador_id || "Sem jornada ativa"}</p>
                          </td>
                          <td className="px-6 py-6 text-left">
                            <p className="text-white font-bold text-sm">{op?.operacao_atual || op?.status || "Sem jornada ativa"}</p>
                            <p className="text-[#4a6a8a] text-[10px] uppercase font-bold tracking-widest mt-1">{formatFrame(op)}</p>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <div className="flex items-center justify-center gap-2.5">
                              <svg className="w-5 h-5 text-[#4a6a8a] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                              <span className="text-white font-black font-mono text-sm">{Number(eq.velocidade || 0).toFixed(1)} <span className="text-[10px] text-[#4a6a8a] ml-0.5 uppercase opacity-60">km/h</span></span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <div className="space-y-2">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-20 h-2 bg-[#0d1420] rounded-full overflow-hidden border border-[#1f334d] shadow-inner">
                                  <div className={`h-full transition-all duration-1000 ${eq.bateria !== null && eq.bateria > 30 ? "bg-[#22c55e]" : "bg-[#ef4444]"} shadow-[0_0_8px_currentColor]`} style={{ width: `${Math.max(0, eq.bateria ?? 0)}%` }} />
                                </div>
                                <span className={`text-[11px] font-black font-mono ${eq.bateria !== null && eq.bateria > 30 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>{eq.bateria !== null ? `${eq.bateria}%` : signal}</span>
                              </div>
                              <p className="text-[10px] text-[#4a6a8a] uppercase font-bold tracking-widest">{eq.bateria !== null ? "Bateria" : "Sinal"}</p>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <div className="space-y-1">
                              <div className="flex items-center justify-center gap-2.5 text-[#4a6a8a]">
                                <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span className="text-[11px] font-black uppercase tracking-tighter">{timeAgo(eq.last_seen)}</span>
                              </div>
                              <p className="text-[10px] text-[#4a6a8a] font-mono">{fmtDate(eq.last_seen)}</p>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button title="Detalhes" className="px-3 py-2 rounded-xl bg-[#0d1420] border border-[#1f334d] text-[#c8d8e8] text-[10px] font-bold uppercase tracking-widest hover:border-[#00d4ff]/40 hover:text-[#00d4ff] transition-all">
                                Detalhes
                              </button>
                              <button title="Timeline" className="px-3 py-2 rounded-xl bg-[#0d1420] border border-[#1f334d] text-[#4a6a8a] text-[10px] font-bold uppercase tracking-widest hover:border-[#00d4ff]/40 hover:text-[#c8d8e8] transition-all">
                                Timeline
                              </button>
                              <button title="Abrir máquina" className="px-3 py-2 rounded-xl bg-[#0d1420] border border-[#1f334d] text-[#4a6a8a] text-[10px] font-bold uppercase tracking-widest hover:border-[#00d4ff]/40 hover:text-[#c8d8e8] transition-all">
                                Abrir
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8 flex flex-col min-h-0">
            <div className="card-p group flex-none">
              <SectionHeader title="Status do Sistema" sub="Saúde da integração e telemetria" />
              <div className="space-y-5">
                {s.healthErr && <ErrorState label="API /health" msg={s.healthErr} />}
                <StatusRow label="API Backend" value={s.status.api === "online" ? "Online" : s.status.api === "degraded" ? "Degradado" : "Offline"} tone={apiStatusTone(s.status.api)} />
                <StatusRow label="Último Check" value={s.status.lastCheck ? new Date(s.status.lastCheck).toLocaleTimeString("pt-BR") : "--:--:--"} />
                <StatusRow label="Taxa Polling" value={`${pollSeconds} segundos`} />
                <StatusRow label="Equipamentos" value={`${online}/${total} ativos`} tone={online > 0 ? "good" : "bad"} />
                <StatusRow label="MQTT" value={s.status.mqtt === "unknown" ? "Desconhecido" : s.status.mqtt.toUpperCase()} tone={s.status.mqtt === "online" ? "good" : s.status.mqtt === "offline" ? "bad" : "warn"} />
              </div>
            </div>

            <div className="card-p overflow-hidden relative flex-1 flex flex-col min-h-[300px]">
              <SectionHeader title="Operações Ativas" sub="Jornadas e telemetria de campo" />
              <div className="space-y-4 relative z-10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {s.opsErr && <ErrorState label="/api/operacoes/ativas" msg={s.opsErr} />}
                {!s.opsErr && s.ops.length === 0 ? (
                  <EmptyState title="Nenhuma operação ativa no momento" sub="Aguardando o início da jornada operacional ou sincronização dos APKs." />
                ) : s.ops.map(op => {
                  const isSelected = op.status?.toUpperCase().includes("PAUS") ? "warn" : op.status?.toUpperCase().includes("ATIV") ? "good" : "neutral";
                  return (
                    <div key={op.operacao_id} className="rounded-2xl border border-[#1f334d] bg-[#101b2d]/60 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[#00d4ff] font-black text-sm">{op.trator_id}</p>
                          <p className="text-[#c8d8e8] text-sm font-semibold mt-1">{op.nome_operador || "Operador não identificado"}</p>
                        </div>
                        <Badge label={op.status || "EM CAMPO"} variant={isSelected === "good" ? "online" : isSelected === "warn" ? "instavel" : "info"} dot={false} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <StatusRow label="Operação" value={op.operacao_atual || op.status || "Sem jornada ativa"} />
                        <StatusRow label="Início" value={fmtDate(op.inicio)} />
                        <StatusRow label="Duração" value={fmtDur(op.duracao_segundos, op.inicio)} />
                        <StatusRow label="Velocidade" value={`${Number(op.velocidade_atual || 0).toFixed(1)} km/h`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card-p overflow-hidden relative flex-1 flex flex-col min-h-[300px]">
              <SectionHeader title="Últimos eventos recebidos" sub="Historico curto de telemetria e operação" />
              <div className="space-y-4 relative z-10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {s.eventsErr && <ErrorState label="/api/eventos/recentes" msg={s.eventsErr} />}
                {!s.eventsErr && events.length === 0 ? (
                  <EmptyState title="Nenhum evento real recebido ainda" sub="Os eventos aparecem quando APK, MQTT ou API confirmarem um estado operacional." />
                ) : events.map((ev, idx) => (
                  <div key={`${ev.equipamento}-${idx}`} className="rounded-2xl border border-[#1f334d] bg-[#101b2d]/60 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[#c8d8e8] font-black text-sm">{ev.equipamento}</p>
                      <span className="text-[10px] text-[#4a6a8a] font-mono">{new Date(ev.horario).toLocaleTimeString("pt-BR")}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[#4a6a8a] text-xs uppercase font-black tracking-widest">{ev.tipo_evento}</p>
                      <Badge label={ev.origem} variant={ev.origem === "MQTT" ? "online" : ev.origem === "API" ? "enviado" : ev.origem === "OfflineSync" ? "pendente" : "info"} dot={false} />
                    </div>
                    <p className="text-[#c8d8e8] text-xs">{ev.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {s.healthErr && <ApiErr label="SISTEMA" msg="Conexão com servidor interrompida. Verificando novamente..." />}
        <p className="text-right text-xs text-[#4a6a8a]">{onlineMessage} · atualizado às {s.lastUpdate ? s.lastUpdate.toLocaleTimeString("pt-BR") : "--:--:--"}</p>
      </main>
    </div>
  );
}
