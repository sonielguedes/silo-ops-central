"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Badge from "@/components/Badge";
import { fmtDate, getDynamicPresence, timeAgo, type Equipamento } from "@/lib/api";
import { getEquipmentTypeLabel, normalizeEquipmentType, type EquipmentType } from "@/lib/equipment-type";

export type EquipmentMasterRecord = {
  id?: string | null;
  trator_id?: string | null;
  equipamento_id?: string | null;
  nome?: string | null;
  tipo_equipamento?: string | null;
  modelo?: string | null;
  grupo?: string | null;
  perfil?: string | null;
  status?: string | null;
  frota?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  empresa_id?: string | null;
  usina_id?: string | null;
  unidade_id?: string | null;
  observacao?: string | null;
};

export type EquipmentRegistryRow = {
  id: string;
  trator_id: string;
  master: EquipmentMasterRecord | null;
  live: Equipamento | null;
  displayName: string;
  frota: string | null;
  type: EquipmentType;
  typeLabel: string;
  statusLabel: string;
  statusKey: string;
  model: string | null;
  group: string | null;
  profile: string | null;
  isRegistered: boolean;
  hasTelemetry: boolean;
  telemetryLabel: string;
  telemetryTone: "online" | "offline" | "instavel" | "info";
  presenceLabel: string;
  lastSeen: string | null;
  battery: number | null;
  latitude: number | null;
  longitude: number | null;
};

export type EquipmentFormValues = {
  trator_id: string;
  frota: string;
  nome: string;
  tipo_equipamento: string;
  modelo: string;
  grupo: string;
  perfil: string;
  status: string;
};

export type EquipmentClassificationOptions = {
  tipos: string[];
  modelos: string[];
  grupos: string[];
  perfis: string[];
};

type Props = {
  open: boolean;
  mode: "create" | "edit" | "details";
  row: EquipmentRegistryRow | null;
  canWrite: boolean;
  masterAvailable: boolean;
  classificationOptions?: EquipmentClassificationOptions;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onRequestEdit?: () => void;
  onSubmit?: (values: EquipmentFormValues) => void | Promise<void>;
};

function empty(value: string | null | undefined) {
  const text = (value || "").trim();
  return text || "--";
}

function toneFromStatus(status: string | null): "online" | "offline" | "instavel" | "info" {
  const v = (status || "").toUpperCase();
  if (!v) return "info";
  if (v.includes("ATIV") || v.includes("OK") || v.includes("ACTIVE")) return "online";
  if (v.includes("INAT") || v.includes("OFF") || v.includes("DESAT")) return "offline";
  if (v.includes("MANUT") || v.includes("BLOQ") || v.includes("PEND")) return "instavel";
  return "info";
}

function telemetryLabel(row: EquipmentRegistryRow | null) {
  if (!row) return "--";
  return row.telemetryLabel;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#1f334d] bg-[#0d1420] p-4">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-white">{title}</p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#1f334d]/60 py-2 last:border-b-0">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4a6a8a]">{label}</span>
      <span className="text-right text-sm font-mono text-[#dce8f5] break-words">{value}</span>
    </div>
  );
}

export default function EquipmentRegistryModal({
  open,
  mode,
  row,
  canWrite,
  masterAvailable,
  classificationOptions,
  saving = false,
  error = null,
  onClose,
  onRequestEdit,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<EquipmentFormValues>({
    trator_id: "",
    frota: "",
    nome: "",
    tipo_equipamento: "",
    modelo: "",
    grupo: "",
    perfil: "",
    status: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      trator_id: row?.master?.trator_id || row?.live?.trator_id || row?.id || "",
      frota: row?.master?.frota || row?.live?.frota || "",
      nome: row?.master?.nome || row?.live?.nome || row?.displayName || "",
      tipo_equipamento: row?.master?.tipo_equipamento || row?.live?.tipo_equipamento || row?.typeLabel || "",
      modelo: row?.master?.modelo || row?.live?.modelo || "",
      grupo: row?.master?.grupo || "",
      perfil: row?.master?.perfil || "",
      status: row?.master?.status || row?.statusLabel || "",
    });
  }, [open, row, mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const lockId = mode === "edit" || Boolean(row?.id && mode === "create" && row?.isRegistered === false);
  const title = mode === "details"
    ? "Detalhes do equipamento"
    : mode === "edit"
      ? "Editar equipamento"
      : "Novo equipamento";

  const submitLabel = mode === "edit" ? "Salvar alteracoes" : "Criar equipamento";
  const statusTone = useMemo(() => toneFromStatus(form.status), [form.status]);

  if (!open || !row && mode !== "create") return null;

  const currentType = normalizeEquipmentType({
    trator_id: form.trator_id,
    nome: form.nome,
    tipo_equipamento: form.tipo_equipamento,
    modelo: form.modelo,
    descricao: row?.master?.observacao || "",
  });

  return (
    <div className="fixed inset-0 z-[80] bg-black/75 p-4 flex items-center justify-center" onClick={onClose} role="presentation">
      <div
        className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-[28px] border border-[#1f334d] bg-[#0a1018]/96 shadow-[0_30px_90px_rgba(0,0,0,0.65)] backdrop-blur-xl"
        onClick={(ev) => ev.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#1f334d] px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#4a6a8a]">SILO OPS - Registro mestre</p>
            <h2 className="mt-1 text-2xl font-black text-white">{title}</h2>
            {row && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-black uppercase tracking-widest text-[#8fdfff]">{row.frota || row.trator_id}</span>
                <Badge label={row.isRegistered ? "Cadastrado" : "Nao cadastrado"} variant={row.isRegistered ? "online" : "pendente"} />
                <Badge label={telemetryLabel(row)} variant={row.hasTelemetry ? row.telemetryTone : "info"} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#1f334d] bg-[#0d1420] px-3 py-2 text-[#4a6a8a] transition-colors hover:text-white"
            aria-label="Fechar modal"
          >
            x
          </button>
        </div>

        <div className="max-h-[calc(92vh-150px)] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-2xl border border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ef4444]">Falha tecnica</p>
              <p className="mt-1 text-sm text-[#fca5a5]">{error}</p>
            </div>
          )}

          {mode === "details" ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <Section title="Cadastro">
                <DetailRow label="Frota" value={row?.frota || "--"} />
                <DetailRow label="ID Tecnico" value={row?.trator_id || "--"} />
                <DetailRow label="Descrição" value={empty(row?.master?.nome || row?.displayName)} />
                <DetailRow label="Tipo" value={row?.typeLabel || "--"} />
                <DetailRow label="Modelo" value={empty(row?.model)} />
                <DetailRow label="Grupo" value={empty(row?.group)} />
                <DetailRow label="Perfil" value={empty(row?.profile)} />
                <DetailRow label="Status" value={empty(row?.statusLabel)} />
                <DetailRow label="Ultima atualizacao" value={row?.master?.updated_at ? fmtDate(row.master.updated_at) : "--"} />
              </Section>

              <Section title="Telemetria">
                <DetailRow label="Feed" value={telemetryLabel(row)} />
                <DetailRow label="Presenca" value={row?.presenceLabel || "--"} />
                <DetailRow label="Ultimo sinal" value={row?.lastSeen ? timeAgo(row.lastSeen) : "--"} />
                <DetailRow label="Bateria" value={row?.battery === null || row?.battery === undefined ? "--" : `${row.battery}%`} />
                <DetailRow label="GPS" value={row?.latitude !== null && row?.longitude !== null ? `${row?.latitude?.toFixed(5)}, ${row?.longitude?.toFixed(5)}` : "--"} />
                <DetailRow label="Tipo derivado" value={getEquipmentTypeLabel(currentType)} />
              </Section>

              <Section title="Leitura operacional">
                <DetailRow label="Cadastro mestre" value={row?.isRegistered ? "Disponivel" : "Nao cadastrado"} />
                <DetailRow label="Telemetria" value={row?.hasTelemetry ? "Com telemetria" : "Sem telemetria"} />
                <DetailRow label="Fonte" value={row?.live ? "API /status" : "Sem feed live"} />
                <DetailRow label="Presenca dinamica" value={row?.live ? getDynamicPresence(row.live.last_seen) : "OFFLINE"} />
                <DetailRow label="Ultima sincronizacao" value={row?.live?.last_seen ? fmtDate(row.live.last_seen) : "--"} />
              </Section>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <Section title="Cadastro operacional">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Frota / Cod. Operacional" value={form.frota} onChange={(value) => setForm((prev) => ({ ...prev, frota: value }))} />
                  <Field label="ID Tecnico (Ex: T01)" value={form.trator_id} onChange={(value) => setForm((prev) => ({ ...prev, trator_id: value }))} disabled={lockId} />
                  <div className="sm:col-span-2">
                    <Field label="Descrição" value={form.nome} onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))} />
                  </div>
                  <Field label="Tipo" value={form.tipo_equipamento} options={classificationOptions?.tipos} onChange={(value) => setForm((prev) => ({ ...prev, tipo_equipamento: value }))} />
                  <Field label="Modelo" value={form.modelo} options={classificationOptions?.modelos} onChange={(value) => setForm((prev) => ({ ...prev, modelo: value }))} />
                  <Field label="Grupo" value={form.grupo} options={classificationOptions?.grupos} onChange={(value) => setForm((prev) => ({ ...prev, grupo: value }))} />
                  <Field label="Perfil" value={form.perfil} options={classificationOptions?.perfis} onChange={(value) => setForm((prev) => ({ ...prev, perfil: value }))} />
                  <div className="sm:col-span-2">
                    <Field label="Status" value={form.status} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} />
                  </div>
                </div>
              </Section>

              <Section title="Pre-visualizacao">
                <DetailRow label="Frota" value={form.frota || "--"} />
                <DetailRow label="ID Tecnico" value={form.trator_id || "--"} />
                <DetailRow label="Descrição" value={form.nome || "--"} />
                <DetailRow label="Tipo" value={empty(form.tipo_equipamento)} />
                <DetailRow label="Modelo" value={empty(form.modelo)} />
                <DetailRow label="Grupo" value={empty(form.grupo)} />
                <DetailRow label="Perfil" value={empty(form.perfil)} />
                <DetailRow label="Status" value={empty(form.status)} />
                <DetailRow label="Tom" value={statusTone.toUpperCase()} />
                <div className="rounded-2xl border border-[#1f334d] bg-[#101b2d] px-4 py-3 text-xs text-[#4a6a8a]">
                  {masterAvailable ? "Cadastro mestre disponivel para escrita." : "API de cadastro indisponivel. Mantendo apenas leitura do monitoramento."}
                </div>
              </Section>
            </div>
          )}
        </div>

        <div className="border-t border-[#1f334d] px-6 py-4">
          {mode === "details" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-[#4a6a8a]">
                {row?.isRegistered ? "Registro cadastral conectado ao monitoramento." : "Equipamento visivel no monitoramento, mas ainda sem cadastro mestre."}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={`/equipamentos/${row?.id}/rastro`} className="btn-ghost">
                  Ver rastro
                </Link>
                {canWrite && masterAvailable && onRequestEdit && (
                  <button type="button" className="btn-primary" onClick={onRequestEdit}>
                    {row?.isRegistered ? "Editar" : "Cadastrar"}
                  </button>
                )}
                <button type="button" className="btn-ghost" onClick={onClose}>
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-[#4a6a8a]">
                {canWrite ? "Alteracoes vao para /api/admin/equipamentos." : "Seu perfil e somente leitura."}
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onSubmit?.(form)}
                  disabled={!canWrite || !masterAvailable || saving}
                >
                  {saving ? "Salvando..." : submitLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options?: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const listId = `${label.toLowerCase().replace(/\s+/g, "-")}-options`;
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#4a6a8a]">{label}</span>
      <input
        className="sil-input w-full"
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        disabled={disabled}
        list={options?.length ? listId : undefined}
      />
      {options?.length ? (
        <datalist id={listId}>
          {options.map((option) => <option key={option} value={option} />)}
        </datalist>
      ) : null}
    </label>
  );
}
