"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import SectionHeader from "@/components/dashboard/SectionHeader";
import Badge from "@/components/Badge";
import ApiErr from "@/components/ApiErr";
import EmptyState from "@/components/dashboard/EmptyState";
import EquipmentRegistryModal, {
  type EquipmentClassificationOptions,
  type EquipmentFormValues,
  type EquipmentMasterRecord,
  type EquipmentRegistryRow,
} from "@/components/equipamentos/EquipmentRegistryModal";
import { api, getDynamicPresence, timeAgo, type Equipamento } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getEquipmentTypeLabel, normalizeEquipmentType } from "@/lib/equipment-type";

type FetchResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };
type AdminEquipmentPayload = EquipmentMasterRecord & Record<string, unknown>;

const ADMIN_ENDPOINT = "/api/admin/equipamentos";
const CLASSIFICATION_ENDPOINTS = {
  tipos: "/api/admin/equipamentos/tipos",
  modelos: "/api/admin/equipamentos/modelos",
  grupos: "/api/admin/equipamentos/grupos",
  perfis: "/api/admin/equipamentos/perfis",
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim();
}

function resolveId(item: AdminEquipmentPayload | Equipamento | null | undefined) {
  if (!item) return "";
  const raw = item as Record<string, unknown>;
  return normalizeText(raw.id || raw.trator_id || raw.equipamento_id || raw.codigo || "");
}

function parseJsonArray(data: unknown) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.equipamentos)) return obj.equipamentos;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.rows)) return obj.rows;
  }
  return [];
}

async function fetchAdminEquipment(): Promise<FetchResult<AdminEquipmentPayload[]>> {
  try {
    const res = await fetch(ADMIN_ENDPOINT, { cache: "no-store", signal: AbortSignal.timeout(7000) });
    const text = await res.text();
    const parsed = text.trim() ? JSON.parse(text) : [];
    const data = parseJsonArray(parsed) as AdminEquipmentPayload[];
    if (!res.ok) {
      const message = normalizeText((parsed as Record<string, unknown>)?.message || (parsed as Record<string, unknown>)?.error) || `HTTP ${res.status} em ${ADMIN_ENDPOINT}`;
      return { ok: false, error: message, status: res.status };
    }
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message || "Falha ao carregar cadastro mestre.", status: 0 };
  }
}

async function fetchClassificationOptions(): Promise<EquipmentClassificationOptions> {
  const read = async (endpoint: string) => {
    const res = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(7000) });
    const text = await res.text();
    const parsed = text.trim() ? JSON.parse(text) : [];
    return res.ok && Array.isArray(parsed) ? parsed : [];
  };
  const [tipos, modelos, grupos, perfis] = await Promise.all([
    read(CLASSIFICATION_ENDPOINTS.tipos),
    read(CLASSIFICATION_ENDPOINTS.modelos),
    read(CLASSIFICATION_ENDPOINTS.grupos),
    read(CLASSIFICATION_ENDPOINTS.perfis),
  ]);
  const names = (items: Record<string, unknown>[]) => items.map((item) => normalizeText(item.nome || item.codigo)).filter(Boolean);
  return { tipos: names(tipos), modelos: names(modelos), grupos: names(grupos), perfis: names(perfis) };
}

function normalizeMasterRecord(item: AdminEquipmentPayload): EquipmentMasterRecord & { id: string } {
  const id = resolveId(item);
  return {
    id,
    trator_id: normalizeText(item.trator_id || item.id || item.equipamento_id || id),
    equipamento_id: normalizeText(item.equipamento_id),
    nome: normalizeText(item.nome || item.name || item.apelido) || null,
    tipo_equipamento: normalizeText(item.tipo_equipamento || item.tipo || item.categoria || item.category) || null,
    modelo: normalizeText(item.modelo || item.model || item.modelo_equipamento) || null,
    grupo: normalizeText(item.grupo || item.group || item.grupo_equipamento) || null,
    perfil: normalizeText(item.perfil || item.profile || item.perfil_operacional) || null,
    status: normalizeText(item.status || item.estado || item.state) || null,
    updated_at: normalizeText(item.updated_at || item.updatedAt || item.criado_em || item.created_at) || null,
    created_at: normalizeText(item.created_at || item.createdAt || item.criado_em) || null,
    empresa_id: normalizeText(item.empresa_id) || null,
    usina_id: normalizeText(item.usina_id) || null,
    unidade_id: normalizeText(item.unidade_id) || null,
    frota: normalizeText(item.frota),
    observacao: normalizeText(item.observacao || item.notes || item.descricao) || null,
  };
}

function statusTone(status: string | null): "online" | "offline" | "instavel" | "info" {
  const v = (status || "").toUpperCase();
  if (!v) return "info";
  if (v.includes("SEM_CADASTRO")) return "instavel";
  if (v.includes("ATIV") || v.includes("OK") || v.includes("ACTIVE")) return "online";
  if (v.includes("INAT") || v.includes("OFF") || v.includes("DESAT")) return "offline";
  if (v.includes("MANUT") || v.includes("BLOQ") || v.includes("PEND") || v.includes("ALERTA")) return "instavel";
  return "info";
}

function telemetryTone(row: EquipmentRegistryRow) {
  if (row.hasTelemetry) return row.telemetryTone;
  return row.isRegistered ? "info" : "pendente";
}

function mergeEquipments(masterList: EquipmentMasterRecord[], liveList: Equipamento[]): EquipmentRegistryRow[] {
  const masterMap = new Map<string, EquipmentMasterRecord>();
  const liveMap = new Map<string, Equipamento>();

  for (const raw of masterList) {
    const id = resolveId(raw);
    if (!id) continue;
    masterMap.set(id, raw);
  }

  for (const live of liveList) {
    const id = resolveId(live);
    if (!id) continue;
    liveMap.set(id, live);
  }

  const ids = new Set<string>([...masterMap.keys(), ...liveMap.keys()]);
  return [...ids].sort((a, b) => a.localeCompare(b)).map((id) => {
    const master = masterMap.get(id) || null;
    const live = liveMap.get(id) || null;
    const type = normalizeEquipmentType({
      id,
      trator_id: id,
      nome: master?.nome || live?.nome || "",
      modelo: master?.modelo || live?.modelo || "",
      descricao: master?.observacao || live?.descricao || "",
      tipo_equipamento: master?.tipo_equipamento || live?.tipo_equipamento || "",
    });
    const displayName = master?.nome || live?.nome || id;
    const lastSeen = live?.last_seen || null;
    const hasTelemetry = Boolean(live);
    const telemetryLabel = !live && master ? "Sem telemetria" : live && !master ? "Somente telemetria" : "Com telemetria";
    const telemetry = live ? getDynamicPresence(live.last_seen) : null;
    const telemetryTone = telemetry === "ONLINE" ? "online" : telemetry === "INSTAVEL" ? "instavel" : telemetry === "OFFLINE" ? "offline" : "info";

    return {
      id,
      trator_id: id,
      master,
      live,
      displayName,
      frota: master?.frota || live?.frota || null,
      type,
      typeLabel: getEquipmentTypeLabel(type),
      statusLabel: master?.status || (master ? "Sem status" : "Nao cadastrado"),
      statusKey: normalizeText(master?.status || "").toUpperCase() || (master ? "SEM_STATUS" : "SEM_CADASTRO"),
      model: master?.modelo || live?.modelo || null,
      group: master?.grupo || null,
      profile: master?.perfil || null,
      isRegistered: Boolean(master),
      hasTelemetry,
      telemetryLabel,
      telemetryTone,
      presenceLabel: live ? getDynamicPresence(live.last_seen) : "OFFLINE",
      lastSeen,
      battery: live?.bateria ?? null,
      latitude: live?.latitude ?? null,
      longitude: live?.longitude ?? null,
    };
  });
}

function filterBySearch(row: EquipmentRegistryRow, search: string) {
  if (!search) return true;
  const text = [
    row.id,
    row.frota || "",
    row.displayName,
    row.typeLabel,
    row.statusLabel,
    row.model || "",
    row.group || "",
    row.profile || "",
    row.telemetryLabel,
    row.presenceLabel,
    row.lastSeen ? timeAgo(row.lastSeen) : "",
  ].join(" ").toLowerCase();
  return text.includes(search.toLowerCase());
}

export default function EquipamentosPage() {
  const { session } = useAuth();
  const canWrite = session?.role === "ADMIN_GLOBAL" || session?.role === "ADMIN_EMPRESA";

  const [masterRaw, setMasterRaw] = useState<EquipmentMasterRecord[]>([]);
  const [liveRaw, setLiveRaw] = useState<Equipamento[]>([]);
  const [classificationOptions, setClassificationOptions] = useState<EquipmentClassificationOptions>({ tipos: [], modelos: [], grupos: [], perfis: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [telemetryFilter, setTelemetryFilter] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [masterAvailable, setMasterAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "details" | null>(null);
  const [activeRow, setActiveRow] = useState<EquipmentRegistryRow | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const ref = useRef<(() => Promise<void>) | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [masterRes, liveRes, classificationRes] = await Promise.all([fetchAdminEquipment(), api.equipamentos(), fetchClassificationOptions()]);

    if (masterRes.ok) {
      setMasterRaw(masterRes.data.map(normalizeMasterRecord));
      setMasterAvailable(true);
      setBanner(null);
    } else {
      setMasterRaw([]);
      setMasterAvailable(false);
      setBanner(canWrite ? `Cadastro mestre indisponivel: ${masterRes.error}` : null);
    }

    setLiveRaw(liveRes.ok ? liveRes.data : []);
    setClassificationOptions(classificationRes);
    setLoading(false);
  }, [canWrite]);

  ref.current = () => load(true);

  useEffect(() => {
    load();
    const id = setInterval(() => ref.current?.(), 12000);
    return () => clearInterval(id);
  }, [load]);

  const rows = useMemo(() => mergeEquipments(masterRaw, liveRaw), [masterRaw, liveRaw]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      if (row.isRegistered && row.statusLabel) set.add(row.statusLabel);
      if (!row.isRegistered && row.statusKey === "SEM_CADASTRO") set.add("Nao cadastrado");
    });
    return ["", ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => set.add(row.typeLabel));
    return ["", ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (!filterBySearch(row, search)) return false;
      if (statusFilter) {
        if (statusFilter === "Nao cadastrado" && row.statusKey !== "SEM_CADASTRO") return false;
        if (statusFilter !== "Nao cadastrado" && row.statusLabel !== statusFilter) return false;
      }
      if (typeFilter && row.typeLabel !== typeFilter) return false;
      if (telemetryFilter === "COM" && !row.hasTelemetry) return false;
      if (telemetryFilter === "SEM" && (row.hasTelemetry || !row.isRegistered)) return false;
      if (telemetryFilter === "SO" && (row.isRegistered || !row.hasTelemetry)) return false;
      return true;
    });
  }, [rows, search, statusFilter, typeFilter, telemetryFilter]);

  const total = rows.length;
  const registered = rows.filter((row) => row.isRegistered).length;
  const withTelemetry = rows.filter((row) => row.hasTelemetry).length;
  const withoutTelemetry = rows.filter((row) => row.isRegistered && !row.hasTelemetry).length;

  const openDetails = (row: EquipmentRegistryRow) => {
    setActiveRow(row);
    setModalError(null);
    setModalMode("details");
  };

  const openCreate = (row?: EquipmentRegistryRow | null) => {
    if (!canWrite || !masterAvailable) return;
    setActiveRow(row || null);
    setModalError(null);
    setModalMode(row ? (row.isRegistered ? "edit" : "create") : "create");
  };

  const submitForm = async (values: EquipmentFormValues) => {
    if (!canWrite) {
      setModalError("Seu perfil e somente leitura.");
      return;
    }
    if (!masterAvailable) {
      setModalError("Cadastro mestre indisponivel. Tente novamente quando a API voltar.");
      return;
    }

    const id = values.trator_id.trim();
    if (!id) {
      setModalError("Identificador obrigatorio.");
      return;
    }

    setSaving(true);
    setModalError(null);
    try {
      const payload = {
        id: values.trator_id.trim(),
        trator_id: values.trator_id.trim(),
        frota: values.frota.trim() || null,
        nome: values.nome.trim() || null,
        tipo_equipamento: values.tipo_equipamento.trim() || null,
        modelo: values.modelo.trim() || null,
        grupo: values.grupo.trim() || null,
        perfil: values.perfil.trim() || null,
        status: values.status.trim() || null,
      };
      const isEdit = modalMode === "edit";
      const url = isEdit ? `${ADMIN_ENDPOINT}/${encodeURIComponent(id)}` : ADMIN_ENDPOINT;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });
      const text = await res.text();
      let parsed: unknown = null;
      if (text.trim()) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
      }
      if (!res.ok) {
        const message = normalizeText((parsed as Record<string, unknown> | null)?.message || (parsed as Record<string, unknown> | null)?.error) || `HTTP ${res.status}`;
        setModalError(message);
        return;
      }
      setModalMode(null);
      setActiveRow(null);
      await load(true);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Falha ao salvar equipamento.");
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setTypeFilter("");
    setTelemetryFilter("");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Equipamentos" sub="Cadastro mestre + monitoramento live em tempo real" />
      <main className="space-y-5 p-6">
        {banner && <ApiErr label={ADMIN_ENDPOINT} msg={banner} />}
        {!canWrite && (
          <div className="rounded-[18px] border border-[#1f334d] bg-[#101b2d] px-6 py-4">
            <p className="text-[#ffab00] text-sm font-semibold">Leitura somente</p>
            <p className="mt-1 text-xs text-[#4a6a8a]">Seu perfil pode navegar e consultar, mas nao pode criar ou editar cadastro mestre.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="Total" value={total} info="itens consolidados" color="blue" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h4m0 0l3-4h-5v4M13 8h7v2M13 12h5" /></svg>} />
          <StatCard label="Cadastrados" value={registered} info="master registry" color="green" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>} />
          <StatCard label="Com telemetria" value={withTelemetry} info="feed ativo ou historico" color="yellow" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a9.5 9.5 0 0113.436 0M4.222 9.222a13.5 13.5 0 0115.556 0" /></svg>} />
          <StatCard label="Sem telemetria" value={withoutTelemetry} info="cadastro visivel sem feed" color="red" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>} />
        </div>

        <SectionHeader
          title="Registro mestre"
          sub="Busca, filtros e acao direta sem quebrar o monitoramento"
          action={canWrite ? (
            <button className="btn-primary" onClick={() => openCreate(null)} disabled={!masterAvailable}>
              + Novo Equipamento
            </button>
          ) : (
            <Badge label="Leitura somente" variant="info" dot={false} />
          )}
        />

        <div className="grid gap-3 xl:grid-cols-5">
          <input className="sil-input xl:col-span-2" placeholder="Buscar por id, nome, modelo, grupo ou status..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="sil-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos os status</option>
            {statusOptions.filter(Boolean).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="sil-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Todos os tipos</option>
            {typeOptions.filter(Boolean).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="sil-input" value={telemetryFilter} onChange={(e) => setTelemetryFilter(e.target.value)}>
            <option value="">Telemetria: todos</option>
            <option value="COM">Com telemetria</option>
            <option value="SEM">Sem telemetria</option>
            <option value="SO">Somente telemetria</option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4a6a8a]">{filtered.length} resultado(s) visivel(is)</p>
          <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={clearFilters}>
            Limpar filtros
          </button>
        </div>

        {loading ? (
          <div className="card overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse border-b border-[#1e2d3d] px-5 py-5">
                <div className="h-4 w-1/2 rounded bg-[#1e2d3d]" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? "Nenhum equipamento disponivel" : "Nenhum equipamento localizado"}
            sub={rows.length === 0 ? "Aguardando telemetria ou retorno do cadastro mestre." : "Ajuste a busca ou limpe os filtros."}
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-sm">
                <thead>
                  <tr className="bg-[#111820] text-left text-xs uppercase tracking-wider text-[#4a6a8a] border-b border-[#1e2d3d]">
                    <th className="px-4 py-3">Código/Frota</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Modelo</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Grupo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d3d]/50 bg-[#161f2a]">
                  {filtered.map((row) => (
                    <tr key={row.id} className="align-top hover:bg-[#1e2d3d]/30">
                      <td className="px-4 py-4">
                        <div className="font-bold text-[#00d4ff] font-mono">{row.frota || row.id}</div>
                        <div className="mt-1 text-[10px] text-[#4a6a8a] uppercase tracking-tighter">ID: {row.id}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-[#dce8f5]">{row.displayName || "--"}</div>
                      </td>
                      <td className="px-4 py-4 text-[#c8d8e8]">
                        {row.model || "--"}
                      </td>
                      <td className="px-4 py-4">
                        <Badge label={row.typeLabel} variant="info" dot={false} />
                      </td>
                      <td className="px-4 py-4 text-[#c8d8e8]">
                        {row.group || "--"}
                      </td>
                      <td className="px-4 py-4">
                        <Badge label={row.statusLabel} variant={statusTone(row.statusKey)} dot={false} />
                        <div className="mt-2 text-[10px] text-[#4a6a8a] uppercase font-bold">
                          {row.hasTelemetry ? `Live: ${row.presenceLabel}` : "Sem feed"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-wrap gap-2 justify-end">
                          <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={() => openDetails(row)}>
                            Detalhes
                          </button>
                          {canWrite && (
                            <button
                              type="button"
                              className="btn-ghost !px-3 !py-2 text-xs"
                              onClick={() => openCreate(row)}
                              disabled={!masterAvailable}
                              title={!masterAvailable ? "Cadastro mestre indisponivel" : undefined}
                            >
                              Editar
                            </button>
                          )}
                          <Link href={`/equipamentos/${row.id}/rastro`} className="btn-primary !px-3 !py-2 text-xs inline-flex items-center">
                            Rastro
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <EquipmentRegistryModal
        open={modalMode !== null}
        mode={modalMode || "details"}
        row={modalMode ? (activeRow || null) : null}
        canWrite={canWrite}
        masterAvailable={masterAvailable}
        classificationOptions={classificationOptions}
        saving={saving}
        error={modalError}
        onClose={() => {
          setModalMode(null);
          setActiveRow(null);
          setModalError(null);
        }}
        onRequestEdit={() => {
          if (!canWrite || !masterAvailable || !activeRow) return;
          setModalError(null);
          setModalMode(activeRow.isRegistered ? "edit" : "create");
        }}
        onSubmit={submitForm}
      />
    </div>
  );
}
