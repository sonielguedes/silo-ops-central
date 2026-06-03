"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import SectionHeader from "@/components/dashboard/SectionHeader";
import EmptyState from "@/components/dashboard/EmptyState";

interface Evento {
  id: string | number;
  trator_id: string | null;
  tipo_evento: string;
  descricao: string | null;
  severidade: string;
  origem: string;
  timestamp: string;
}

type EventosResponse = Evento[] | { eventos?: Evento[]; status_tecnico?: string };

const TIPOS: Record<string, { label: string; cls: string }> = {
  HEARTBEAT_RECEBIDO: { label: "HB", cls: "text-[#4a6a8a] border-[#1e2d3d]/50 bg-[#111820]/50" },
  TELEMETRIA_RECEBIDA: { label: "TEL", cls: "text-[#00d4ff] border-[#00d4ff]/40 bg-[#00d4ff]/10" },
  GPS_ATUALIZADO: { label: "GPS", cls: "text-[#22c55e] border-[#22c55e]/40 bg-[#22c55e]/10" },
  STATUS_ALTERADO: { label: "STATUS", cls: "text-[#f59e0b] border-[#f59e0b]/40 bg-[#f59e0b]/10" },
  OPERACAO_INICIADA: { label: "INICIO", cls: "text-[#00e676] border-[#00e676]/40 bg-[#00e676]/10" },
  OPERACAO_FINALIZADA: { label: "FIM", cls: "text-[#4a6a8a] border-[#1e2d3d] bg-[#111820]" },
  PARADA_INICIADA: { label: "PAUSA", cls: "text-[#ffab00] border-[#ffab00]/40 bg-[#ffab00]/10" },
  PARADA_FINALIZADA: { label: "RETOMADA", cls: "text-[#00d4ff] border-[#00d4ff]/40 bg-[#00d4ff]/10" },
  ALERTA_RECEBIDO: { label: "ALERTA", cls: "text-[#ff3d57] border-[#ff3d57]/40 bg-[#ff3d57]/10" },
  JSON_INVALIDO: { label: "JSON", cls: "text-[#ff3d57] border-[#ff3d57]/40 bg-[#ff3d57]/10" },
  ERRO_INGESTAO: { label: "ERRO", cls: "text-[#ff3d57] border-[#ff3d57]/40 bg-[#ff3d57]/10" },
};

function badge(tipo: string) {
  return TIPOS[tipo?.toUpperCase()] || { label: tipo || "EVT", cls: "text-[#4a6a8a] border-[#1e2d3d] bg-[#111820]" };
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "--";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [fTrator, setFTrator] = useState("");
  const [fTipo, setFTipo] = useState("");
  const [fSev, setFSev] = useState("");
  const ref = useRef<(() => Promise<void>) | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const params = new URLSearchParams();
    if (fTrator) params.set("trator_id", fTrator);
    if (fTipo) params.set("tipo_evento", fTipo);
    if (fSev) params.set("severidade", fSev);
    params.set("limit", "50");

    try {
      const qs = params.toString();
      const savedUrl = typeof window !== "undefined" ? localStorage.getItem("sil_api_base_url") : null;
      const url = savedUrl ? savedUrl.trim().replace(/\/$/, "") : "";
      const endpoint = qs && qs !== "limit=50" ? `${url}/api/eventos?${qs}` : `${url}/api/eventos/recentes?limit=50`;
      const res = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(9000) });
      const text = await res.text();
      const data: EventosResponse = text ? JSON.parse(text) : [];
      const list = Array.isArray(data) ? data : data.eventos || [];
      setEventos(list);
    } catch (err) {
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, [fSev, fTipo, fTrator]);

  ref.current = () => load(true);
  useEffect(() => { load(); const id = setInterval(() => ref.current?.(), 10000); return () => clearInterval(id); }, [load]);

  const filtered = eventos.filter(e => (!fTipo || e.tipo_evento?.toUpperCase() === fTipo.toUpperCase()) && (!fSev || e.severidade?.toUpperCase() === fSev.toUpperCase()));
  const total = filtered.length;
  const byType = filtered.reduce((acc, ev) => {
    const t = ev.tipo_evento?.toUpperCase() || "OUTROS";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <Header title="Eventos" sub="Registro cronológico de eventos operacionais com origem e status técnico" />
      <main className="p-6 space-y-5">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Eventos Visíveis" value={total} info="últimos 50" color="blue" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <StatCard label="Início" value={byType.INICIO || 0} info="jornadas iniciadas" color="green" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" /></svg>} />
          <StatCard label="Pausa/Alerta" value={(byType.PAUSA || 0) + (byType.ALERTA || 0)} info="atenção operacional" color="yellow" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
          <StatCard label="Retomada/Final" value={(byType.RETOMADA || 0) + (byType.FINALIZACAO || 0)} info="ciclo concluído" color="purple" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 4.89M20 20v-5h-.581" /></svg>} />
        </div>

        <SectionHeader title="Histórico de eventos" sub="Filtro por trator, operação, tipo e data" />

        <div className="flex flex-wrap gap-3">
          <input type="text" placeholder="Trator (T01)" value={fTrator} onChange={e => setFTrator(e.target.value)} className="sil-input w-36" />
          <select value={fTipo} onChange={e => setFTipo(e.target.value)} className="sil-input w-44">
            <option value="">Todos os tipos</option>
            {Object.keys(TIPOS).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={fSev} onChange={e => setFSev(e.target.value)} className="sil-input w-44">
            <option value="">Todas severidades</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
          <button onClick={() => { setFTrator(""); setFTipo(""); setFSev(""); }} className="btn-ghost">LIMPAR</button>
          <button onClick={() => load()} className="btn-primary">ATUALIZAR</button>
        </div>

        {loading ? <div className="text-center text-[#4a6a8a] py-16">Carregando eventos...</div> :
          filtered.length === 0 ? <EmptyState title="Nenhum evento real recebido ainda" sub="Os eventos aparecem quando APK, MQTT ou API confirmarem um estado operacional." /> :
            <div className="card overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-[#111820] border-b border-[#1e2d3d] text-[#4a6a8a] uppercase tracking-wider text-left">
                  <th className="px-4 py-3">Data e hora</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Trator</th><th className="px-4 py-3">Operação</th><th className="px-4 py-3">Descrição</th>
                </tr></thead>
                <tbody className="divide-y divide-[#1e2d3d]/50">
                  {filtered.map(ev => {
                    const s = badge(ev.tipo_evento);
                    return (
                      <tr key={ev.id} className="hover:bg-[#1e2d3d]/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-[#4a6a8a] whitespace-nowrap">{fmtDate(ev.timestamp)}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold ${s.cls}`}>{s.label}</span></td>
                        <td className="px-4 py-3 font-semibold text-[#c8d8e8]">{ev.trator_id || "--"}</td>
                        <td className="px-4 py-3 font-mono text-[#4a6a8a]">{ev.origem || "--"}</td>
                        <td className="px-4 py-3 text-[#4a6a8a] max-w-xs truncate">{ev.descricao || "--"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>}
        <p className="text-right text-xs text-[#4a6a8a]">{filtered.length} evento(s) · últimos 50 · polling 10s</p>
      </main>
    </>
  );
}
