"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import SectionHeader from "@/components/dashboard/SectionHeader";
import Badge from "@/components/Badge";
import ApiErr from "@/components/ApiErr";
import EmptyState from "@/components/dashboard/EmptyState";
import { api, getDynamicPresence, timeAgo, fmtDate, type Equipamento } from "@/lib/api";

export default function EquipamentosPage() {
  const [equip, setEquip] = useState<Equipamento[]>([]);
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<Equipamento|null>(null);
  const ref = useRef<(()=>Promise<void>)|null>(null);

  const load = useCallback(async (s=false) => {
    if(!s) setLoading(true);
    const r = await api.equipamentos();
    if(r.ok) { setEquip(r.data); setErr(null); } else setErr(r.error);
    setLoading(false);
  }, []);
  ref.current = () => load(true);
  useEffect(() => { load(); const id=setInterval(()=>ref.current?.(), 10000); return()=>clearInterval(id); }, [load]);

  const counts = equip.reduce((a,e)=>{ a[getDynamicPresence(e.last_seen)]++; return a; },{ONLINE:0,INSTAVEL:0,OFFLINE:0});
  const filtered = equip.filter(e=>!search||(e.trator_id+e.status+(e.app_version||"")).toLowerCase().includes(search.toLowerCase()));
  const total = equip.length;

  return (
    <>
      <Header title="Equipamentos" sub="Frota monitorada em tempo real com presença, telemetria e última atualização" />
      <main className="p-6 space-y-5">
        {err && <ApiErr label="/api/equipamentos/status" msg={err} />}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total Equipamentos" value={total} info="cadastrados" color="blue" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h4m0 0l3-4h-5v4M13 8h7v2M13 12h5" /></svg>} />
          <StatCard label="Online" value={counts.ONLINE} info="último heartbeat válido" color="green" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a9.5 9.5 0 0113.436 0M4.222 9.222a13.5 13.5 0 0115.556 0" /></svg>} />
          <StatCard label="Instável" value={counts.INSTAVEL} info="sem atualização recente" color="yellow" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
          <StatCard label="Offline" value={counts.OFFLINE} info="sem sinal > 90s" color="red" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>} />
        </div>

        <SectionHeader title="Monitoramento em tempo real" sub="Leitura operacional de frota, presença e última atualização" />

        {/* Search + table */}
        <div className="flex gap-3">
          <input type="text" placeholder="Buscar trator, status, versão ou GPS..." value={search} onChange={e=>setSearch(e.target.value)} className="sil-input max-w-xs" />
        </div>

        {loading ? (
          <div className="card overflow-hidden">{Array.from({length:4}).map((_,i)=><div key={i} className="px-5 py-5 border-b border-[#1e2d3d] animate-pulse"><div className="h-4 bg-[#1e2d3d] rounded w-1/2" /></div>)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState title={equip.length === 0 ? "Aguardando sincronização dos APKs" : "Nenhum equipamento localizado"} sub={equip.length === 0 ? "Nenhum equipamento com telemetria foi recebido ainda." : "Ajuste os filtros de busca ou espere a próxima atualização."} />
        ) : (
          <div className="grid xl:grid-cols-3 gap-4">
            <div className={`${sel?"xl:col-span-2":""} card overflow-hidden`}>
              <table className="w-full text-sm">
                <thead><tr className="bg-[#111820] border-b border-[#1e2d3d] text-[#4a6a8a] text-xs uppercase tracking-wider text-left">
                  <th className="px-4 py-3">Trator</th><th className="px-4 py-3">Presenca</th><th className="px-4 py-3">Status Op.</th><th className="px-4 py-3">Ultimo Sinal</th><th className="px-4 py-3">Bateria</th><th className="px-4 py-3">GPS</th>
                </tr></thead>
                <tbody className="divide-y divide-[#1e2d3d]/50">
                  {filtered.map((eq, idx) => {
                    const p = getDynamicPresence(eq.last_seen);
                    const active = sel?.trator_id === eq.trator_id;
                    return (
                      <tr key={`${eq.trator_id}-${idx}`} onClick={()=>setSel(active?null:eq)} className={`hover:bg-[#1e2d3d]/30 cursor-pointer transition-colors border-l-2 ${active?"border-l-[#00d4ff] bg-[#00d4ff]/5":p==="ONLINE"?"border-l-[#00e676]":p==="INSTAVEL"?"border-l-[#ffab00]":"border-l-[#ff3d57]"}`}>
                        <td className="px-4 py-3"><span className={`font-bold ${p==="ONLINE"?"text-[#00e676]":p==="INSTAVEL"?"text-[#ffab00]":"text-[#ff3d57]"}`}>{eq.trator_id}</span></td>
                        <td className="px-4 py-3"><Badge label={p} variant={p==="ONLINE"?"online":p==="INSTAVEL"?"instavel":"offline"} /></td>
                        <td className="px-4 py-3 text-[#4a6a8a] text-xs">{eq.status||"--"}</td>
                        <td className="px-4 py-3 text-[#4a6a8a] text-xs">{timeAgo(eq.last_seen)}</td>
                        <td className="px-4 py-3">
                          {eq.bateria!==null?<div className="flex items-center gap-2"><div className="w-12 h-1.5 bg-[#1e2d3d] rounded-full overflow-hidden"><div style={{width:`${Math.min(eq.bateria,100)}%`}} className={`h-full rounded-full ${eq.bateria>60?"bg-[#00e676]":eq.bateria>30?"bg-[#ffab00]":"bg-[#ff3d57]"}`}/></div><span className="text-xs text-[#4a6a8a]">{eq.bateria}%</span></div>:<span className="text-[#4a6a8a]">--</span>}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[#4a6a8a]">{eq.latitude!==null?`${eq.latitude.toFixed(4)}, ${(eq.longitude||0).toFixed(4)}`:"--"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Detail panel */}
            {sel && (
              <div className="card-p space-y-4">
                <div className="flex items-center justify-between"><p className="font-semibold text-[#c8d8e8]">{sel.trator_id}</p><button onClick={()=>setSel(null)} className="text-[#4a6a8a] hover:text-[#c8d8e8] text-sm">x</button></div>
                <Badge label={getDynamicPresence(sel.last_seen)} variant={getDynamicPresence(sel.last_seen)==="ONLINE"?"online":getDynamicPresence(sel.last_seen)==="INSTAVEL"?"instavel":"offline"} />
                <div className="space-y-2 text-sm">
                  <DRow label="Status Op." value={sel.status||"--"} />
                  <DRow label="Ultimo sinal" value={fmtDate(sel.last_seen)} />
                  <DRow label="Ha quanto tempo" value={timeAgo(sel.last_seen)} />
                  <DRow label="Bateria" value={sel.bateria!==null?`${sel.bateria}%`:"--"} />
                  <DRow label="Velocidade" value={sel.velocidade!==null?`${Number(sel.velocidade).toFixed(1)} km`:"--"} />
                  <DRow label="Latitude" value={sel.latitude!==null?String(sel.latitude.toFixed(6)):"--"} />
                  <DRow label="Longitude" value={sel.longitude!==null?String(sel.longitude.toFixed(6)):"--"} />
                  <DRow label="App Version" value={sel.app_version||"--"} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
function DRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-[#4a6a8a]">{label}</span><span className="text-[#c8d8e8] font-mono text-xs">{value}</span></div>;
}
