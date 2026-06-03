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
import type { Parada, TipoParada } from "@/lib/operation-registry-store";

const emptyForm: Partial<Parada> = {
  codigo: "",
  nome: "",
  descricao: "",
  grupo_parada: "GERAL",
  tipo: "OPERACIONAL",
  produtiva: false,
  bloqueia_operacao: true,
  exige_observacao: false,
  ativo: true,
};

const TIPOS_PARADA: TipoParada[] = ['OPERACIONAL', 'MANUTENCAO', 'CLIMA', 'LOGISTICA', 'SEGURANCA', 'OUTROS'];

export default function CodigosParadaPage() {
  const { session } = useAuth();
  const canRead = !!session;
  const canWrite = isTenantAdmin(session?.role);

  const [items, setItems] = useState<Parada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterAtivo, setFilterAtivo] = useState<string>("TODOS");

  const [editing, setEditing] = useState<Partial<Parada> | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchJson<Parada[]>("/api/admin/codigos-parada");
    if (res.ok) {
      setItems(Array.isArray(res.data) ? res.data : []);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (canRead) load();
  }, [canRead, load]);

  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !search ||
        item.codigo.toLowerCase().includes(search.toLowerCase()) ||
        item.nome.toLowerCase().includes(search.toLowerCase()) ||
        item.tipo.toLowerCase().includes(search.toLowerCase());

      const matchesAtivo = filterAtivo === "TODOS" ||
        (filterAtivo === "ATIVO" && item.ativo) ||
        (filterAtivo === "INATIVO" && !item.ativo);

      return matchesSearch && matchesAtivo;
    });
  }, [items, search, filterAtivo]);

  const stats = useMemo(() => {
    const active = items.filter(i => i.ativo).length;
    return { total: items.length, active, inactive: items.length - active };
  }, [items]);

  const openEdit = (item: Parada | null) => {
    setEditing(item ? { ...item } : { ...emptyForm });
    setNotice(null);
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setNotice(null);

    const method = editing.id ? "PUT" : "POST";
    const url = editing.id ? `/api/admin/codigos-parada/${editing.id}` : "/api/admin/codigos-parada";

    const res = await fetchJson<any>(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });

    setSaving(false);
    if (res.ok) {
      setModalOpen(false);
      load();
    } else {
      setNotice(res.error);
    }
  };

  if (!canRead) return <EmptyState title="Acesso negado" sub="Faça login para continuar." />;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#080d14]">
      <Header title="Códigos de Parada" sub="Cadastro de motivos de parada operacional" />
      <main className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total" value={stats.total} color="blue" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <StatCard label="Ativos" value={stats.active} color="green" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>} />
          <StatCard label="Inativos" value={stats.inactive} color="red" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636" /></svg>} />
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 gap-2 w-full">
            <input
              className="sil-input flex-1"
              placeholder="Buscar por código, nome ou tipo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="sil-input w-40"
              value={filterAtivo}
              onChange={e => setFilterAtivo(e.target.value)}
            >
              <option value="TODOS">Todos Status</option>
              <option value="ATIVO">Ativos</option>
              <option value="INATIVO">Inativos</option>
            </select>
          </div>
          {canWrite && (
            <button className="btn-primary w-full md:w-auto" onClick={() => openEdit(null)}>
              + Novo Código
            </button>
          )}
        </div>

        {error && <ApiErr label="Erro ao carregar códigos de parada" msg={error} />}

        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-[#4a6a8a] animate-pulse">Carregando códigos...</div>
          ) : filtered.length === 0 ? (
            <EmptyState title="Nenhum código encontrado" sub="Tente ajustar sua busca ou filtros." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#111820] text-left text-xs uppercase tracking-wider text-[#4a6a8a] border-b border-[#1e2d3d]">
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Bloqueia</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d3d]/50">
                  {filtered.map(item => (
                    <tr key={item.id} className="hover:bg-[#1e2d3d]/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-[#00d4ff] font-bold">{item.codigo}</td>
                      <td className="px-4 py-3 text-[#c8d8e8]">{item.nome}</td>
                      <td className="px-4 py-3 text-[#4a6a8a]">{item.tipo}</td>
                      <td className="px-4 py-3">
                        <Badge label={item.bloqueia_operacao ? "SIM" : "NÃO"} variant={item.bloqueia_operacao ? "offline" : "online"} dot={false} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={item.ativo ? "ATIVO" : "INATIVO"} variant={item.ativo ? "online" : "offline"} dot={false} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="btn-ghost text-xs" onClick={() => openEdit(item)}>Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {modalOpen && editing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <form onSubmit={save} className="card-p w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-[#1f334d] pb-4">
                <h2 className="text-xl font-black text-white">{editing.id ? "Editar Código" : "Novo Código"}</h2>
                <button type="button" className="text-[#4a6a8a] hover:text-white" onClick={() => setModalOpen(false)}>✕</button>
              </div>

              {notice && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">{notice}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-[#4a6a8a]">Código</label>
                  <input
                    className="sil-input w-full"
                    required
                    value={editing.codigo}
                    onChange={e => setEditing({...editing, codigo: e.target.value.toUpperCase()})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-[#4a6a8a]">Nome</label>
                  <input
                    className="sil-input w-full"
                    required
                    value={editing.nome}
                    onChange={e => setEditing({...editing, nome: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[#4a6a8a]">Descrição</label>
                <textarea
                  className="sil-input w-full min-h-[80px]"
                  value={editing.descricao}
                  onChange={e => setEditing({...editing, descricao: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-[#4a6a8a]">Tipo de Parada</label>
                  <select
                    className="sil-input w-full"
                    value={editing.tipo}
                    onChange={e => setEditing({...editing, tipo: e.target.value as TipoParada})}
                  >
                    {TIPOS_PARADA.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-[#4a6a8a]">Grupo Parada</label>
                  <input
                    className="sil-input w-full"
                    value={editing.grupo_parada}
                    onChange={e => setEditing({...editing, grupo_parada: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2 border border-[#1f334d] bg-[#101b2d] p-4 rounded-2xl">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-[#1f334d] bg-[#0d1420] text-[#00d4ff] focus:ring-0"
                    checked={editing.produtiva}
                    onChange={e => setEditing({...editing, produtiva: e.target.checked})}
                  />
                  <span className="text-xs text-[#c8d8e8] group-hover:text-white">Produtiva</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-[#1f334d] bg-[#0d1420] text-[#00d4ff] focus:ring-0"
                    checked={editing.bloqueia_operacao}
                    onChange={e => setEditing({...editing, bloqueia_operacao: e.target.checked})}
                  />
                  <span className="text-xs text-[#c8d8e8] group-hover:text-white">Bloqueia Op.</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-[#1f334d] bg-[#0d1420] text-[#00d4ff] focus:ring-0"
                    checked={editing.exige_observacao}
                    onChange={e => setEditing({...editing, exige_observacao: e.target.checked})}
                  />
                  <span className="text-xs text-[#c8d8e8] group-hover:text-white">Exige Obs.</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-[#1f334d] bg-[#0d1420] text-[#00d4ff] focus:ring-0"
                    checked={editing.ativo}
                    onChange={e => setEditing({...editing, ativo: e.target.checked})}
                  />
                  <span className="text-xs text-[#c8d8e8] group-hover:text-white font-bold">Ativo</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#1f334d]">
                <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary min-w-[100px]" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
