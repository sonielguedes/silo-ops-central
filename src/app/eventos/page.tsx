"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import SectionHeader from "@/components/dashboard/SectionHeader";
import ApiErr from "@/components/ApiErr";
import EmptyState from "@/components/dashboard/EmptyState";

interface Evento { id:number; id_local:string|null; operacao_id:string|null; trator_id:string|null; tipo_evento:string; descricao:string|null; timestamp:string; }

const TIPOS: Record<string,{label:string;cls:string}> = {
  INICIO:      {label:"INICIO",    cls:"text-[#00e676] border-[#00e676]/40 bg-[#00e676]/10"},
  PAUSA:       {label:"PAUSA",     cls:"text-[#ffab00] border-[#ffab00]/40 bg-[#ffab00]/10"},
  RETOMADA:    {label:"RETOMADA",  cls:"text-[#00d4ff] border-[#00d4ff]/40 bg-[#00d4ff]/10"},
  FINALIZACAO: {label:"FINAL",     cls:"text-[#4a6a8a] border-[#1e2d3d] bg-[#111820]"},
  ALERTA:      {label:"ALERTA",    cls:"text-[#ff3d57] border-[#ff3d57]/40 bg-[#ff3d57]/10"},
  HEARTBEAT:   {label:"HB",        cls:"text-[#4a6a8a] border-[#1e2d3d]/50 bg-[#111820]/50"},
};
function badge(tipo:string){return TIPOS[tipo?.toUpperCase()]||{label:tipo||"EVT",cls:"text-[#4a6a8a] border-[#1e2d3d] bg-[#111820]"};}

function fmtDate(iso:string|null|undefined){if(!iso)return"--";return new Date(iso).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"});}

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const [fTrator, setFTrator] = useState("");
  const [fOp, setFOp] = useState("");
  const [fTipo, setFTipo] = useState("");
  const ref = useRef<(()=>Promise<void>)|null>(null);

  const load = useCallback(async(s=false)=>{
    if(!s) setLoading(true);
    const p = new URLSearchParams();
    if(fOp) p.set("operacaoId",fOp);
    if(fTrator) p.set("tratorId",fTrator);
    p.set("limit","50");
    try{
      const qs=p.toString();
      const savedUrl = typeof window !== "undefined" ? localStorage.getItem("sil_api_base_url") : null;
      const url = savedUrl
        ? savedUrl.trim().replace(/\/$/, "")
        : ""; // Use relative proxy by default to bypass CORS

      const r=await fetch(qs?`${url}/api/eventos?${qs}`:`${url}/api/eventos/recentes`,{cache:"no-store",signal:AbortSignal.timeout(9000)});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const d=await r.json(); setEventos(Array.isArray(d)?d:[]); setErr(null);
    }catch(e){setErr(e instanceof Error?e.message:"Erro");}finally{setLoading(false);}
  },[fOp,fTrator]);

  ref.current = () => load(true);
  useEffect(()=>{load();const id=setInterval(()=>ref.current?.(),10000);return()=>clearInterval(id);},[load]);
  const filtered = eventos.filter(e=>!fTipo||e.tipo_evento?.toUpperCase()===fTipo.toUpperCase());
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
        {err && <ApiErr label="/api/eventos" msg={err} />}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Eventos Visíveis" value={total} info="últimos 50" color="blue" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <StatCard label="Início" value={byType.INICIO || 0} info="jornadas iniciadas" color="green" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" /></svg>} />
          <StatCard label="Pausa/Alerta" value={(byType.PAUSA || 0) + (byType.ALERTA || 0)} info="atenção operacional" color="yellow" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
          <StatCard label="Retomada/Final" value={(byType.RETOMADA || 0) + (byType.FINALIZACAO || 0)} info="ciclo concluído" color="purple" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 4.89M20 20v-5h-.581" /></svg>} />
        </div>

        <SectionHeader title="Histórico de eventos" sub="Filtro por trator, operação, tipo e data" />

        <div className="flex flex-wrap gap-3">
          <input type="text" placeholder="Trator (T01)" value={fTrator} onChange={e=>setFTrator(e.target.value)} className="sil-input w-36" />
          <input type="text" placeholder="Operacao ID" value={fOp} onChange={e=>setFOp(e.target.value)} className="sil-input w-52" />
          <select value={fTipo} onChange={e=>setFTipo(e.target.value)} className="sil-input w-44">
            <option value="">Todos os tipos</option>
            {Object.keys(TIPOS).map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={()=>{setFTrator("");setFOp("");setFTipo("");}} className="btn-ghost">LIMPAR</button>
          <button onClick={()=>load()} className="btn-primary">ATUALIZAR</button>
        </div>

        {loading ? <div className="text-center text-[#4a6a8a] py-16">Carregando eventos...</div> :
        filtered.length===0 ? <EmptyState title="Nenhum evento real recebido ainda" sub="Os eventos aparecem quando APK, MQTT ou API confirmarem um estado operacional." /> :
        <div className="card overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-[#111820] border-b border-[#1e2d3d] text-[#4a6a8a] uppercase tracking-wider text-left">
              <th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Trator</th><th className="px-4 py-3">Operacao</th><th className="px-4 py-3">Descricao</th>
            </tr></thead>
            <tbody className="divide-y divide-[#1e2d3d]/50">
              {filtered.map(ev=>{const s=badge(ev.tipo_evento);return(
                <tr key={ev.id} className="hover:bg-[#1e2d3d]/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-[#4a6a8a] whitespace-nowrap">{fmtDate(ev.timestamp)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold ${s.cls}`}>{s.label}</span></td>
                  <td className="px-4 py-3 font-semibold text-[#c8d8e8]">{ev.trator_id||"--"}</td>
                  <td className="px-4 py-3 font-mono text-[#4a6a8a]">{ev.operacao_id?ev.operacao_id.slice(0,12)+"...":"--"}</td>
                  <td className="px-4 py-3 text-[#4a6a8a] max-w-xs truncate">{ev.descricao||"--"}</td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>}
        <p className="text-right text-xs text-[#4a6a8a]">{filtered.length} evento(s) · ultimos 50 · polling 10s</p>
      </main>
    </>
  );
}
