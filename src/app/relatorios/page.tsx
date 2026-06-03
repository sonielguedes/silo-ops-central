"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import Badge from "@/components/Badge";
import SectionHeader from "@/components/dashboard/SectionHeader";
import EmptyState from "@/components/dashboard/EmptyState";
import TipoIntegracaoModal, { type TipoIntegracao } from "@/components/relatorios/TipoIntegracaoModal";
import { IS_DEMO, IS_LOCAL } from "@/lib/app-env";
import {
  buildDemoFichas,
  buildIntegracaoResumo,
  canExportAll,
  canIntegrateFicha,
  fichaNeedsCorrection,
  gerarCSV,
  gerarTXT,
  normalizeFichaList,
  type FichaExportFormat,
  type FichaIntegracaoResumo,
  type FichaOperacional,
  type FichaStatus,
} from "@/lib/fichas-operacionais";

const STORAGE_KEY = "sil_fichas_operacionais_store_v1";

type DrawerFicha = FichaOperacional;

type EditableField =
  | "regiao"
  | "unidade"
  | "grupoEquipamento"
  | "equipamentoId"
  | "operadorId"
  | "tipoEquipamento"
  | "fazenda"
  | "zona"
  | "talhao"
  | "centroCusto"
  | "origem";

const EDITABLE_FIELDS: Array<[EditableField, string]> = [
  ["regiao", "Região"],
  ["unidade", "Unidade"],
  ["grupoEquipamento", "Grupo"],
  ["equipamentoId", "Equipamento"],
  ["operadorId", "Operador ID"],
  ["tipoEquipamento", "Tipo"],
  ["fazenda", "Fazenda"],
  ["zona", "Zona"],
  ["talhao", "Talhão"],
  ["centroCusto", "Centro de Custo"],
  ["origem", "Origem"],
];

function getEditableValue(ficha: DrawerFicha, key: EditableField) {
  return ficha[key] ?? "";
}

function readLocalFichas(): FichaOperacional[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    const list = normalizeFichaList(data);
    return list.length > 0 ? list : buildDemoFichas();
  } catch {
    return buildDemoFichas();
  }
}

function writeLocalFichas(fichas: FichaOperacional[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fichas));
}

function downloadText(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function startOfDay(yyyyMmDd: string) {
  return new Date(`${yyyyMmDd}T00:00:00`).getTime();
}

function endOfDay(yyyyMmDd: string) {
  return new Date(`${yyyyMmDd}T23:59:59.999`).getTime();
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function statusMeta(status: FichaStatus) {
  if (status === "EXPORTADO") return { label: "Exportada", variant: "enviado" as const };
  if (status === "ATUALIZADO") return { label: "Atualizada", variant: "online" as const };
  if (status === "INCONSISTENTE") return { label: "Inconsistente", variant: "erro" as const };
  return { label: "Pendente", variant: "pendente" as const };
}

function isFichaIndeterminada(ficha: FichaOperacional) {
  return ficha.status === "INCONSISTENTE" || !ficha.fazenda || !ficha.zona || !ficha.talhao || !ficha.centroCusto;
}

function getHorasIndeterminadas(ficha: FichaOperacional) {
  return isFichaIndeterminada(ficha) ? ficha.horas : 0;
}

function getPercentualIndeterminado(ficha: FichaOperacional) {
  if (ficha.horas <= 0) return 0;
  return (getHorasIndeterminadas(ficha) / ficha.horas) * 100;
}

function applyLocalExportState(all: FichaOperacional[], selected: FichaOperacional[], exportedAt: string) {
  const selectedIds = new Set(selected.map(item => item.id_local));
  return all.map(item =>
    selectedIds.has(item.id_local)
      ? { ...item, status: "EXPORTADO" as FichaStatus, exportadoEm: exportedAt }
      : item,
  );
}

async function readJsonSafe(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json") && !contentType.includes("+json")) return null;
  return res.json().catch(() => null);
}

export default function RelatoriosPage() {
  const [fichas, setFichas] = useState<FichaOperacional[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drawerFicha, setDrawerFicha] = useState<DrawerFicha | null>(null);
  const [drawerDraft, setDrawerDraft] = useState<DrawerFicha | null>(null);
  const [exporting, setExporting] = useState<null | FichaExportFormat>(null);
  const [fEquipamento, setFEquipamento] = useState("");
  const [fRegional, setFRegional] = useState("");
  const [fUnidade, setFUnidade] = useState("");
  const [fGrupo, setFGrupo] = useState("");
  const [fTipo, setFTipo] = useState("all");
  const [fStatus, setFStatus] = useState<"all" | FichaStatus>("all");
  const [fDataIni, setFDataIni] = useState("");
  const [fDataFim, setFDataFim] = useState("");
  const [somenteInconsistentes, setSomenteInconsistentes] = useState(false);
  const [integracaoOpen, setIntegracaoOpen] = useState(false);
  const [integracaoLoading, setIntegracaoLoading] = useState(false);
  const [integracaoResumo, setIntegracaoResumo] = useState<FichaIntegracaoResumo | null>(null);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoRows, setHistoricoRows] = useState<Array<Record<string, unknown>>>([]);
  const refreshRef = useRef<(() => Promise<void>) | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);

    try {
      if (IS_DEMO || IS_LOCAL) {
        const local = readLocalFichas();
        if (local.length === 0) {
          const seed = buildDemoFichas();
          writeLocalFichas(seed);
          setFichas(seed);
        } else {
          setFichas(local);
        }
        setNotice(IS_DEMO ? "Ambiente demonstrativo: exportação local habilitada." : "Modo local: dados demonstrativos carregados em localStorage.");
        setErr(null);
        return;
      }

      const res = await fetch("/api/fichas-operacionais", { cache: "no-store", signal: AbortSignal.timeout(9000) });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const list = Array.isArray(data) ? data : Array.isArray(data?.fichas) ? data.fichas : [];
      setFichas(normalizeFichaList(list));
      setNotice(data && typeof data === "object" && typeof data.status_tecnico === "string" ? data.status_tecnico : null);
      setErr(null);
    } catch (e) {
      if (IS_DEMO || IS_LOCAL) {
        const seed = buildDemoFichas();
        writeLocalFichas(seed);
        setFichas(seed);
        setErr(null);
      } else {
        setErr(e instanceof Error ? e.message : "Serviço de fichas indisponível.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  refreshRef.current = () => load(true);

  useEffect(() => {
    load();
    const id = setInterval(() => refreshRef.current?.(), 30000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    return fichas.filter(ficha => {
      if (fEquipamento && !ficha.equipamentoId.toLowerCase().includes(fEquipamento.toLowerCase())) return false;
      if (fRegional && !ficha.regiao.toLowerCase().includes(fRegional.toLowerCase())) return false;
      if (fUnidade && !ficha.unidade.toLowerCase().includes(fUnidade.toLowerCase())) return false;
      if (fGrupo && !ficha.grupoEquipamento.toLowerCase().includes(fGrupo.toLowerCase())) return false;
      if (fStatus !== "all" && ficha.status !== fStatus) return false;
      if (fTipo !== "all" && ficha.tipoEquipamento.toLowerCase() !== fTipo.toLowerCase()) return false;
      if (somenteInconsistentes && ficha.status !== "INCONSISTENTE") return false;
      if (fDataIni && new Date(ficha.dataHoraLocal).getTime() < startOfDay(fDataIni)) return false;
      if (fDataFim && new Date(ficha.dataHoraLocal).getTime() > endOfDay(fDataFim)) return false;
      return true;
    });
  }, [fDataFim, fDataIni, fEquipamento, fGrupo, fRegional, fStatus, fTipo, fUnidade, fichas, somenteInconsistentes]);

  const selectedRecords = useMemo(() => {
    const source = selectedIds.length > 0 ? fichas : filtered;
    return source.filter(ficha => selectedIds.length === 0 || selectedIds.includes(ficha.id_local));
  }, [fichas, filtered, selectedIds]);

  const integrationTarget = useMemo(() => selectedIds.length > 0 ? selectedRecords : [], [selectedIds.length, selectedRecords]);
  const integrationEligible = useMemo(() => integrationTarget.filter(f => canIntegrateFicha(f).ok), [integrationTarget]);
  const integrationBlocked = useMemo(() => integrationTarget.filter(f => !canIntegrateFicha(f).ok), [integrationTarget]);
  const integrationBlockedLines = useMemo(
    () => integrationBlocked.map(f => `${f.equipamentoId} - ${canIntegrateFicha(f).reason || "Erro técnico"}`),
    [integrationBlocked],
  );

  const counts = useMemo(() => ({
    total: fichas.length,
    pendentes: fichas.filter(f => f.status === "PENDENTE").length,
    exportadas: fichas.filter(f => f.status === "EXPORTADO").length,
    inconsistentes: fichas.filter(f => f.status === "INCONSISTENTE").length,
    horasTotais: fichas.reduce((sum, ficha) => sum + ficha.horas, 0),
    indeterminadoPct: fichas.reduce((sum, ficha) => sum + getHorasIndeterminadas(ficha), 0) / Math.max(fichas.reduce((sum, ficha) => sum + ficha.horas, 0), 1) * 100,
  }), [fichas]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(f => selectedIds.includes(f.id_local));

  async function persistRecords(updated: FichaOperacional[]) {
    if (IS_DEMO || IS_LOCAL) {
      writeLocalFichas(updated);
      setFichas(updated);
      return;
    }

    setFichas(updated);
    await Promise.allSettled(
      updated.map(ficha =>
        fetch(`/api/fichas-operacionais/${ficha.id_local}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ficha),
        }),
      ),
    );
  }

  function openDrawer(ficha: FichaOperacional) {
    setDrawerFicha(ficha);
    setDrawerDraft({ ...ficha });
  }

  function closeDrawer() {
    setDrawerFicha(null);
    setDrawerDraft(null);
  }

  async function saveDrawer() {
    if (!drawerDraft) return;

    const nextStatus: FichaStatus =
      drawerDraft.status === "INCONSISTENTE" && drawerDraft.fazenda && drawerDraft.zona && drawerDraft.talhao && drawerDraft.centroCusto
        ? "ATUALIZADO"
        : drawerDraft.status;

    const next: FichaOperacional = {
      ...drawerDraft,
      status: nextStatus,
      exportadoEm: nextStatus === "EXPORTADO" && !drawerDraft.exportadoEm ? new Date().toISOString() : drawerDraft.exportadoEm,
    };

    const updated = fichas.map(ficha => (ficha.id_local === next.id_local ? next : ficha));
    await persistRecords(updated);
    setNotice(nextStatus === "INCONSISTENTE" && fichaNeedsCorrection(next)
      ? "Ficha inconsistente: complete fazenda, zona, talhão e centro de custo antes de exportar."
      : "Ficha atualizada.");
    closeDrawer();
  }

  async function exportRecords(format: FichaExportFormat) {
    setNotice(null);
    const target = selectedRecords;

    if (target.length === 0) {
      setNotice("Nenhuma ficha disponível para exportação.");
      return;
    }

    const validation = canExportAll(target);
    if (!validation.ok) {
      setNotice(validation.reason || "Não foi possível exportar.");
      const blocked = target.find(f => f.status === "INCONSISTENTE" && fichaNeedsCorrection(f)) || target.find(f => f.status === "EXPORTADO");
      if (blocked) openDrawer(blocked);
      return;
    }

    setExporting(format);
    try {
      if (IS_DEMO || IS_LOCAL) {
        const text = format === "txt" ? gerarTXT(target) : gerarCSV(target);
        downloadText(text, `sil_fichas_${new Date().toISOString().slice(0, 10)}.${format}`, format === "txt" ? "text/plain" : "text/csv");
        const exportedAt = new Date().toISOString();
        await persistRecords(applyLocalExportState(fichas, target, exportedAt));
        setNotice(`Arquivo ${format.toUpperCase()} gerado com dados demonstrativos.`);
        return;
      }

      const res = await fetch("/api/fichas-operacionais/exportar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formato: format, fichas: target }),
      });

      if (!res.ok) {
        const data = await readJsonSafe(res);
        setNotice((data && typeof data === "object" && typeof data.status_tecnico === "string" && data.status_tecnico) || "Falha técnica na exportação.");
        return;
      }

      const text = await res.text();
      downloadText(text, `sil_fichas_${new Date().toISOString().slice(0, 10)}.${format}`, format === "txt" ? "text/plain" : "text/csv");
      const exportedAt = new Date().toISOString();
      await persistRecords(applyLocalExportState(fichas, target, exportedAt));
      setNotice(`Arquivo ${format.toUpperCase()} exportado com sucesso.`);
    } catch {
      setNotice("Serviço de exportação temporariamente indisponível.");
    } finally {
      setExporting(null);
    }
  }

  async function integrateSelected(tipo: TipoIntegracao) {
    setIntegracaoLoading(true);
    setIntegracaoResumo(null);
    setNotice(null);

    if (selectedIds.length === 0) {
      setNotice("Selecione ao menos uma ficha para integrar.");
      setIntegracaoLoading(false);
      return;
    }

    if (integrationEligible.length === 0) {
      setNotice(integrationBlockedLines[0] || "Nenhuma ficha elegível para integração.");
      const blocked = integrationTarget.find(f => !canIntegrateFicha(f).ok);
      if (blocked) openDrawer(blocked);
      setIntegracaoLoading(false);
      return;
    }

    const resumoBase = buildIntegracaoResumo(integrationTarget);

    if (tipo === "ARQUIVO_DE_TEXTO") {
      await exportRecords("txt");
      setIntegracaoResumo(resumoBase);
      setIntegracaoOpen(false);
      setIntegracaoLoading(false);
      return;
    }

    try {
      if (IS_DEMO || IS_LOCAL) {
        const exportedAt = new Date().toISOString();
        await persistRecords(applyLocalExportState(fichas, integrationEligible, exportedAt));
        setIntegracaoResumo({ ...resumoBase, alterados: integrationEligible.length });
        setNotice("Integração simulada com persistência local concluída.");
        setIntegracaoOpen(false);
        return;
      }

      const res = await fetch("/api/fichas-operacionais/integrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fichas: integrationEligible, tipo }),
      });
      const data = await readJsonSafe(res);

      if (!res.ok) {
        setNotice((data && typeof data === "object" && typeof data.status_tecnico === "string" && data.status_tecnico) || "Falha técnica na integração.");
        return;
      }

      const exportedAt = new Date().toISOString();
      await persistRecords(applyLocalExportState(fichas, integrationEligible, exportedAt));
      setIntegracaoResumo(
        data && typeof data === "object"
          ? {
              total: Number((data as { total?: number }).total ?? resumoBase.total),
              incluidos: Number((data as { incluidos?: number }).incluidos ?? resumoBase.incluidos),
              alterados: Number((data as { alterados?: number }).alterados ?? resumoBase.alterados),
              erros: Number((data as { erros?: number }).erros ?? resumoBase.erros),
              linhasComErro: Array.isArray((data as { linhasComErro?: unknown[] }).linhasComErro)
                ? (data as { linhasComErro: string[] }).linhasComErro
                : resumoBase.linhasComErro,
            }
          : resumoBase,
      );
      setNotice("Integração concluída.");
      setIntegracaoOpen(false);
    } catch {
      setNotice("Serviço de integração temporariamente indisponível.");
    } finally {
      setIntegracaoLoading(false);
    }
  }

  async function loadHistorico() {
    setHistoricoOpen(true);
    setHistoricoLoading(true);
    try {
      const res = await fetch("/api/fichas-operacionais/historico", { cache: "no-store" });
      const data = await readJsonSafe(res);
      setHistoricoRows(Array.isArray(data?.historico) ? data.historico : []);
      if (data && typeof data.status_tecnico === "string") setNotice(data.status_tecnico);
    } catch {
      setHistoricoRows([]);
      setNotice("Histórico indisponível no momento.");
    } finally {
      setHistoricoLoading(false);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  }

  function toggleSelectVisible() {
    setSelectedIds(allFilteredSelected ? [] : filtered.map(f => f.id_local));
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Fichas & Relatórios" sub="Controle operacional, correções e exportação de fichas do operador" />

      <main className="p-6 space-y-6">
        {notice && (
          <div className="card-p border border-[#f59e0b]/20 bg-[#f59e0b]/5">
            <p className="text-[#f59e0b] font-semibold text-sm">Aviso</p>
            <p className="text-[#4a6a8a] text-xs mt-1">{notice}</p>
          </div>
        )}
        {err && (
          <div className="card-p border border-[#ef4444]/20 bg-[#ef4444]/5">
            <p className="text-[#ef4444] font-semibold text-sm">Status técnico</p>
            <p className="text-[#4a6a8a] text-xs mt-1">{err}</p>
          </div>
        )}

        <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
          {[
            { label: "Total de fichas", value: counts.total, color: "text-[#00d4ff]" },
            { label: "Pendentes", value: counts.pendentes, color: "text-[#f59e0b]" },
            { label: "Exportadas", value: counts.exportadas, color: "text-[#22c55e]" },
            { label: "Inconsistentes", value: counts.inconsistentes, color: "text-[#ef4444]" },
            { label: "Horas totais", value: counts.horasTotais.toFixed(2), color: "text-[#8b5cf6]" },
            { label: "Indeterminado %", value: `${counts.indeterminadoPct.toFixed(1)}%`, color: "text-[#f59e0b]" },
          ].map(card => (
            <div key={card.label} className="card-p">
              <p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">{card.label}</p>
              <p className={`${card.color} text-2xl font-bold font-mono mt-1`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="card-p space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <SectionHeader title="Filtro de Fichas" sub="Seleção por equipamento, status, tipo e período" />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  if (selectedIds.length === 0) {
                    setNotice("Selecione ao menos uma ficha para integrar.");
                    return;
                  }
                  setIntegracaoResumo(null);
                  setIntegracaoOpen(true);
                }}
                className="btn-primary"
              >
                Integrar Selecionados
              </button>
              <button onClick={loadHistorico} className="btn-ghost border border-[#1f334d]">Histórico</button>
              <button onClick={() => exportRecords("csv")} className="btn-primary" disabled={exporting !== null}>
                {exporting === "csv" ? "Gerando..." : "Exportar CSV"}
              </button>
              <button onClick={() => exportRecords("txt")} className="btn-ghost border border-[#1f334d]" disabled={exporting !== null}>
                {exporting === "txt" ? "Gerando..." : "Exportar TXT"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-8 gap-3">
            <input className="sil-input md:col-span-2" placeholder="Busca geral" value={fEquipamento} onChange={e => setFEquipamento(e.target.value)} />
            <input className="sil-input" placeholder="Regional" value={fRegional} onChange={e => setFRegional(e.target.value)} />
            <input className="sil-input" placeholder="Unidade" value={fUnidade} onChange={e => setFUnidade(e.target.value)} />
            <input className="sil-input" placeholder="Grupo" value={fGrupo} onChange={e => setFGrupo(e.target.value)} />
            <input className="sil-input" placeholder="Tipo equipamento" value={fTipo === "all" ? "" : fTipo} onChange={e => setFTipo(e.target.value || "all")} />
            <select className="sil-input" value={fStatus} onChange={e => setFStatus(e.target.value as "all" | FichaStatus)}>
              <option value="all">Todos os status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="EXPORTADO">Exportada</option>
              <option value="ATUALIZADO">Atualizada</option>
              <option value="INCONSISTENTE">Inconsistente</option>
            </select>
            <input className="sil-input" type="date" value={fDataIni} onChange={e => setFDataIni(e.target.value)} />
            <input className="sil-input" type="date" value={fDataFim} onChange={e => setFDataFim(e.target.value)} />
            <label className="flex items-center gap-2 text-xs text-[#c8d8e8] font-semibold">
              <input type="checkbox" checked={somenteInconsistentes} onChange={e => setSomenteInconsistentes(e.target.checked)} />
              Somente inconsistentes
            </label>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1f334d] flex items-center justify-between gap-3 flex-wrap bg-[#101b2d]/50">
            <div>
              <h3 className="text-white font-black text-sm uppercase tracking-widest">Fichas Operacionais</h3>
              <p className="text-[#4a6a8a] text-[10px] font-bold uppercase mt-1 opacity-60">{filtered.length} registros filtrados</p>
            </div>
            <button onClick={toggleSelectVisible} className="text-[#00d4ff] text-[10px] font-black uppercase tracking-widest hover:underline">
              {allFilteredSelected ? "Limpar seleção" : "Selecionar visíveis"} {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
            </button>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-[#0d1420] animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24">
              <EmptyState title="Nenhuma ficha" sub="Altere filtros ou carregue a base demonstrativa." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0d1420] border-b border-[#1f334d] text-[#4a6a8a] font-black uppercase tracking-[0.2em] text-left">
                    <th className="px-4 py-4">
                      <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectVisible} />
                    </th>
                    <th className="px-4 py-4">Regional</th>
                    <th className="px-4 py-4">Unidade</th>
                    <th className="px-4 py-4">Grupo de Equipamento</th>
                    <th className="px-4 py-4">Equipamento</th>
                    <th className="px-4 py-4">Tipo de Equipamento</th>
                    <th className="px-4 py-4">Data</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Horas</th>
                    <th className="px-4 py-4">Horas Indeterminado</th>
                    <th className="px-4 py-4">% Indeterminado</th>
                    <th className="px-4 py-4">Inconsistência</th>
                    <th className="px-4 py-4">Validação</th>
                    <th className="px-4 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f334d]/40">
                  {filtered.map(ficha => (
                    <tr key={ficha.id_local} className="hover:bg-[#00d4ff]/5 transition-all">
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={selectedIds.includes(ficha.id_local)} onChange={() => toggleSelected(ficha.id_local)} />
                      </td>
                      <td className="px-4 py-4 text-white font-bold">{ficha.regiao}</td>
                      <td className="px-4 py-4 text-white font-bold">{ficha.unidade}</td>
                      <td className="px-4 py-4 text-white font-bold">{ficha.grupoEquipamento}</td>
                      <td className="px-4 py-4">
                        <p className="text-white font-black text-sm">{ficha.equipamentoId}</p>
                      </td>
                      <td className="px-4 py-4 text-[#c8d8e8] uppercase text-xs font-bold">{ficha.tipoEquipamento}</td>
                      <td className="px-4 py-4">
                        <p className="text-white font-mono text-xs">{fmtShortDate(ficha.dataHoraLocal)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <Badge label={statusMeta(ficha.status).label} variant={statusMeta(ficha.status).variant} dot={false} />
                      </td>
                      <td className="px-4 py-4 text-white font-bold">{ficha.horas.toFixed(2)} h</td>
                      <td className="px-4 py-4 text-white font-bold">{getHorasIndeterminadas(ficha).toFixed(2)}</td>
                      <td className="px-4 py-4 text-white font-bold">{getPercentualIndeterminado(ficha).toFixed(1)}%</td>
                      <td className="px-4 py-4 text-[#c8d8e8] text-xs">
                        {ficha.status === "INCONSISTENTE" ? (fichaNeedsCorrection(ficha) ? "Fazenda, zona, talhão e centro de custo" : "Corrigida") : "Sem inconsistência"}
                      </td>
                      <td className="px-4 py-4 text-[#c8d8e8] text-xs">
                        {ficha.status === "INCONSISTENTE"
                          ? (fichaNeedsCorrection(ficha) ? "Pendente de validação" : "Validação OK")
                          : "Validação OK"}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openDrawer(ficha)} className="btn-ghost">Detalhes</button>
                          <button onClick={() => openDrawer(ficha)} className="btn-ghost border border-[#f59e0b]/30 text-[#f59e0b]">Alterar inconsistência</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {drawerFicha && drawerDraft && (
        <div className="fixed inset-0 z-[120] bg-black/70 flex justify-end">
          <div className="w-full max-w-3xl h-full bg-[#07111f] border-l border-[#1f334d] shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-[#07111f]/95 backdrop-blur border-b border-[#1f334d] p-5 flex items-center justify-between">
              <div>
                <h3 className="text-white font-black text-lg">Detalhes da ficha</h3>
                <p className="text-[#4a6a8a] text-xs font-mono">{drawerFicha.id_local}</p>
              </div>
              <button onClick={closeDrawer} className="text-[#4a6a8a] hover:text-white text-2xl font-black">&times;</button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {EDITABLE_FIELDS.map(([key, label]) => (
                  <label key={key} className="space-y-1">
                    <span className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest px-1">{label}</span>
                    <input
                      className="sil-input"
                      value={getEditableValue(drawerDraft, key)}
                      onChange={e => setDrawerDraft({ ...drawerDraft, [key]: e.target.value } as DrawerFicha)}
                    />
                  </label>
                ))}

                <label className="space-y-1">
                  <span className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest px-1">Data/Hora local</span>
                  <input
                    className="sil-input"
                    type="datetime-local"
                    value={drawerDraft.dataHoraLocal.slice(0, 16)}
                    onChange={e => setDrawerDraft({ ...drawerDraft, dataHoraLocal: e.target.value ? new Date(e.target.value).toISOString() : drawerDraft.dataHoraLocal })}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest px-1">Status</span>
                  <select className="sil-input" value={drawerDraft.status} onChange={e => setDrawerDraft({ ...drawerDraft, status: e.target.value as FichaStatus })}>
                    <option value="PENDENTE">Pendente</option>
                    <option value="EXPORTADO">Exportada</option>
                    <option value="ATUALIZADO">Atualizada</option>
                    <option value="INCONSISTENTE">Inconsistente</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest px-1">Horas</span>
                  <input className="sil-input" type="number" min="0" step="0.01" value={drawerDraft.horas} onChange={e => setDrawerDraft({ ...drawerDraft, horas: Number(e.target.value) })} />
                </label>
                <label className="space-y-1">
                  <span className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest px-1">Exportado em</span>
                  <input
                    className="sil-input"
                    type="datetime-local"
                    value={drawerDraft.exportadoEm ? drawerDraft.exportadoEm.slice(0, 16) : ""}
                    onChange={e => setDrawerDraft({ ...drawerDraft, exportadoEm: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  />
                </label>
              </div>

              {drawerDraft.status === "INCONSISTENTE" && fichaNeedsCorrection(drawerDraft) && (
                <div className="card-p border border-[#ef4444]/20 bg-[#ef4444]/5">
                  <p className="text-[#ef4444] font-semibold text-sm">Inconsistência pendente</p>
                  <p className="text-[#4a6a8a] text-xs mt-1">Preencha fazenda, zona, talhão e centro de custo para liberar exportação e integração.</p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button onClick={closeDrawer} className="btn-ghost border border-[#1f334d]">Cancelar</button>
                <button onClick={() => setDrawerDraft({ ...drawerDraft, status: "ATUALIZADO" })} className="btn-ghost border border-[#22c55e]/40 text-[#22c55e]">Marcar como atualizada</button>
                <button onClick={saveDrawer} className="btn-primary">Salvar correção</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TipoIntegracaoModal
        open={integracaoOpen}
        loading={integracaoLoading}
        selectedCount={integrationTarget.length}
        validCount={integrationEligible.length}
        blockedCount={integrationBlocked.length}
        blockedLines={integrationBlockedLines}
        summary={integracaoResumo}
        onClose={() => {
          setIntegracaoOpen(false);
          setIntegracaoResumo(null);
        }}
        onConfirm={integrateSelected}
      />

      {historicoOpen && (
        <div className="fixed inset-0 z-[135] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-[#1f334d] bg-[#07111f] shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-[#1f334d] flex items-center justify-between">
              <div>
                <h3 className="text-white font-black text-xl">Histórico</h3>
                <p className="text-[#4a6a8a] text-xs mt-1">Consulta controlada de integrações e exportações.</p>
              </div>
              <button onClick={() => setHistoricoOpen(false)} className="text-[#4a6a8a] hover:text-white text-2xl font-black">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              {historicoLoading ? (
                <div className="text-[#4a6a8a] text-sm">Carregando histórico...</div>
              ) : historicoRows.length === 0 ? (
                <EmptyState title="Sem histórico disponível" sub="O ambiente atual não retornou eventos de histórico." />
              ) : (
                <div className="space-y-3">
                  {historicoRows.map((row, index) => (
                    <div key={index} className="rounded-2xl border border-[#1f334d] bg-[#0d1420] p-4 text-sm text-[#c8d8e8]">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(row, null, 2)}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
