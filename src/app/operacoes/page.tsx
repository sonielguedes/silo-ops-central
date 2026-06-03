"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import SectionHeader from "@/components/dashboard/SectionHeader";
import Badge from "@/components/Badge";
import ErrorState from "@/components/dashboard/ErrorState";
import EmptyState from "@/components/dashboard/EmptyState";
import StatusRow from "@/components/dashboard/StatusRow";
import { api, fmtDate, fmtDur, getDynamicPresence, timeAgo, type OperacaoAtiva } from "@/lib/api";
import type { EventoOperacional } from "@/lib/dashboard-types";

type Filters = { equipamento: string; operador: string; operacao: string; status: string; frente: string; talhao: string; search: string };
type EventoLinha = EventoOperacional & { trator_id?: string | null; operacao_id?: string | null };

const EMPTY_FILTERS: Filters = { equipamento: "", operador: "", operacao: "", status: "", frente: "", talhao: "", search: "" };

function opStatus(op: OperacaoAtiva): "OPERANDO" | "PARADO" | "MOVIMENTO" | "AGUARDANDO" | "SEM_HEARTBEAT" | "SEM_OPERADOR" {
  const status = (op.status || "").toUpperCase();
  if (!op.nome_operador) return "SEM_OPERADOR";
  if (!op.last_seen) return "SEM_HEARTBEAT";
  if (status.includes("PARAD") || status.includes("PAUSA")) return "PARADO";
  if (status.includes("MOV")) return "MOVIMENTO";
  if (status.includes("AGUARD") || status.includes("WAIT")) return "AGUARDANDO";
  return "OPERANDO";
}

function statusVariant(label: ReturnType<typeof opStatus>) {
  if (label === "OPERANDO" || label === "MOVIMENTO") return "online";
  if (label === "PARADO" || label === "SEM_HEARTBEAT") return "offline";
  if (label === "AGUARDANDO" || label === "SEM_OPERADOR") return "instavel";
  return "info";
}

function readable(value?: string | null, fallback = "Sem informação disponível") {
  const v = (value || "").trim();
  return v ? v : fallback;
}

function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function opKey(op: OperacaoAtiva, index: number) {
  return op.operacao_id || `${op.trator_id || "sem-trator"}-${op.inicio || "sem-inicio"}-${index}`;
}

function eventKey(ev: EventoLinha, index: number) {
  return `${ev.operacao_id || "sem-operacao"}-${ev.trator_id || "sem-trator"}-${ev.horario || "sem-horario"}-${ev.tipo_evento || "sem-tipo"}-${index}`;
}

export default function OperacoesPage() {
  const [ops, setOps] = useState<OperacaoAtiva[]>([]);
  const [events, setEvents] = useState<EventoLinha[]>([]);
  const [opsErr, setOpsErr] = useState<string | null>(null);
  const [eventsErr, setEventsErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<OperacaoAtiva | null>(null);
  const ref = useRef<(() => Promise<void>) | null>(null);
  const search = useDebouncedValue(filters.search);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [a, e] = await Promise.all([api.operacoesAtivas(), api.eventosRecentes()]);
    setOps(a.ok ? a.data : []);
    setEvents(e.ok ? e.data as EventoLinha[] : []);
    setOpsErr(a.ok ? null : a.error);
    setEventsErr(e.ok ? null : e.error);
    setLoading(false);
  }, []);

  ref.current = () => load(true);
  useEffect(() => { load(); const id = setInterval(() => ref.current?.(), 10000); return () => clearInterval(id); }, [load]);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);

  const view = useMemo(() => {
    return ops.filter(op => {
      const stack = [
        op.trator_id, op.nome_operador || "", op.operacao_atual || "", op.status || "",
        op.fazenda || "", op.talhao || "",
      ].join(" ").toLowerCase();
      return (!search || stack.includes(search.toLowerCase()))
        && (!filters.equipamento || op.trator_id.toLowerCase().includes(filters.equipamento.toLowerCase()))
        && (!filters.operador || (op.nome_operador || "").toLowerCase().includes(filters.operador.toLowerCase()))
        && (!filters.operacao || (op.operacao_atual || op.status || "").toLowerCase().includes(filters.operacao.toLowerCase()))
        && (!filters.status || opStatus(op) === filters.status)
        && (!filters.frente || (op.fazenda || "").toLowerCase().includes(filters.frente.toLowerCase()))
        && (!filters.talhao || (op.talhao || "").toLowerCase().includes(filters.talhao.toLowerCase()));
    });
  }, [ops, filters, search]);

  const active = view.length;
  const moving = view.filter(op => opStatus(op) === "MOVIMENTO").length;
  const stopped = view.filter(op => opStatus(op) === "PARADO").length;
  const noOp = view.filter(op => opStatus(op) === "SEM_OPERADOR").length;
  const avgDur = view.length ? view.reduce((a, op) => a + (op.duracao_segundos || 0), 0) / view.length : 0;
  const pending = events.filter(ev => ev.tipo_evento?.toUpperCase() !== "FINALIZACAO").length;

  const timeline = useMemo(() => {
    if (!selected) return [];
    return events.filter(ev => ev.trator_id === selected.trator_id || ev.operacao_id === selected.operacao_id).slice(0, 5);
  }, [events, selected]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Operações Ativas" sub="Monitoramento das jornadas operacionais em andamento" />
      <main className="p-6 space-y-5">
        {(opsErr || eventsErr) && <ErrorState label="SISTEMA" msg={opsErr || eventsErr || "Erro técnico"} />}
        <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
          <StatCard label="Operações ativas" value={active} info="jornadas em andamento" color="blue" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <StatCard label="Máquinas operando" value={moving} info="em movimento" color="green" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} />
          <StatCard label="Máquinas paradas" value={stopped} info="sem deslocamento" color="red" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>} />
          <StatCard label="Sem operador" value={noOp} info="cadastro ausente" color="yellow" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
          <StatCard label="Duração média" value={fmtDur(Math.round(avgDur))} info="tempo médio ativo" color="purple" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <StatCard label="Eventos pendentes" value={pending} info="últimos eventos" color="yellow" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
        </div>

        <SectionHeader title="Lista operacional" sub="Busca, filtros e detalhes por jornada" />
        <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
          <input className="sil-input" placeholder="Equipamento" value={filters.equipamento} onChange={e => setFilters(v => ({ ...v, equipamento: e.target.value }))} />
          <input className="sil-input" placeholder="Operador" value={filters.operador} onChange={e => setFilters(v => ({ ...v, operador: e.target.value }))} />
          <input className="sil-input" placeholder="Operação" value={filters.operacao} onChange={e => setFilters(v => ({ ...v, operacao: e.target.value }))} />
          <select className="sil-input" value={filters.status} onChange={e => setFilters(v => ({ ...v, status: e.target.value }))}>
            <option value="">Status operacional</option>
            {["OPERANDO","PARADO","MOVIMENTO","AGUARDANDO","SEM_HEARTBEAT","SEM_OPERADOR"].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <input className="sil-input" placeholder="Frente" value={filters.frente} onChange={e => setFilters(v => ({ ...v, frente: e.target.value }))} />
          <input className="sil-input" placeholder="Talhão" value={filters.talhao} onChange={e => setFilters(v => ({ ...v, talhao: e.target.value }))} />
          <input className="sil-input col-span-2 xl:col-span-6" placeholder="Buscar geral..." value={filters.search} onChange={e => setFilters(v => ({ ...v, search: e.target.value }))} />
        </div>

        {loading ? <div className="card-p h-72 animate-pulse" /> : view.length === 0 ? <EmptyState title="Nenhuma operação ativa no momento" sub="Aguardando sincronização dos APKs ou início de jornada." /> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-[#111820] border-b border-[#1e2d3d] text-[#4a6a8a] text-xs uppercase tracking-wider text-left">
                <th className="px-4 py-3">Equipamento</th><th className="px-4 py-3">Operador</th><th className="px-4 py-3">Operação</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Frente/Talhão</th><th className="px-4 py-3">Início</th><th className="px-4 py-3">Duração</th><th className="px-4 py-3">Último evento</th><th className="px-4 py-3">Origem</th><th className="px-4 py-3 text-right">Ação</th>
              </tr></thead>
              <tbody className="divide-y divide-[#1e2d3d]/50 bg-[#161f2a]">
                {view.map((op, index) => {
                  const st = opStatus(op);
                  const latest = events.find(ev => ev.trator_id === op.trator_id || ev.operacao_id === op.operacao_id);
                  return <tr key={opKey(op, index)} className="hover:bg-[#1e2d3d]/30 align-top">
                    <td className="px-4 py-4"><div className="font-semibold text-[#c8d8e8]">{op.trator_id}</div><div className="text-[#4a6a8a] text-[10px]">heartbeat {op.last_seen ? timeAgo(op.last_seen) : "Aguardando heartbeat"}</div></td>
                    <td className="px-4 py-4 text-[#c8d8e8]">{readable(op.nome_operador, "Operador não identificado")}</td>
                    <td className="px-4 py-4 text-[#c8d8e8]">{readable(op.operacao_atual || op.status, "Sem dado recebido")}</td>
                    <td className="px-4 py-4"><Badge label={st} variant={statusVariant(st)} dot={false} /></td>
                    <td className="px-4 py-4 text-[#4a6a8a] text-xs">{readable(`${op.fazenda || ""} / ${op.talhao || ""}`, "Sem informação disponível")}</td>
                    <td className="px-4 py-4 font-mono text-[#c8d8e8] text-xs">{fmtDate(op.inicio)}</td>
                    <td className="px-4 py-4 font-mono text-[#c8d8e8] text-xs">{fmtDur(op.duracao_segundos, op.inicio)}</td>
                    <td className="px-4 py-4 text-[#4a6a8a] text-xs">{latest ? latest.tipo_evento : "Sem dado recebido"}</td>
                    <td className="px-4 py-4 text-[#4a6a8a] text-xs">{latest ? latest.origem : "Sem informação disponível"}</td>
                    <td className="px-4 py-4 text-right"><button onClick={() => setSelected(op)} className="btn-ghost">Detalhes</button></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-stretch justify-end" onClick={() => setSelected(null)}>
            <aside className="w-full max-w-xl bg-[#0d1420] border-l border-[#1f334d] p-6 space-y-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div><h3 className="text-white font-black text-xl">{selected.trator_id}</h3><p className="text-[#4a6a8a] text-xs uppercase tracking-wider">Detalhes da operação</p></div>
                <button className="text-[#4a6a8a]" onClick={() => setSelected(null)}>x</button>
              </div>
              <StatusRow label="Operador" value={readable(selected.nome_operador, "Operador não identificado")} />
              <StatusRow label="Operação atual" value={readable(selected.operacao_atual || selected.status, "Sem dado recebido")} />
              <StatusRow label="Status sincronização" value={selected.last_seen ? `Heartbeat ${timeAgo(selected.last_seen)}` : "Aguardando heartbeat"} />
              <StatusRow label="Origem dos dados" value={selected.last_seen ? "API/MQTT" : "Sem informação disponível"} />
              <div className="card-p">
                <p className="text-[#c8d8e8] font-black text-sm mb-3">Linha do tempo resumida</p>
                <div className="space-y-2">
                  {timeline.length === 0 ? (
                    <EmptyState title="Sem eventos recentes" sub="Não há eventos para esta operação." />
                  ) : (
                    timeline.map((ev, index) => (
                      <div key={eventKey(ev, index)} className="rounded-xl border border-[#1f334d] bg-[#101b2d] p-3">
                        <div className="flex justify-between gap-3">
                          <p className="text-[#c8d8e8] font-semibold text-sm">{ev.tipo_evento}</p>
                          <Badge
                            label={ev.origem}
                            variant={ev.origem === "MQTT" ? "online" : ev.origem === "API" ? "enviado" : ev.origem === "OfflineSync" ? "pendente" : "info"}
                            dot={false}
                          />
                        </div>
                        <p className="text-[#4a6a8a] text-xs mt-1">{ev.status}</p>
                        <p className="text-[#4a6a8a] text-[10px] font-mono mt-1">{fmtDate(ev.horario)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}
        <p className="text-right text-xs text-[#4a6a8a]">Atualizado às {new Date().toLocaleTimeString("pt-BR")} · tick {tick}</p>
      </main>
    </div>
  );
}





