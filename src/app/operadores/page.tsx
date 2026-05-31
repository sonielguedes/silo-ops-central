"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import SectionHeader from "@/components/dashboard/SectionHeader";
import Badge from "@/components/Badge";
import ApiErr from "@/components/ApiErr";
import EmptyState from "@/components/dashboard/EmptyState";
import { IS_DEMO } from "@/lib/app-env";
import { timeAgo } from "@/lib/api";

type Op = { matricula: string; nome: string; funcao: string | null; ativo: boolean; atualizado_em: string };

export default function OperadoresPage() {
  const [ops, setOps] = useState<Op[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ matricula: "", nome: "", funcao: "", ativo: true });
  const [formErr, setFormErr] = useState<string | null>(null);
  const ref = useRef<(() => Promise<void>) | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fetch("/api/operadores", { cache: "no-store", signal: AbortSignal.timeout(6000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setOps(Array.isArray(d) ? d : []);
      setErr(null);
    } catch {
      setErr("API de operadores indisponível");
    } finally { setLoading(false); }
  }, []);
  ref.current = () => load(true);
  useEffect(() => { load(); const id = setInterval(() => ref.current?.(), 15000); return () => clearInterval(id); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (IS_DEMO) return setFormErr("Ambiente demonstrativo: alteração bloqueada.");
    const mat = form.matricula.trim(); const nom = form.nome.trim();
    if (!mat || !nom) return setFormErr("Matrícula e nome são obrigatórios.");
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/operadores/${mat}` : "/api/operadores";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matricula: mat, nome: nom, funcao: form.funcao || null, ativo: form.ativo }), signal: AbortSignal.timeout(7000) });
    if (!r.ok) return setFormErr("Falha ao salvar operador.");
    setShowForm(false); setEditing(null); setForm({ matricula: "", nome: "", funcao: "", ativo: true }); await load(true);
  }

  const filtered = ops.filter(o => !search || (o.matricula + o.nome + (o.funcao || "")).toLowerCase().includes(search.toLowerCase()));
  const ativos = ops.filter(o => o.ativo).length;

  return <div className="flex-1 flex flex-col min-h-screen"><Header title="Operadores" sub="Matrículas, funções e status operacional" /><main className="p-6 space-y-5">
    {err && <ApiErr label="/api/operadores" msg={err} />}
    <div className="card-p border border-[#ffab00]/20 bg-[#ffab00]/5"><p className="text-[#ffab00] font-semibold text-sm">Ambiente demonstrativo</p><p className="text-[#4a6a8a] text-xs mt-1">Cadastro em modo leitura para apresentação ao cliente.</p></div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard label="Ativos" value={ativos} info="credenciais válidas" color="green" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
      <StatCard label="Total" value={ops.length} info="cadastros" color="blue" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h4m0 0l3-4h-5v4M13 8h7v2M13 12h5" /></svg>} />
      <StatCard label="Inativos" value={ops.length - ativos} info="bloqueados" color="red" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>} />
      <StatCard label="Ambiente" value={IS_DEMO ? "DEMO" : "LOCAL"} info="cadastro local" color="yellow" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L16 4m0 13V4m0 0L9 7" /></svg>} />
    </div>
    <SectionHeader title="Cadastro de operadores" sub="Busca, status e manutenção de matrículas" />
    <div className="flex gap-3 items-center"><input className="sil-input max-w-xs" placeholder="Pesquisar por nome, matrícula ou função..." value={search} onChange={e=>setSearch(e.target.value)} /><button className="btn-primary" onClick={()=>{ if (IS_DEMO) return setFormErr("Ambiente demonstrativo: criação bloqueada."); setForm({ matricula:"", nome:"", funcao:"", ativo:true }); setEditing(null); setFormErr(null); setShowForm(true); }}>{IS_DEMO ? "Bloqueado" : "+ Cadastrar Operador"}</button></div>
    {loading ? <div className="card-p h-64 animate-pulse" /> : filtered.length === 0 ? <EmptyState title="Nenhum operador" sub="Nenhum cadastro encontrado para os filtros atuais." /> : <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">{filtered.map(op => <div key={op.matricula} className="card-p border-l-4 border-l-[#00d4ff]"><div className="flex items-start justify-between"><div><p className="text-white font-black text-sm">{op.nome}</p><p className="text-[#00d4ff] text-[11px] font-mono uppercase tracking-widest mt-1">{op.matricula}</p></div><Badge label={op.ativo ? "ATIVO" : "INATIVO"} variant={op.ativo ? "online" : "offline"} dot={false} /></div><p className="text-[#4a6a8a] text-xs mt-3">{op.funcao || "Operador"}</p><p className="text-[#4a6a8a] text-[10px] mt-2">{timeAgo(op.atualizado_em)}</p><div className="mt-4 flex gap-2"><button className="btn-ghost" disabled={IS_DEMO} onClick={()=>{ if (IS_DEMO) return; setEditing(op.matricula); setForm({ matricula: op.matricula, nome: op.nome, funcao: op.funcao || "", ativo: op.ativo }); setShowForm(true); }}>{IS_DEMO ? "Leitura" : "Editar"}</button><button className="btn-ghost" disabled>{op.ativo ? "Ativo" : "Inativo"}</button></div></div>)}</div>}
    {showForm && <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4"><form onSubmit={save} className="card-p w-full max-w-lg space-y-4"><div className="flex items-center justify-between"><div><h3 className="text-white font-black">Operador</h3><p className="text-[#4a6a8a] text-xs">Cadastro técnico</p></div><button type="button" onClick={()=>setShowForm(false)} className="text-[#4a6a8a]">x</button></div>{formErr && <p className="text-[#ef4444] text-xs">{formErr}</p>}<div className="grid grid-cols-2 gap-3"><input className="sil-input" placeholder="Matrícula" value={form.matricula} onChange={e=>setForm({...form, matricula:e.target.value})} disabled={editing!==null || IS_DEMO} /><input className="sil-input" placeholder="Nome" value={form.nome} onChange={e=>setForm({...form, nome:e.target.value})} disabled={IS_DEMO} /></div><input className="sil-input" placeholder="Função" value={form.funcao} onChange={e=>setForm({...form, funcao:e.target.value})} disabled={IS_DEMO} /><label className="flex items-center gap-2 text-[#c8d8e8] text-xs"><input type="checkbox" checked={form.ativo} onChange={e=>setForm({...form, ativo:e.target.checked})} disabled={IS_DEMO} />Ativo</label><button className="btn-primary w-full" type="submit" disabled={IS_DEMO}>{IS_DEMO ? "Bloqueado" : "Salvar"}</button></form></div>}
  </main></div>;
}
