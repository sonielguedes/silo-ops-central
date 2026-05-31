"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import SectionHeader from "@/components/dashboard/SectionHeader";
import EmptyState from "@/components/dashboard/EmptyState";
import Badge from "@/components/Badge";
import { IS_DEMO } from "@/lib/app-env";

type Alerta = { id: string; tratorId: string; severidade: "Baixa" | "Média" | "Alta" | "Crítica"; tipo: string; descricao: string; timestamp: string; resolvido: boolean; resolvidoEm?: string };
const DEFAULT: Alerta[] = [
  { id: "alt-1", tratorId: "T01", severidade: "Crítica", tipo: "Profundidade Incorreta", descricao: "Desvio de profundidade acima do alvo operacional.", timestamp: new Date(Date.now()-720000).toISOString(), resolvido: false },
  { id: "alt-2", tratorId: "T02", severidade: "Alta", tipo: "Inatividade", descricao: "Operação ativa sem movimentação prolongada.", timestamp: new Date(Date.now()-2100000).toISOString(), resolvido: false },
  { id: "alt-3", tratorId: "T03", severidade: "Média", tipo: "GPS Ruim", descricao: "Precisão do sinal degradada acima do limite.", timestamp: new Date(Date.now()-7200000).toISOString(), resolvido: true, resolvidoEm: new Date(Date.now()-2700000).toISOString() },
];

const sevCls = { Baixa:"border-blue-500/30 bg-blue-500/10 text-blue-400", "Média":"border-[#ffab00]/30 bg-[#ffab00]/10 text-[#ffab00]", Alta:"border-orange-500/30 bg-orange-500/10 text-orange-400", Crítica:"border-[#ff3d57]/30 bg-[#ff3d57]/10 text-[#ff3d57]" } as const;

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [status, setStatus] = useState<"pendentes"|"resolvidos"|"todos">("pendentes");
  const [sev, setSev] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sil_alertas");
      setAlertas(IS_DEMO ? (JSON.parse(saved || "null") || DEFAULT) : (saved ? JSON.parse(saved) : []));
    } catch {
      setAlertas(IS_DEMO ? DEFAULT : []);
    }
  }, []);
  const pendentes = alertas.filter(a => !a.resolvido).length;
  const criticos = alertas.filter(a => !a.resolvido && (a.severidade === "Alta" || a.severidade === "Crítica")).length;
  const resolvidos = alertas.filter(a => a.resolvido).length;
  const filtered = alertas.filter(a => (status === "todos" || (status === "pendentes" ? !a.resolvido : a.resolvido)) && (!sev || a.severidade === sev));
  const resolve = (id: string) => {
    if (IS_DEMO) return alert("Ambiente demonstrativo: alteração bloqueada.");
    const up = alertas.map(x => x.id === id ? { ...x, resolvido: true, resolvidoEm: new Date().toISOString() } : x);
    setAlertas(up); localStorage.setItem("sil_alertas", JSON.stringify(up));
  };
  return <div className="flex-1 flex flex-col min-h-screen"><Header title="Alertas" sub="Ocorrências operacionais, severidade e resolução" /><main className="p-6 space-y-5">
    <div className="card-p border border-[#ffab00]/20 bg-[#ffab00]/5"><p className="text-[#ffab00] font-semibold text-sm">Ambiente demonstrativo</p><p className="text-[#4a6a8a] text-xs mt-1">Fila de alertas pronta para integração com MQTT e servidor de eventos.</p></div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard label="Pendentes" value={pendentes} info="alertas abertos" color="yellow" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
      <StatCard label="Críticos/Altos" value={criticos} info="prioridade máxima" color="red" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M10.29 3.86l-7.29 12.58A2 2 0 004.71 19h14.58a2 2 0 001.72-3.08L13.71 3.86a2 2 0 00-3.42 0z" /></svg>} />
      <StatCard label="Resolvidos" value={resolvidos} info="baixados na fila" color="green" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>} />
      <StatCard label="Ambiente" value={IS_DEMO ? "DEMO" : "LOCAL"} info="dados demonstrativos" color="blue" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L16 4m0 13V4m0 0L9 7" /></svg>} />
    </div>
    <SectionHeader title="Fila de alertas" sub="Estado operacional, severidade e resolução" />
    <div className="flex gap-3 flex-wrap">
      <div className="flex border border-[#1e2d3d] rounded-lg overflow-hidden bg-[#111820]">{(["pendentes","resolvidos","todos"] as const).map(v => <button key={v} onClick={()=>setStatus(v)} className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border-l first:border-l-0 border-[#1e2d3d] ${status===v?"bg-[#00d4ff]/10 text-[#00d4ff]":"text-[#4a6a8a]"}`}>{v}</button>)}</div>
      <select value={sev} onChange={e=>setSev(e.target.value)} className="sil-input w-44 text-xs"><option value="">Todas as severidades</option><option>Baixa</option><option>Média</option><option>Alta</option><option>Crítica</option></select>
    </div>
    {filtered.length === 0 ? <EmptyState title="Nenhum alerta cadastrado" sub="Tudo limpo. Nenhum item para os filtros atuais." /> : <div className="space-y-3">{filtered.map(a => <div key={a.id} className={`card-p border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${a.resolvido?"opacity-60 border-[#1e2d3d] bg-[#161f2a]":"border-[#1e2d3d] bg-[#161f2a]"}`}><div className="space-y-1"><div className="flex flex-wrap items-center gap-2"><span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${sevCls[a.severidade]}`}>{a.severidade}</span><span className="font-bold text-[#c8d8e8] text-sm">{a.tratorId}</span><span className="text-[#00d4ff] text-xs font-semibold">{a.tipo}</span><span className="text-[#4a6a8a] text-[10px] font-mono">{new Date(a.timestamp).toLocaleString("pt-BR")}</span></div><p className="text-[#c8d8e8] text-xs leading-relaxed">{a.descricao}</p>{a.resolvido && a.resolvidoEm && <p className="text-[#00e676] text-[10px] font-semibold">Resolvido em: {new Date(a.resolvidoEm).toLocaleString("pt-BR")}</p>}</div>{!a.resolvido && <button disabled={IS_DEMO} onClick={()=>resolve(a.id)} className="px-3 py-1.5 rounded-lg border border-[#00e676]/40 text-[#00e676] text-xs font-bold hover:bg-[#00e676]/10 disabled:opacity-40 transition-colors whitespace-nowrap self-start sm:self-center">{IS_DEMO ? "Bloqueado" : "Resolver"}</button>}</div>)}</div>}
  </main></div>;
}
