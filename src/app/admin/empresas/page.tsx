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

type Empresa = {
  empresa_id: string;
  nome_empresa: string;
  status: string;
  created_at: string;
  updated_at?: string;
};

const emptyForm = { empresa_id: "", nome_empresa: "", status: "ATIVO" };

function normalizeStatus(status: string) {
  return (status || "").trim().toUpperCase() || "ATIVO";
}

export default function AdminEmpresasPage() {
  const { session } = useAuth();
  const canRead = isTenantAdmin(session?.role);
  const canWrite = session?.role === "ADMIN_GLOBAL";
  const [items, setItems] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchJson<Empresa[]>("/api/admin/empresas");
    if (res.ok) {
      setItems(Array.isArray(res.data) ? res.data : []);
    } else {
      setItems([]);
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (canRead) load();
  }, [canRead, load]);

  const stats = useMemo(() => {
    const active = items.filter((item) => normalizeStatus(item.status) === "ATIVO").length;
    const inactive = items.length - active;
    return { total: items.length, active, inactive };
  }, [items]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!canWrite) {
      setNotice("Somente ADMIN_GLOBAL pode criar ou editar empresas.");
      return;
    }
    if (!form.empresa_id.trim() || !form.nome_empresa.trim()) {
      setNotice("Preencha empresa_id e nome_empresa.");
      return;
    }
    setSaving(true);
    const res = await fetchJson<{ ok: boolean; empresa?: Empresa }>("/api/admin/empresas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        empresa_id: form.empresa_id.trim(),
        nome_empresa: form.nome_empresa.trim(),
        status: normalizeStatus(form.status),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setNotice(res.error);
      return;
    }
    setForm(emptyForm);
    setNotice("Empresa salva com sucesso.");
    await load();
  }

  if (!canRead) {
    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Administração" sub="Cadastro mestre de tenant" />
        <main className="p-6">
          <EmptyState title="Acesso restrito" sub="Esta área é visível apenas para ADMIN_GLOBAL e ADMIN_EMPRESA." />
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Administração • Empresas" sub="Cadastro mestre de empresas para tenant multiempresa" />
      <main className="p-6 space-y-6">
        {error && <ApiErr label="/api/admin/empresas" msg={error} />}
        {notice && <div className="card-p border border-[#00d4ff]/20 bg-[#00d4ff]/5 text-[#c8d8e8] text-sm">{notice}</div>}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} info="empresas cadastradas" color="blue" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 21V7l7-3v17" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 21V4l7 3v14" /></svg>} />
          <StatCard label="Ativas" value={stats.active} info="status ATIVO" color="green" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>} />
          <StatCard label="Inativas" value={stats.inactive} info="status diferente de ATIVO" color="red" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636" /></svg>} />
          <StatCard label="Perfil" value={session?.role || "--"} info="acesso atual" color="yellow" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <SectionHeader title="Empresas" sub="Lista, criação e status do cadastro mestre" />
          <button onClick={load} className="btn-ghost">Atualizar</button>
        </div>

        <div className="grid xl:grid-cols-[1fr_380px] gap-4">
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-[#111820] animate-pulse" />)}
              </div>
            ) : items.length === 0 ? (
              <EmptyState title="Nenhuma empresa cadastrada" sub="Use o formulário ao lado para criar a primeira empresa." />
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="bg-[#111820] border-b border-[#1e2d3d] text-[#4a6a8a] text-xs uppercase tracking-wider text-left"><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Criado em</th></tr></thead>
                <tbody className="divide-y divide-[#1e2d3d]/50">
                  {items.map((item) => (
                    <tr key={item.empresa_id} className="hover:bg-[#1e2d3d]/30">
                      <td className="px-4 py-3 font-mono text-[#00d4ff] font-black">{item.empresa_id}</td>
                      <td className="px-4 py-3 text-[#c8d8e8]">{item.nome_empresa}</td>
                      <td className="px-4 py-3"><Badge label={normalizeStatus(item.status)} variant={normalizeStatus(item.status) === "ATIVO" ? "online" : "offline"} dot={false} /></td>
                      <td className="px-4 py-3 text-[#4a6a8a] text-xs font-mono">{new Date(item.created_at).toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <form onSubmit={submit} className="card-p space-y-4 h-fit">
            <div>
              <h3 className="text-white font-black">Nova empresa</h3>
              <p className="text-[#4a6a8a] text-xs mt-1">Cadastro técnico para tenant mestre.</p>
            </div>
            {!canWrite && <div className="text-[#ffab00] text-xs border border-[#ffab00]/20 bg-[#ffab00]/5 rounded-xl p-3">Somente ADMIN_GLOBAL pode criar empresas.</div>}
            <input className="sil-input" placeholder="empresa_id" value={form.empresa_id} onChange={(e) => setForm((v) => ({ ...v, empresa_id: e.target.value }))} />
            <input className="sil-input" placeholder="nome_empresa" value={form.nome_empresa} onChange={(e) => setForm((v) => ({ ...v, nome_empresa: e.target.value }))} />
            <select className="sil-input" value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}>
              <option value="ATIVO">ATIVO</option>
              <option value="INATIVO">INATIVO</option>
            </select>
            <button className="btn-primary w-full" type="submit" disabled={!canWrite || saving}>{saving ? "Salvando..." : "Salvar empresa"}</button>
          </form>
        </div>
      </main>
    </div>
  );
}
