"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import SectionHeader from "@/components/dashboard/SectionHeader";
import Badge from "@/components/Badge";
import ApiErr from "@/components/ApiErr";
import EmptyState from "@/components/dashboard/EmptyState";
import { IS_DEMO } from "@/lib/app-env";
import { api, getDynamicPresence, timeAgo, type Equipamento } from "@/lib/api";

function mkTelemetry(id: string, online: boolean) {
  const seed = id.charCodeAt(id.length - 1) || 1;
  return { rpm: online ? 1600 + seed * 20 : 0, depth: online ? 24 + (seed % 4) : 0, fuel: online ? 72 - (seed % 20) : 100 };
}

export default function TelemetriaPage() {
  const [equip, setEquip] = useState<Equipamento[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const ref = useRef<(() => Promise<void>) | null>(null);
  const load = useCallback(async (silent=false) => { if (!silent) setLoading(true); const r = await api.equipamentos(); if (r.ok) { setEquip(r.data); setErr(null); setSel(prev => prev ?? r.data[0]?.trator_id ?? null); } else setErr(r.error); setLoading(false); }, []);
  ref.current = () => load(true);
  useEffect(() => { load(); const id = setInterval(() => ref.current?.(), 10000); return () => clearInterval(id); }, [load]);
  const current = equip.find(e => e.trator_id === sel) || null;
  const tele = current ? mkTelemetry(current.trator_id, getDynamicPresence(current.last_seen) === "ONLINE") : null;
  const presence = current ? getDynamicPresence(current.last_seen) : "OFFLINE";

  useEffect(() => {
    if (!current || !IS_DEMO) return;
    const id = setInterval(() => setLogs(v => [`${new Date().toLocaleTimeString("pt-BR")} · Pacote telemetria ${current.trator_id}`, ...v].slice(0, 10)), 4000);
    return () => clearInterval(id);
  }, [current?.trator_id, current]);

  return <div className="flex-1 flex flex-col min-h-screen"><Header title="Telemetria" sub="Sensores, presença e diagnóstico operacional" /><main className="p-6 space-y-5">
    {err && <ApiErr label="/api/equipamentos/status" msg={err} />}
    <div className="card-p border border-[#ffab00]/20 bg-[#ffab00]/5"><p className="text-[#ffab00] font-semibold text-sm">{IS_DEMO ? "Ambiente demonstrativo" : "Ambiente produção"}</p><p className="text-[#4a6a8a] text-xs mt-1">{IS_DEMO ? "Sensores simulados sobre a frota real para validar a interface." : "Sem feed de sensores real neste ambiente. A página mostra apenas estado técnico."}</p></div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard label="Frota" value={equip.length} info="equipamentos ativos" color="blue" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h4m0 0l3-4h-5v4M13 8h7v2M13 12h5" /></svg>} />
      <StatCard label="Online" value={equip.filter(e=>getDynamicPresence(e.last_seen)==="ONLINE").length} info="heartbeat válido" color="green" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a9.5 9.5 0 0113.436 0M4.222 9.222a13.5 13.5 0 0115.556 0" /></svg>} />
      <StatCard label="Sensores" value={IS_DEMO ? (current ? "SIM" : "N/D") : "N/D"} info="dashboard local" color="yellow" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>} />
      <StatCard label="Presença" value={presence} info="status dinâmico" color="purple" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
    </div>
    <SectionHeader title="Telemetria por máquina" sub="Lista lateral, métricas e log curto" />
    {loading ? <div className="text-[#4a6a8a] py-16 text-center">Carregando telemetria...</div> : !IS_DEMO ? <EmptyState title="Aguardando sincronização dos sensores" sub="Não há feed de telemetria real conectado neste ambiente." /> : equip.length===0 ? <EmptyState title="Nenhum equipamento disponível" sub="Aguardando sincronização dos APKs." /> : <div className="grid lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 space-y-2">{equip.map(e => { const p=getDynamicPresence(e.last_seen); const active=e.trator_id===sel; return <button key={e.trator_id} onClick={()=>setSel(e.trator_id)} className={`w-full text-left p-3 rounded-xl border flex items-center justify-between ${active?"bg-[#00d4ff]/10 border-[#00d4ff]/40":"bg-[#161f2a] border-[#1e2d3d] text-[#c8d8e8]"}`}><div><p className="font-bold text-sm">{e.trator_id}</p><p className="text-[#4a6a8a] text-[10px]">{e.status || "Sem operação"}</p></div><div className="text-right"><p className="font-mono text-xs">{timeAgo(e.last_seen)}</p><Badge label={p} variant={p==="ONLINE"?"online":p==="INSTAVEL"?"instavel":"offline"} dot={false} /></div></button>; })}</div>
      <div className="lg:col-span-3 space-y-4">
        {current && tele && <><div className="grid sm:grid-cols-3 gap-4"><StatCard label="RPM" value={tele.rpm} info="motor" color="green" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} /><StatCard label="Profundidade" value={`${tele.depth} cm`} info="implemento" color="blue" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5v14" /></svg>} /><StatCard label="Combustível" value={`${tele.fuel}%`} info="tanque" color={tele.fuel>20?"green":"red"} icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v10H3zM14 9h3l2 2v6h-5" /></svg>} /></div><div className="card-p"><SectionHeader title={`Logs ${current.trator_id}`} sub="Pacotes curtos de telemetria local" /><div className="space-y-2 text-xs text-[#4a6a8a] font-mono">{logs.length===0 ? <EmptyState title="Aguardando pacote de telemetria" sub="Os logs aparecem após a primeira atualização local." /> : logs.map((l,i)=><p key={i}>{l}</p>)}</div></div></>}
      </div>
    </div>}
  </main></div>;
}
