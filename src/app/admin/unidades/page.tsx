"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/dashboard/SectionHeader";
import StatCard from "@/components/StatCard";
import Badge from "@/components/Badge";
import ApiErr from "@/components/ApiErr";
import EmptyState from "@/components/dashboard/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { fetchJson, isTenantAdmin } from "@/lib/admin-tenant-client";

type Usina = { usina_id: string; empresa_id: string; nome_usina: string; status: string };
type Unidade = { unidade_id: string; usina_id: string; nome_unidade: string; status: string; created_at: string };

const emptyForm = { unidade_id: "", usina_id: "", nome_unidade: "", status: "ATIVO" };
const normalizeStatus = (status: string) => (status || "").trim().toUpperCase() || "ATIVO";

export default function AdminUnidadesPage() {
  const { session } = useAuth();
  const canRead = isTenantAdmin(session?.role);
  const canWrite = session?.role === "ADMIN_GLOBAL";
  const [items, setItems] = useState<Unidade[]>([]);
  const [usinas, setUsinas] = useState<Usina[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [unidadesRes, usinasRes] = await Promise.all([
      fetchJson<Unidade[]>("/api/admin/unidades"),
      fetchJson<Usina[]>("/api/admin/usinas"),
    ]);
    if (unidadesRes.ok) setItems(Array.isArray(unidadesRes.data) ? unidadesRes.data : []);
    else setItems([]);
    if (usinasRes.ok) setUsinas(Array.isArray(usinasRes.data) ? usinasRes.data : []);
    else setUsinas([]);
    setError(!unidadesRes.ok ? unidadesRes.error : !usinasRes.ok ? usinasRes.error : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (canRead) load();
  }, [canRead, load]);

  const stats = useMemo(() => {
    const active = items.filter((item) => normalizeStatus(item.status) === "ATIVO").length;
    return { total: items.length, active, inactive: items.length - active };
  }, [items]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!canWrite) {
      setNotice("Somente ADMIN_GLOBAL pode criar ou editar unidades.");
      return;
    }
    if (!form.unidade_id.trim() || !form.usina_id.trim() || !form.nome_unidade.trim()) {
      setNotice("Preencha unidade_id, usina_id e nome_unidade.");
      return;
    }
    setSaving(true);
    const res = await fetchJson<{ ok: boolean; unidade?: Unidade }>("/api/admin/unidades", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        unidade_id: form.unidade_id.trim(),
        usina_id: form.usina_id.trim(),
        nome_unidade: form.nome_unidade.trim(),
        status: normalizeStatus(form.status),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setNotice(res.error);
      return;
    }
    setForm(emptyForm);
    setNotice("Unidade salva com sucesso.");
    await load();
  }

  if (!canRead) {
    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Administração" sub="Cadastro mestre de tenant" />
        <main className="p-6"><EmptyState title="Acesso restrito" sub="Esta área é visível apenas para ADMIN_GLOBAL e ADMIN_EMPRESA." /></main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Administração • Unidades" sub="Cadastro mestre de unidades por usina" />
      <main className="p-6 space-y-6">
        {error && <ApiErr label="/api/admin/unidades" msg={error} />}
        {notice && <div className="card-p border border-[#00d4ff]/20 bg-[#00d4ff]/5 text-[#c8d8e8] text-sm">{notice}</div>}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} info="unidades cadastradas" color="blue" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 21V9l6 3V9l6 3V7l4 2v12H4z" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 21h16" /></svg>} />
          <StatCard label="Ativas" value={stats.active} info="status ATIVO" color="green" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>} />
          <StatCard label="Inativas" value={stats.inactive} info="status diferente de ATIVO" color="red" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636" /></svg>} />
          <StatCard label="Usinas" value={usinas.length} info="carregadas no select" color="yellow" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 21V9l6 3V9l6 3V7l4 2v12H4z" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 21h16" /></svg>} />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <SectionHeader title="Unidades" sub="Lista, criação e vínculo com usina" />
          <button onClick={load} className="btn-ghost">Atualizar</button>
        </div>

        <div className="grid xl:grid-cols-[1fr_380px] gap-4">
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-[#111820] animate-pulse" />)}</div>
            ) : items.length === 0 ? (
              <EmptyState title="Nenhuma unidade cadastrada" sub="Crie a primeira unidade para operar com vínculo em usinas." />
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="bg-[#111820] border-b border-[#1e2d3d] text-[#4a6a8a] text-xs uppercase tracking-wider text-left"><th className="px-4 py-3">Unidade</th><th className="px-4 py-3">Usina</th><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Status</th></tr></thead>
                <tbody className="divide-y divide-[#1e2d3d]/50">
                  {items.map((item) => (
                    <tr key={item.unidade_id} className="hover:bg-[#1e2d3d]/30">
                      <td className="px-4 py-3 font-mono text-[#00d4ff] font-black">{item.unidade_id}</td>
                      <td className="px-4 py-3 text-[#c8d8e8] font-mono">{item.usina_id}</td>
                      <td className="px-4 py-3 text-[#c8d8e8]">{item.nome_unidade}</td>
                      <td className="px-4 py-3"><Badge label={normalizeStatus(item.status)} variant={normalizeStatus(item.status) === "ATIVO" ? "online" : "offline"} dot={false} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <form onSubmit={submit} className="card-p space-y-4 h-fit">
            <div>
              <h3 className="text-white font-black">Nova unidade</h3>
              <p className="text-[#4a6a8a] text-xs mt-1">Usina obrigatória para criar a unidade.</p>
            </div>
            {!canWrite && <div className="text-[#ffab00] text-xs border border-[#ffab00]/20 bg-[#ffab00]/5 rounded-xl p-3">Somente ADMIN_GLOBAL pode criar unidades.</div>}
            <input className="sil-input" placeholder="unidade_id" value={form.unidade_id} onChange={(e) => setForm((v) => ({ ...v, unidade_id: e.target.value }))} />
            <select className="sil-input" value={form.usina_id} onChange={(e) => setForm((v) => ({ ...v, usina_id: e.target.value }))}>
              <option value="">Selecione a usina</option>
              {usinas.map((usina) => <option key={usina.usina_id} value={usina.usina_id}>{usina.nome_usina} ({usina.usina_id})</option>)}
            </select>
            <input className="sil-input" placeholder="nome_unidade" value={form.nome_unidade} onChange={(e) => setForm((v) => ({ ...v, nome_unidade: e.target.value }))} />
            <select className="sil-input" value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}>
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
            <button className="btn-primary w-full" type="submit" disabled={!canWrite || saving}>{saving ? "Salvando..." : "Salvar unidade"}</button>
          </form>
        </div>
      </main>
    </div>
  );
}
