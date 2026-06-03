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
import { ALL_ICONS, renderEquipmentIconSvg } from "@/lib/equipment-icons";
import type { VisualConfig } from "@/lib/equipment-visual-store";

const emptyForm: Partial<VisualConfig> = {
  tipo_equipamento: "",
  icone: "trator",
  cor_online: "#22c55e",
  cor_instavel: "#f59e0b",
  cor_offline: "#ef4444",
  rotaciona_icone: true,
  mostrar_label: true,
  ativo: true,
};

export default function EquipmentIconsPage() {
  const { session } = useAuth();
  const canRead = !!session;
  const canWrite = isTenantAdmin(session?.role);

  const [items, setItems] = useState<VisualConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterAtivo, setFilterAtivo] = useState<string>("TODOS");

  const [editing, setEditing] = useState<Partial<VisualConfig> | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchJson<VisualConfig[]>("/api/admin/equipamentos/visual");
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
        item.tipo_equipamento.toLowerCase().includes(search.toLowerCase());

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

  const openEdit = (item: VisualConfig | null) => {
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
    const url = editing.id ? `/api/admin/equipamentos/visual/${editing.id}` : "/api/admin/equipamentos/visual";

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
      <Header title="Identidade Visual de Frota" sub="Configuração de ícones e cores para o Mapa Operacional" />
      <main className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Categorias" value={stats.total} color="blue" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM4 21a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z" /></svg>} />
          <StatCard label="Ativas" value={stats.active} color="green" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <StatCard label="Inativas" value={stats.inactive} color="red" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 gap-2 w-full">
            <input
              className="sil-input flex-1"
              placeholder="Buscar por tipo de equipamento..."
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
              + Nova Configuração
            </button>
          )}
        </div>

        {error && <ApiErr label="Erro ao carregar visual" msg={error} />}

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="card-p h-60 animate-pulse bg-[#101b2d]/50" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhuma configuração encontrada" sub="Crie uma nova regra visual para sua frota." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(item => {
              const iconDef = ALL_ICONS.find(i => i.id === item.icone) || ALL_ICONS.find(i => i.id === "default");
              return (
                <div key={item.id} className="card-p flex flex-col group hover:border-[#00d4ff]/30 transition-all cursor-pointer" onClick={() => openEdit(item)}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <h4 className="text-white font-black text-sm tracking-widest uppercase">{item.tipo_equipamento}</h4>
                      <Badge label={item.ativo ? "ATIVO" : "INATIVO"} variant={item.ativo ? "online" : "offline"} dot={false} />
                    </div>
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center border border-[#1f334d] bg-[#0d1420] text-[#00d4ff]"
                      dangerouslySetInnerHTML={{ __html: renderEquipmentIconSvg(iconDef?.svgPath || "", 24) }}
                    />
                  </div>

                  <div className="mt-auto space-y-3">
                    <div className="flex gap-2 justify-center py-2 bg-[#0d1420]/50 rounded-lg">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.cor_online }} title="Online" />
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.cor_instavel }} title="Instável" />
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.cor_offline }} title="Offline" />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-[#4a6a8a] uppercase tracking-tighter">
                      <span>Label: {item.mostrar_label ? "SIM" : "NÃO"}</span>
                      <span>Rotaciona: {item.rotaciona_icone ? "SIM" : "NÃO"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {modalOpen && editing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <form onSubmit={save} className="card-p w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-[#1f334d] pb-4">
                <h2 className="text-xl font-black text-white">{editing.id ? "Editar Identidade" : "Nova Identidade"}</h2>
                <button type="button" className="text-[#4a6a8a] hover:text-white" onClick={() => setModalOpen(false)}>✕</button>
              </div>

              {notice && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">{notice}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-[#4a6a8a]">Tipo de Equipamento (Master)</label>
                  <input
                    className="sil-input w-full"
                    required
                    placeholder="Ex: TRATOR, COLHEDORA..."
                    value={editing.tipo_equipamento}
                    onChange={e => setEditing({...editing, tipo_equipamento: e.target.value.toUpperCase()})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-[#4a6a8a]">Ícone Representativo</label>
                  <select
                    className="sil-input w-full"
                    value={editing.icone}
                    onChange={e => setEditing({...editing, icone: e.target.value})}
                  >
                    {ALL_ICONS.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                    <option value="default">Círculo Padrão</option>
                  </select>
                </div>
              </div>

              <div className="border border-[#1f334d] bg-[#101b2d] p-4 rounded-2xl space-y-4">
                <h3 className="text-[10px] font-black uppercase text-[#4a6a8a] tracking-widest">Cores de Estado (Mapa)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-[#c8d8e8] block">Online</label>
                    <input type="color" className="w-full h-10 bg-transparent border-none cursor-pointer" value={editing.cor_online} onChange={e => setEditing({...editing, cor_online: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-[#c8d8e8] block">Instável</label>
                    <input type="color" className="w-full h-10 bg-transparent border-none cursor-pointer" value={editing.cor_instavel} onChange={e => setEditing({...editing, cor_instavel: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-[#c8d8e8] block">Offline</label>
                    <input type="color" className="w-full h-10 bg-transparent border-none cursor-pointer" value={editing.cor_offline} onChange={e => setEditing({...editing, cor_offline: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2 border border-[#1f334d] bg-[#101b2d] p-4 rounded-2xl">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-[#1f334d] bg-[#0d1420] text-[#00d4ff] focus:ring-0"
                    checked={editing.rotaciona_icone}
                    onChange={e => setEditing({...editing, rotaciona_icone: e.target.checked})}
                  />
                  <span className="text-xs text-[#c8d8e8] group-hover:text-white">Rotacionar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-[#1f334d] bg-[#0d1420] text-[#00d4ff] focus:ring-0"
                    checked={editing.mostrar_label}
                    onChange={e => setEditing({...editing, mostrar_label: e.target.checked})}
                  />
                  <span className="text-xs text-[#c8d8e8] group-hover:text-white">Mostrar Label</span>
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
