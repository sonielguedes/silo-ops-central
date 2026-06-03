"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/dashboard/SectionHeader";
import ApiErr from "@/components/ApiErr";
import EmptyState from "@/components/dashboard/EmptyState";
import Badge from "@/components/Badge";

type FieldType = "text" | "textarea" | "select" | "multiselect" | "checkbox";

type Field = { key: string; label: string; type: FieldType; options?: string[]; placeholder?: string };
type Column = { key: string; label: string };

type Config = {
  title: string;
  sub: string;
  endpoint: string;
  fields: Field[];
  columns: Column[];
  searchKeys: string[];
  statusKey?: string;
  statusValues?: string[];
  loadOptions?: () => Promise<Record<string, string[]>>;
};

type Props = { config: Config };

function txt(v: unknown) { return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v); }

export default function WorkforceManager({ config }: Props) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Record<string, string[]>>({});

  const { endpoint, loadOptions } = config;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, opt] = await Promise.all([
        fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(7000) }).then(async (res) => {
          const text = await res.text();
          const parsed = text.trim() ? JSON.parse(text) : [];
          if (!res.ok) throw new Error(txt((parsed as any)?.error || `HTTP ${res.status}`));
          return Array.isArray(parsed) ? parsed : [];
        }),
        loadOptions ? loadOptions().catch(() => ({})) : Promise.resolve({}),
      ]);
      setItems(itemsRes);
      setOptions(opt);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar cadastro.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, loadOptions]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (status && txt(item[config.statusKey || "status"]).toUpperCase() !== status) return false;
      if (!q) return true;
      return config.searchKeys.some((key) => txt(item[key]).toLowerCase().includes(q));
    });
  }, [items, search, status, config]);

  const statusOptions = config.statusValues || [];

  function startEdit(item: Record<string, unknown> | null) {
    setEditing(item);
    const next: Record<string, string | boolean> = {};
    for (const field of config.fields) {
      const raw = item?.[field.key];
      next[field.key] = field.type === "checkbox" ? Boolean(raw) : txt(raw);
    }
    setForm(next);
    setOpen(true);
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of config.fields) {
        const val = form[field.key];
        if (field.type === "checkbox") payload[field.key] = Boolean(val);
        else if (field.type === "multiselect") payload[field.key] = txt(val).split(/[\n,;]/).map((p) => p.trim()).filter(Boolean);
        else payload[field.key] = txt(val);
      }
      const id = txt(editing?.id);
      const res = await fetch(editing ? `${config.endpoint}/${encodeURIComponent(id)}` : config.endpoint, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const parsed = text.trim() ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(txt((parsed as any)?.error || `HTTP ${res.status}`));
      setOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar cadastro.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title={config.title} sub={config.sub} />
      <main className="space-y-5 p-6">
        {error && <ApiErr label={config.endpoint} msg={error} />}
        <SectionHeader title={config.title} sub={config.sub} action={<button className="btn-primary" onClick={() => startEdit(null)}>+ Novo</button>} />
        <div className="grid gap-3 md:grid-cols-3">
          <input className="sil-input md:col-span-2" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="sil-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? <div className="card-p h-64 animate-pulse" /> : filtered.length === 0 ? <EmptyState title="Nenhum registro" sub="Crie o primeiro item." /> : (
          <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead><tr className="bg-[#111820] text-left text-xs uppercase tracking-wider text-[#4a6a8a] border-b border-[#1e2d3d]">{config.columns.map((c) => <th key={c.key} className="px-4 py-3">{c.label}</th>)}<th className="px-4 py-3">Ações</th></tr></thead><tbody>{filtered.map((item) => <tr key={txt(item.id)} className="border-b border-[#1e2d3d] last:border-0">{config.columns.map((c) => <td key={c.key} className="px-4 py-4 text-[#dce8f5]">{txt(item[c.key]) || "--"}</td>)}<td className="px-4 py-4"><button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => startEdit(item)}>Editar</button></td></tr>)}</tbody></table></div></div>
        )}

        {open && (
          <div className="fixed inset-0 z-[90] bg-black/70 p-4">
            <div className="mx-auto max-w-3xl rounded-[28px] border border-[#1f334d] bg-[#0a1018] p-6">
              <div className="flex justify-between border-b border-[#1f334d] pb-4"><h2 className="text-2xl font-black text-white">{editing ? "Editar" : "Novo"} {config.title}</h2><button className="btn-ghost" onClick={() => setOpen(false)}>Fechar</button></div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {config.fields.map((field) => (
                  <label key={field.key} className={field.type === "textarea" || field.type === "multiselect" ? "md:col-span-2" : ""}>
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#4a6a8a]">{field.label}</span>
                    {field.type === "textarea" ? <textarea className="sil-input min-h-[110px] w-full" value={txt(form[field.key])} onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))} /> :
                      field.type === "checkbox" ? <input type="checkbox" checked={Boolean(form[field.key])} onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.checked }))} /> :
                      field.type === "select" ? <select className="sil-input w-full" value={txt(form[field.key])} onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}>{(options[field.key] || field.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select> :
                      <input className="sil-input w-full" value={txt(form[field.key])} onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} />
                    }
                  </label>
                ))}
              </div>
              <div className="mt-5 flex justify-end gap-3 border-t border-[#1f334d] pt-4">
                <button className="btn-ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</button>
                <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
