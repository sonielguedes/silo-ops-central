"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import SectionHeader from "@/components/dashboard/SectionHeader";
import Badge from "@/components/Badge";
import EmptyState from "@/components/dashboard/EmptyState";
import { APP_ENV, CAN_LOCAL_OPERADORES_CRUD, IS_DEMO } from "@/lib/app-env";
import { timeAgo } from "@/lib/api";

type Op = { matricula: string; nome: string; funcao: string | null; ativo: boolean; atualizado_em: string; origem?: "api" | "local" | "demo" };

const LOCAL_KEY = "sil_operadores_demo_v1";

function readLocalOps(): Op[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeLocalOps(ops: Op[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(ops));
}

function validateForm(form: { matricula: string; nome: string; funcao: string; ativo: boolean }) {
  const matricula = form.matricula.trim();
  const nome = form.nome.trim();
  const funcao = form.funcao.trim();
  if (!matricula) return "Matrícula obrigatória.";
  if (!nome) return "Nome obrigatório.";
  if (!funcao) return "Função obrigatória.";
  if (typeof form.ativo !== "boolean") return "Estado ativo inválido.";
  return null;
}

export default function OperadoresPage() {
  const [ops, setOps] = useState<Op[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ matricula: "", nome: "", funcao: "", ativo: true });
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const ref = useRef<(() => Promise<void>) | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (IS_DEMO || CAN_LOCAL_OPERADORES_CRUD) {
        setOps(readLocalOps());
        setErr(null);
        return;
      }

      const r = await fetch("/api/operadores", { cache: "no-store", signal: AbortSignal.timeout(6000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const list = Array.isArray(d) ? d : Array.isArray(d?.operadores) ? d.operadores : [];
      setOps(list);
      if (d && typeof d === "object" && "status_tecnico" in d && typeof d.status_tecnico === "string") {
        setPageNotice(d.status_tecnico);
      } else {
        setPageNotice(null);
      }
      setErr(null);
    } catch {
      if (IS_DEMO || CAN_LOCAL_OPERADORES_CRUD) {
        setOps(readLocalOps());
        setErr(null);
      } else {
        setErr("Serviço de operadores indisponível.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  ref.current = () => load(true);

  useEffect(() => {
    load();
    const id = setInterval(() => ref.current?.(), 15000);
    return () => clearInterval(id);
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormNotice(null);
    setPageNotice(null);

    const validation = validateForm(form);
    if (validation) {
      setFormNotice(validation);
      return;
    }

    const mat = form.matricula.trim();
    const nom = form.nome.trim();
    const funcao = form.funcao.trim();

    if (IS_DEMO) {
      setFormNotice("Ambiente demonstrativo: cadastro real desativado.");
      return;
    }

    if (CAN_LOCAL_OPERADORES_CRUD) {
      const now = new Date().toISOString();
      const existing = readLocalOps();
      const next: Op[] = [
        { matricula: mat, nome: nom, funcao, ativo: form.ativo, atualizado_em: now, origem: "local" },
        ...existing.filter(op => op.matricula !== mat),
      ];
      writeLocalOps(next);
      setOps(next);
      setPageNotice("Operador salvo em dados demonstrativos locais.");
      setShowForm(false);
      setEditing(null);
      setForm({ matricula: "", nome: "", funcao: "", ativo: true });
      return;
    }

    try {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/operadores/${mat}` : "/api/operadores";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricula: mat, nome: nom, funcao, ativo: form.ativo }),
        signal: AbortSignal.timeout(7000)
      });
      const data = await r.json().catch(() => null);

      if (!r.ok || (data && typeof data === "object" && "status_tecnico" in data)) {
        setPageNotice((data && typeof data === "object" && typeof data.status_tecnico === "string" && data.status_tecnico) || "Falha técnica ao salvar operador.");
        return;
      }

      setShowForm(false);
      setEditing(null);
      setForm({ matricula: "", nome: "", funcao: "", ativo: true });
      setPageNotice("Operador salvo com sucesso.");
      await load(true);
    } catch {
      setPageNotice("Serviço de operadores temporariamente indisponível.");
    }
  }

  const filtered = ops.filter(o => !search || (o.matricula + o.nome + (o.funcao || "")).toLowerCase().includes(search.toLowerCase()));
  const ativos = ops.filter(o => o.ativo).length;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Operadores" sub="Matrículas, funções e status operacional" />
      <main className="p-6 space-y-5">
        {err && <div className="card-p border border-[#ffab00]/20 bg-[#ffab00]/5"><p className="text-[#ffab00] font-semibold text-sm">Status técnico</p><p className="text-[#4a6a8a] text-xs mt-1">{err}</p></div>}
        {pageNotice && <div className="card-p border border-[#ffab00]/20 bg-[#ffab00]/5"><p className="text-[#ffab00] font-semibold text-sm">Aviso</p><p className="text-[#4a6a8a] text-xs mt-1">{pageNotice}</p></div>}
        {(IS_DEMO || CAN_LOCAL_OPERADORES_CRUD) && (
          <div className="card-p border border-[#ffab00]/20 bg-[#ffab00]/5">
            <p className="text-[#ffab00] font-semibold text-sm">{IS_DEMO ? "Ambiente demonstrativo" : `Modo local (${APP_ENV})`}</p>
            <p className="text-[#4a6a8a] text-xs mt-1">{IS_DEMO ? "Cadastro real desativado." : "Cadastro salvo somente em localStorage para demonstração."}</p>
          </div>
        )}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Ativos" value={ativos} info="credenciais válidas" color="green" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
          <StatCard label="Total" value={ops.length} info="cadastros" color="blue" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h4m0 0l3-4h-5v4M13 8h7v2M13 12h5" /></svg>} />
          <StatCard label="Inativos" value={ops.length - ativos} info="bloqueados" color="red" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>} />
          <StatCard label="Ambiente" value={IS_DEMO ? "DEMO" : CAN_LOCAL_OPERADORES_CRUD ? "LOCAL" : "PROD"} info="cadastro controlado" color="yellow" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L16 4m0 13V4m0 0L9 7" /></svg>} />
        </div>

        <SectionHeader title="Cadastro de operadores" sub="Busca, status e manutenção de matrículas" />
        <div className="flex gap-3 items-center">
          <input className="sil-input max-w-xs" placeholder="Pesquisar por nome, matrícula ou função..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn-primary" onClick={() => { setForm({ matricula: "", nome: "", funcao: "", ativo: true }); setEditing(null); setFormNotice(null); setShowForm(true); }}>{IS_DEMO ? "Bloqueado" : "+ Cadastrar Operador"}</button>
        </div>

        {loading ? <div className="card-p h-64 animate-pulse" /> : filtered.length === 0 ? <EmptyState title="Nenhum operador" sub="Nenhum cadastro encontrado para os filtros atuais." /> : (
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {filtered.map(op => (
              <div key={op.matricula} className="card-p border-l-4 border-l-[#00d4ff]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-black text-sm">{op.nome}</p>
                    <p className="text-[#00d4ff] text-[11px] font-mono uppercase tracking-widest mt-1">{op.matricula}</p>
                  </div>
                  <Badge label={op.ativo ? "ATIVO" : "INATIVO"} variant={op.ativo ? "online" : "offline"} dot={false} />
                </div>
                <p className="text-[#4a6a8a] text-xs mt-3">{op.funcao || "Operador"}</p>
                <p className="text-[#4a6a8a] text-[10px] mt-2">{timeAgo(op.atualizado_em)}</p>
                <div className="mt-4 flex gap-2">
                  <button className="btn-ghost" disabled={IS_DEMO} onClick={() => { if (IS_DEMO) return; setEditing(op.matricula); setForm({ matricula: op.matricula, nome: op.nome, funcao: op.funcao || "", ativo: op.ativo }); setFormNotice(null); setShowForm(true); }}>{IS_DEMO ? "Leitura" : "Editar"}</button>
                  <button className="btn-ghost" disabled>{op.ativo ? "Ativo" : "Inativo"}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
            <form onSubmit={save} className="card-p w-full max-w-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-black">Operador</h3>
                  <p className="text-[#4a6a8a] text-xs">Cadastro técnico</p>
                </div>
                <button type="button" onClick={() => { setShowForm(false); setFormNotice(null); }} className="text-[#4a6a8a]">x</button>
              </div>
              {formNotice && <p className="text-[#ffab00] text-xs">{formNotice}</p>}
              <div className="grid grid-cols-2 gap-3">
                <input className="sil-input" placeholder="Matrícula" value={form.matricula} onChange={e => setForm({ ...form, matricula: e.target.value })} disabled={IS_DEMO || editing !== null} />
                <input className="sil-input" placeholder="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} disabled={IS_DEMO} />
              </div>
              <input className="sil-input" placeholder="Função" value={form.funcao} onChange={e => setForm({ ...form, funcao: e.target.value })} disabled={IS_DEMO} />
              <label className="flex items-center gap-2 text-[#c8d8e8] text-xs">
                <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} disabled={IS_DEMO} />
                Ativo
              </label>
              <button className="btn-primary w-full" type="submit" disabled={IS_DEMO}>{IS_DEMO ? "Bloqueado" : "Salvar"}</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
