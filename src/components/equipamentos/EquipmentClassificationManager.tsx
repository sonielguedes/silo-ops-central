"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/dashboard/SectionHeader";
import Badge from "@/components/Badge";
import ApiErr from "@/components/ApiErr";
import EmptyState from "@/components/dashboard/EmptyState";

type FieldType = "text" | "textarea" | "color" | "checkbox" | "array";

export type ClassificationField = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
};

export type ClassificationColumn = {
  key: string;
  label: string;
  render?: (item: Record<string, unknown>) => string;
};

export type ClassificationConfig = {
  kind: string;
  title: string;
  subtitle: string;
  endpoint: string;
  fields: ClassificationField[];
  columns: ClassificationColumn[];
  seedHint: string;
};

type Props = {
  config: ClassificationConfig;
};

type FormState = Record<string, string | boolean>;

function text(value: unknown) {
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function bool(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function toArray(value: string) {
  return value.split(/[\n,;]/).map((part) => part.trim()).filter(Boolean);
}

function buildDisplay(item: Record<string, unknown>, column: ClassificationColumn) {
  if (column.render) return column.render(item);
  const raw = item[column.key];
  if (typeof raw === "boolean") return raw ? "Sim" : "Nao";
  if (Array.isArray(raw)) return raw.join(", ");
  return text(raw) || "--";
}

export default function EquipmentClassificationManager({ config }: Props) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<FormState>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(config.endpoint, { cache: "no-store", signal: AbortSignal.timeout(7000) });
    const raw = await res.text();
    const parsed = raw.trim() ? JSON.parse(raw) : [];
    if (!res.ok) {
      const message = text((parsed as Record<string, unknown>)?.error || (parsed as Record<string, unknown>)?.message) || `HTTP ${res.status}`;
      setError(message);
      setItems([]);
      setLoading(false);
      return;
    }
    setItems(Array.isArray(parsed) ? parsed : []);
    setError(null);
    setLoading(false);
  }, [config.endpoint]);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar cadastro."));
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter === "active" && !bool(item.ativo)) return false;
      if (statusFilter === "inactive" && bool(item.ativo)) return false;
      if (!q) return true;
      const haystack = [config.kind, ...config.fields.map((field) => text(item[field.key]))].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search, statusFilter, config.fields, config.kind]);

  const openCreate = () => {
    setEditing(null);
    setForm(Object.fromEntries(config.fields.map((field) => [field.key, field.type === "checkbox" ? true : ""])));
    setModalOpen(true);
  };

  const openEdit = (item: Record<string, unknown>) => {
    setEditing(item);
    const next: FormState = {};
    for (const field of config.fields) {
      const value = item[field.key];
      if (field.type === "checkbox") next[field.key] = bool(value);
      else if (field.type === "array") next[field.key] = Array.isArray(value) ? value.join(", ") : text(value);
      else next[field.key] = text(value);
    }
    setForm(next);
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of config.fields) {
        const value = form[field.key];
        if (field.type === "checkbox") payload[field.key] = Boolean(value);
        else if (field.type === "array") payload[field.key] = toArray(text(value));
        else payload[field.key] = text(value);
      }
      const method = editing ? "PUT" : "POST";
      const url = editing ? `${config.endpoint}/${encodeURIComponent(text(editing.id))}` : config.endpoint;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });
      const raw = await res.text();
      const parsed = raw.trim() ? JSON.parse(raw) : null;
      if (!res.ok) {
        const message = text((parsed as Record<string, unknown>)?.error || (parsed as Record<string, unknown>)?.message) || `HTTP ${res.status}`;
        setError(message);
        return;
      }
      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar cadastro.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header title={config.title} sub={config.subtitle} />
      <main className="space-y-5 p-6">
        {error && <ApiErr label={config.endpoint} msg={error} />}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-[18px] border border-[#1f334d] bg-[#0d1420] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4a6a8a]">Cadastro</p>
            <p className="mt-2 text-2xl font-black text-white">{config.title}</p>
          </div>
          <div className="rounded-[18px] border border-[#1f334d] bg-[#0d1420] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4a6a8a]">Persistencia</p>
            <p className="mt-2 text-sm text-[#dce8f5]">JSON server-side em /app/data.</p>
          </div>
          <div className="rounded-[18px] border border-[#1f334d] bg-[#0d1420] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4a6a8a]">Seed inicial</p>
            <p className="mt-2 text-sm text-[#dce8f5]">{config.seedHint}</p>
          </div>
        </div>

        <SectionHeader
          title={config.title}
          sub={config.subtitle}
          action={<button className="btn-primary" onClick={openCreate}>+ Novo</button>}
        />

        <div className="grid gap-3 md:grid-cols-3">
          <input className="sil-input md:col-span-2" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por codigo, nome ou descricao..." />
          <select className="sil-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>

        {loading ? (
          <div className="card overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse border-b border-[#1e2d3d] px-5 py-5"><div className="h-4 w-1/2 rounded bg-[#1e2d3d]" /></div>)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhum registro encontrado" sub="Crie o primeiro item ou ajuste a busca." />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="bg-[#111820] text-left text-xs uppercase tracking-wider text-[#4a6a8a] border-b border-[#1e2d3d]">
                    {config.columns.map((column) => <th key={column.key} className="px-4 py-3">{column.label}</th>)}
                    <th className="px-4 py-3">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={text(item.id)} className="border-b border-[#1e2d3d] last:border-0">
                      {config.columns.map((column) => <td key={column.key} className="px-4 py-4 text-[#dce8f5]">{buildDisplay(item, column)}</td>)}
                      <td className="px-4 py-4"><button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => openEdit(item)}>Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-[90] bg-black/70 p-4">
            <div className="mx-auto max-w-4xl rounded-[28px] border border-[#1f334d] bg-[#0a1018] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.65)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#1f334d] pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4a6a8a]">SILO OPS</p>
                  <h2 className="mt-1 text-2xl font-black text-white">{editing ? "Editar" : "Novo"} {config.title}</h2>
                </div>
                <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>Fechar</button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {config.fields.map((field) => (
                  <label key={field.key} className={field.type === "textarea" || field.type === "array" ? "md:col-span-2" : ""}>
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#4a6a8a]">{field.label}</span>
                    {field.type === "textarea" ? (
                      <textarea className="sil-input min-h-[120px] w-full" value={text(form[field.key])} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))} placeholder={field.placeholder} />
                    ) : field.type === "checkbox" ? (
                      <input type="checkbox" checked={Boolean(form[field.key])} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.checked }))} className="h-5 w-5 rounded border-[#1f334d] bg-[#0d1420]" />
                    ) : (
                      <input className="sil-input w-full" type={field.type === "color" ? "color" : "text"} value={text(form[field.key])} onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))} placeholder={field.placeholder} />
                    )}
                  </label>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#1f334d] pt-4">
                <p className="text-xs text-[#4a6a8a]">{editing ? "Atualizando cadastro existente." : "Novo cadastro com escopo tenant-aware."}</p>
                <div className="flex gap-3">
                  <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button>
                  <button type="button" className="btn-primary" onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
