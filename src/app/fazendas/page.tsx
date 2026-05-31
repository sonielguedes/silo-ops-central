"use client";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import SectionHeader from "@/components/dashboard/SectionHeader";
import Badge from "@/components/Badge";
import EmptyState from "@/components/dashboard/EmptyState";
import { IS_DEMO } from "@/lib/app-env";

type Talhao = { id: string; fazenda: string; talhao: string; area: number; cultura: string; frente: string; status: "Ativo" | "Inativo" | "Preparo" };
const DEFAULT: Talhao[] = [
  { id: "1", fazenda: "Fazenda Rio Grande", talhao: "Talhão 04", area: 120, cultura: "Soja", frente: "Frente Norte", status: "Ativo" },
  { id: "2", fazenda: "Fazenda Bela Vista", talhao: "Talhão 12", area: 150, cultura: "Milho", frente: "Frente Sul", status: "Ativo" },
];

export default function FazendasPage() {
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ fazenda: "", talhao: "", area: "", cultura: "Soja", frente: "Frente Geral", status: "Preparo" as Talhao["status"] });
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sil_fazendas_talhoes");
      setTalhoes(IS_DEMO ? (JSON.parse(saved || "null") || DEFAULT) : (saved ? JSON.parse(saved) : []));
    } catch {
      setTalhoes(IS_DEMO ? DEFAULT : []);
    }
  }, []);
  const filtered = useMemo(() => talhoes.filter(t => (t.fazenda + t.talhao + t.cultura + t.frente).toLowerCase().includes(search.toLowerCase())), [talhoes, search]);
  const area = filtered.reduce((a, c) => a + c.area, 0);
  const preparo = filtered.filter(t => t.status === "Preparo").length;
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (IS_DEMO) return alert("Ambiente demonstrativo: alteração bloqueada.");
    const item: Talhao = { id: String(Date.now()), fazenda: form.fazenda.trim(), talhao: form.talhao.trim(), area: Number(form.area), cultura: form.cultura, frente: form.frente.trim(), status: form.status };
    const up = [item, ...talhoes]; setTalhoes(up); localStorage.setItem("sil_fazendas_talhoes", JSON.stringify(up)); setShow(false);
  };
  return <div className="flex-1 flex flex-col min-h-screen"><Header title="Fazendas & Talhões" sub="Divisão territorial, frentes e áreas operacionais" /><main className="p-6 space-y-5">
    <div className="card-p border border-[#ffab00]/20 bg-[#ffab00]/5"><p className="text-[#ffab00] font-semibold text-sm">Ambiente demonstrativo</p><p className="text-[#4a6a8a] text-xs mt-1">Cadastro local pronto para integrar mapa, operação e alocação de frota.</p></div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4"><StatCard label="Fazendas" value={new Set(filtered.map(t=>t.fazenda)).size} info="ativos" color="blue" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} /><StatCard label="Talhões" value={filtered.length} info="cadastros" color="green" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L16 4m0 13V4m0 0L9 7" /></svg>} /><StatCard label="Área" value={`${area} ha`} info="monitorada" color="yellow" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l8 4-8 4-8-4 8-4zm0 8l8 4-8 4-8-4 8-4z" /></svg>} /><StatCard label="Preparo" value={preparo} info="frentes em preparação" color="red" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} /></div>
    <SectionHeader title="Talhões operacionais" sub="Cadastro local com busca e consistência visual" />
    <div className="flex gap-3"><input className="sil-input max-w-xs" placeholder="Buscar por fazenda, talhão ou cultura..." value={search} onChange={e=>setSearch(e.target.value)} /><button className="btn-primary ml-auto" onClick={()=>{ if (IS_DEMO) return alert("Ambiente demonstrativo: alteração bloqueada."); setShow(true); }}>{IS_DEMO ? "Bloqueado" : "+ Novo Talhão"}</button></div>
    {filtered.length===0 ? <EmptyState title="Nenhum talhão encontrado" sub="Crie um novo cadastro ou ajuste os filtros de busca." /> : <div className="card overflow-hidden"><table className="w-full text-sm"><thead><tr className="bg-[#111820] border-b border-[#1e2d3d] text-[#4a6a8a] text-xs uppercase tracking-wider text-left"><th className="px-4 py-3">Fazenda</th><th className="px-4 py-3">Talhão</th><th className="px-4 py-3">Área</th><th className="px-4 py-3">Cultura</th><th className="px-4 py-3">Frente</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-[#1e2d3d]/50 bg-[#161f2a]">{filtered.map(t => <tr key={t.id} className="hover:bg-[#1e2d3d]/30"><td className="px-4 py-3 font-semibold text-[#c8d8e8]">{t.fazenda}</td><td className="px-4 py-3 font-mono text-[#00d4ff] font-bold text-xs">{t.talhao}</td><td className="px-4 py-3 font-mono text-[#c8d8e8]">{t.area} ha</td><td className="px-4 py-3"><span className="px-2 py-0.5 bg-[#111820] border border-[#1e2d3d] rounded text-[#4a6a8a] text-xs">{t.cultura}</span></td><td className="px-4 py-3 text-[#4a6a8a] text-xs">{t.frente}</td><td className="px-4 py-3"><Badge label={t.status} variant={t.status==="Ativo"?"online":t.status==="Preparo"?"instavel":"offline"} dot /></td></tr>)}</tbody></table></div>}
    {show && <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4"><form onSubmit={save} className="card-p w-full max-w-lg space-y-4"><div className="flex items-center justify-between"><div><h3 className="text-white font-black">Novo talhão</h3><p className="text-[#4a6a8a] text-xs">Cadastro territorial</p></div><button type="button" onClick={()=>setShow(false)} className="text-[#4a6a8a]">x</button></div><div className="grid grid-cols-2 gap-3"><input className="sil-input" placeholder="Fazenda" value={form.fazenda} onChange={e=>setForm({...form,fazenda:e.target.value})} disabled={IS_DEMO} /><input className="sil-input" placeholder="Talhão" value={form.talhao} onChange={e=>setForm({...form,talhao:e.target.value})} disabled={IS_DEMO} /></div><div className="grid grid-cols-2 gap-3"><input className="sil-input" placeholder="Área" type="number" value={form.area} onChange={e=>setForm({...form,area:e.target.value})} disabled={IS_DEMO} /><input className="sil-input" placeholder="Frente" value={form.frente} onChange={e=>setForm({...form,frente:e.target.value})} disabled={IS_DEMO} /></div><div className="grid grid-cols-2 gap-3"><select className="sil-input" value={form.cultura} onChange={e=>setForm({...form,cultura:e.target.value})} disabled={IS_DEMO}><option>Soja</option><option>Milho</option><option>Algodão</option></select><select className="sil-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value as Talhao["status"]})} disabled={IS_DEMO}><option>Preparo</option><option>Ativo</option><option>Inativo</option></select></div><button className="btn-primary w-full" type="submit" disabled={IS_DEMO}>{IS_DEMO ? "Bloqueado" : "Salvar"}</button></form></div>}
  </main></div>;
}
