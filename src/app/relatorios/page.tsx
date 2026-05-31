"use client";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Badge from "@/components/Badge";
import ApiErr from "@/components/ApiErr";
import Empty from "@/components/Empty";
import { fmtDate, fmtDur } from "@/lib/api";

interface FichaOperacional {
  id_local: string;
  operacao_id: string | null;
  trator_id: string;
  operador_id: string;
  nome_operador: string | null;
  fazenda: string | null;
  talhao: string | null;
  implemento: string | null;
  status: string;
  inicio: string | null;
  fim: string | null;
  area_total: number | null;
  area_trabalhada: number | null;
  horimetro_fisico_inicial: number;
  horimetro_fisico_final: number | null;
  horimetro_delta: number | null;
  tempo_produtivo_segundos: number | null;
  tempo_parado_segundos: number | null;
  qtd_paradas: number | null;
  payload_json: any;
  criado_em: string;
  atualizado_em: string;
}

export default function RelatoriosPage() {
  const [fFarm, setFFarm] = useState("all");
  const [fTractor, setFTractor] = useState("all");
  const [fOperator, setFOperator] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fPeriod, setFPeriod] = useState("7");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [fichas, setFichas] = useState<FichaOperacional[]>([]);
  const [selectedFicha, setSelectedFicha] = useState<FichaOperacional | null>(null);

  const loadFichas = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("/api/fichas-operacionais", { cache: "no-store", signal: AbortSignal.timeout(9000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFichas(Array.isArray(data) ? data : []);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha na conexão com o servidor de relatórios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFichas();
    const id = setInterval(() => loadFichas(true), 30000);
    return () => clearInterval(id);
  }, [loadFichas]);

  const filtered = fichas.filter((f) => {
    if (fTractor !== "all" && f.trator_id !== fTractor) return false;
    if (fFarm !== "all") {
      const fz = (f.fazenda || "").toLowerCase();
      if (fFarm === "bela" && !fz.includes("bela")) return false;
      if (fFarm === "grande" && !fz.includes("grande")) return false;
    }
    if (fOperator.trim()) {
      const query = fOperator.toLowerCase();
      if (!(f.nome_operador || "").toLowerCase().includes(query) && !f.operador_id.toLowerCase().includes(query)) return false;
    }
    if (fStatus !== "all" && f.status?.toUpperCase() !== fStatus.toUpperCase()) return false;
    if (fPeriod !== "all" && f.inicio) {
      const diffDays = (Date.now() - new Date(f.inicio).getTime()) / (1000 * 60 * 60 * 24);
      if (fPeriod === "today" && diffDays > 1) return false;
      if (fPeriod === "7" && diffDays > 7) return false;
      if (fPeriod === "30" && diffDays > 30) return false;
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ["ID Local","Trator","Operador","Fazenda","Talhao","Status","Inicio","Fim","H. Inicial","H. Final","Delta","Area Trab (ha)"];
    const rows = filtered.map(f => [f.id_local, f.trator_id, f.nome_operador || f.operador_id, f.fazenda || "", f.talhao || "", f.status, f.inicio || "", f.fim || "", f.horimetro_fisico_inicial, f.horimetro_fisico_final ?? "", f.horimetro_delta ?? "", f.area_trabalhada ?? ""]);
    const content = "\uFEFF" + [headers.join(","), ...rows.map(r => r.map(v => `"${String(v)}"`).join(","))].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sil_fichas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const totalHoras = filtered.reduce((acc, c) => acc + (c.horimetro_delta || 0), 0);
  const totalArea = filtered.reduce((acc, c) => acc + (c.area_trabalhada || 0), 0);
  const avgEficiencia = filtered.length > 0 ? (filtered.reduce((acc, c) => acc + (c.tempo_produtivo_segundos || 0), 0) / filtered.reduce((acc, c) => acc + ((c.tempo_produtivo_segundos || 0) + (c.tempo_parado_segundos || 0) || 1), 0) * 100).toFixed(1) : "0.0";

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "FINALIZADA") return { label: "Finalizada", variant: "online" as const };
    if (s === "EM_ANDAMENTO") return { label: "Em Campo", variant: "instavel" as const };
    return { label: s, variant: "offline" as const };
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Relatórios Oficiais" sub="Fichas operacionais e consolidação de produtividade" />

      <main className="p-8 space-y-8 flex-1 animate-fade-in max-w-[1920px] mx-auto w-full">

        {/* Top Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-p bg-gradient-to-br from-[#22c55e]/10 to-transparent">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-[0.2em]">Total Horímetro</p>
                        <p className="text-4xl font-black text-[#22c55e] mt-2 font-mono">{totalHoras.toFixed(1)}h</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center text-[#22c55e]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                </div>
            </div>
            <div className="card-p bg-gradient-to-br from-[#00d4ff]/10 to-transparent">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-[0.2em]">Área Trabalhada</p>
                        <p className="text-4xl font-black text-[#00d4ff] mt-2 font-mono">{totalArea.toFixed(1)}<span className="text-sm ml-1 opacity-50">ha</span></p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center text-[#00d4ff]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                </div>
            </div>
            <div className="card-p bg-gradient-to-br from-[#f59e0b]/10 to-transparent">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-[0.2em]">Eficiência Global</p>
                        <p className="text-4xl font-black text-[#f59e0b] mt-2 font-mono">{avgEficiencia}%</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                </div>
            </div>
        </div>

        {/* Search & Filters */}
        <div className="card-p bg-[#101b2d]/40 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-white font-black text-xs uppercase tracking-widest">Painel de Filtragem Avançada</h3>
                <button onClick={() => loadFichas()} className="text-[#00d4ff] text-[10px] font-black uppercase tracking-widest hover:underline">Atualizar Base</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                    <label className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest px-1">Fazenda</label>
                    <select value={fFarm} onChange={e => setFFarm(e.target.value)} className="sil-input h-11">
                        <option value="all">TODAS AS FAZENDAS</option>
                        <option value="bela">FAZENDA BELA VISTA</option>
                        <option value="grande">FAZENDA RIO GRANDE</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest px-1">Equipamento</label>
                    <select value={fTractor} onChange={e => setFTractor(e.target.value)} className="sil-input h-11">
                        <option value="all">TODOS TRATORES</option>
                        {Array.from(new Set(fichas.map(x => x.trator_id))).map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest px-1">Operador</label>
                    <input type="text" placeholder="BUSCAR NOME..." value={fOperator} onChange={e => setFOperator(e.target.value)} className="sil-input h-11" />
                </div>
                <div className="space-y-2">
                    <label className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest px-1">Status</label>
                    <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="sil-input h-11">
                        <option value="all">TODOS STATUS</option>
                        <option value="FINALIZADA">FINALIZADA</option>
                        <option value="EM_ANDAMENTO">EM ANDAMENTO</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest px-1">Período</label>
                    <select value={fPeriod} onChange={e => setFPeriod(e.target.value)} className="sil-input h-11">
                        <option value="today">HOJE</option>
                        <option value="7">ÚLTIMOS 7 DIAS</option>
                        <option value="30">ÚLTIMOS 30 DIAS</option>
                        <option value="all">HISTÓRICO COMPLETO</option>
                    </select>
                </div>
            </div>
        </div>

        {err && <ApiErr label="RELATÓRIOS" msg={err} />}

        {/* Results Table */}
        <div className="card overflow-hidden">
            <div className="px-8 py-6 border-b border-[#1f334d] flex justify-between items-center bg-[#101b2d]/50">
                <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Fichas Operacionais Consolidadas</h3>
                    <p className="text-[#4a6a8a] text-[10px] font-bold uppercase mt-1 opacity-60">{filtered.length} Registros Processados</p>
                </div>
                <button onClick={exportCSV} className="btn-primary flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    EXPORTAR CSV
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#0d1420] border-b border-[#1f334d] text-[#4a6a8a] font-black uppercase tracking-[0.2em] text-left">
                            <th className="px-8 py-5">ID Local / Início</th>
                            <th className="px-8 py-5">Máquina</th>
                            <th className="px-8 py-5">Operador</th>
                            <th className="px-8 py-5 text-center">Delta Horím.</th>
                            <th className="px-8 py-5 text-center">Área (ha)</th>
                            <th className="px-8 py-5">Status</th>
                            <th className="px-8 py-5 text-right">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f334d]/40">
                        {loading && fichas.length === 0 ? (
                            Array.from({length: 5}).map((_, i) => (
                                <tr key={i} className="animate-pulse"><td colSpan={7} className="px-8 py-6"><div className="h-4 bg-[#1f334d]/50 rounded w-full" /></td></tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={7} className="py-24 text-center"><Empty icon="📄" title="Nenhuma ficha" sub="Altere os filtros para localizar registros." /></td></tr>
                        ) : filtered.map(r => {
                            const badge = getStatusBadge(r.status);
                            return (
                                <tr key={r.id_local} className="hover:bg-[#00d4ff]/5 transition-all group">
                                    <td className="px-8 py-6">
                                        <p className="text-white font-black text-xs font-mono group-hover:text-[#00d4ff] transition-colors">{r.id_local.slice(-8).toUpperCase()}</p>
                                        <p className="text-[#4a6a8a] text-[10px] font-bold mt-1 uppercase">{r.inicio ? fmtDate(r.inicio) : "--"}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-white font-black text-sm tracking-tight">{r.trator_id}</p>
                                        <p className="text-[#4a6a8a] text-[10px] font-black uppercase mt-1 opacity-60">{r.fazenda || "--"}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-white font-bold text-sm tracking-tight">{r.nome_operador || "--"}</p>
                                        <p className="text-[#4a6a8a] text-[10px] font-mono mt-1 opacity-60">MAT: {r.operador_id}</p>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className="text-[#22c55e] font-black font-mono text-sm">+{r.horimetro_delta?.toFixed(2) || "0.00"}h</span>
                                    </td>
                                    <td className="px-8 py-6 text-center text-white font-black font-mono text-sm">
                                        {r.area_trabalhada?.toFixed(2) || "0.00"}
                                    </td>
                                    <td className="px-8 py-6">
                                        <Badge label={badge.label} variant={badge.variant} dot={r.status === "EM_ANDAMENTO"} />
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button onClick={() => setSelectedFicha(r)} className="p-3 rounded-xl bg-[#0d1420] border border-[#1f334d] text-[#4a6a8a] hover:text-[#00d4ff] hover:border-[#00d4ff]/40 transition-all shadow-md">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      </main>

      {/* Details Modal */}
      {selectedFicha && (
        <div className="fixed inset-0 z-[110] bg-[#07111f]/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="card-p w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border-[#00d4ff]/20 shadow-2xl animate-fade-in">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#1f334d]">
                    <div>
                        <h3 className="text-white font-black text-2xl uppercase tracking-tighter">Ficha de Telemetria Detalhada</h3>
                        <p className="text-[#4a6a8a] text-xs font-bold uppercase tracking-widest mt-2">UUID: <span className="text-[#00d4ff] font-mono">{selectedFicha.id_local}</span></p>
                    </div>
                    <button onClick={() => setSelectedFicha(null)} className="w-12 h-12 rounded-2xl bg-[#0d1420] border border-[#1f334d] flex items-center justify-center text-[#4a6a8a] hover:text-white transition-colors text-2xl font-bold">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-4">
                    {/* Header Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="bg-[#0d1420]/80 p-5 rounded-2xl border border-[#1f334d] space-y-1">
                            <span className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest">Equipamento</span>
                            <p className="text-white font-black text-base">{selectedFicha.trator_id}</p>
                        </div>
                        <div className="bg-[#0d1420]/80 p-5 rounded-2xl border border-[#1f334d] space-y-1">
                            <span className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest">Matrícula</span>
                            <p className="text-white font-black text-base font-mono">{selectedFicha.operador_id}</p>
                        </div>
                        <div className="bg-[#0d1420]/80 p-5 rounded-2xl border border-[#1f334d] space-y-1">
                            <span className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest">Fazenda</span>
                            <p className="text-white font-black text-sm uppercase">{selectedFicha.fazenda || "--"}</p>
                        </div>
                        <div className="bg-[#0d1420]/80 p-5 rounded-2xl border border-[#1f334d] space-y-1">
                            <span className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest">Talhão</span>
                            <p className="text-white font-black text-sm uppercase">{selectedFicha.talhao || "--"}</p>
                        </div>
                    </div>

                    {/* Operational Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className="text-white font-black text-[11px] uppercase tracking-[0.2em] border-l-4 border-[#00d4ff] pl-3">Tempos e Movimentos</h4>
                            <div className="card bg-[#0d1420]/40 p-6 space-y-4 border-[#1f334d]/50">
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-[#4a6a8a] text-xs font-bold uppercase">Início Jornada</span>
                                    <span className="text-white font-black text-xs uppercase font-mono">{selectedFicha.inicio ? fmtDate(selectedFicha.inicio) : "--"}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-[#4a6a8a] text-xs font-bold uppercase">Fim Jornada</span>
                                    <span className="text-white font-black text-xs uppercase font-mono">{selectedFicha.fim ? fmtDate(selectedFicha.fim) : "--"}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-t border-[#1f334d]/50 pt-4">
                                    <span className="text-[#4a6a8a] text-xs font-bold uppercase">Tempo Produtivo</span>
                                    <span className="text-[#22c55e] font-black text-base font-mono">{fmtDur(selectedFicha.tempo_produtivo_segundos)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-[#4a6a8a] text-xs font-bold uppercase">Tempo Parado</span>
                                    <span className="text-[#f59e0b] font-black text-base font-mono">{fmtDur(selectedFicha.tempo_parado_segundos)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-[#4a6a8a] text-xs font-bold uppercase">Qtde Paradas</span>
                                    <span className="text-white font-black text-base font-mono">{selectedFicha.qtd_paradas ?? 0} <span className="text-[10px] opacity-40 uppercase">VEZES</span></span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-white font-black text-[11px] uppercase tracking-[0.2em] border-l-4 border-[#22c55e] pl-3">Medições Técnicas</h4>
                            <div className="card bg-[#0d1420]/40 p-6 space-y-4 border-[#1f334d]/50">
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-[#4a6a8a] text-xs font-bold uppercase">Horímetro Inicial</span>
                                    <span className="text-white font-black text-base font-mono">{selectedFicha.horimetro_fisico_inicial.toFixed(2)}h</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-[#4a6a8a] text-xs font-bold uppercase">Horímetro Final</span>
                                    <span className="text-white font-black text-base font-mono">{selectedFicha.horimetro_fisico_final?.toFixed(2) || "--"}h</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-t border-[#1f334d]/50 pt-4">
                                    <span className="text-[#4a6a8a] text-xs font-bold uppercase">Consumo de Horas (Δ)</span>
                                    <span className="text-[#22c55e] font-black text-xl font-mono">+{selectedFicha.horimetro_delta?.toFixed(2) || "0.00"}h</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-[#4a6a8a] text-xs font-bold uppercase">Rendimento de Área</span>
                                    <span className="text-[#00d4ff] font-black text-xl font-mono">{selectedFicha.area_trabalhada?.toFixed(2) || "0.00"} ha</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payload JSON */}
                    <div className="space-y-4 pt-4">
                        <h4 className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest px-1">Pacote de Telemetria Bruto</h4>
                        <pre className="bg-[#0d1420] text-[#00d4ff]/80 text-[10px] font-mono p-6 rounded-[22px] overflow-x-auto border border-[#1f334d] shadow-inner leading-relaxed">
                            {JSON.stringify(selectedFicha.payload_json || {}, null, 4)}
                        </pre>
                    </div>
                </div>

                <div className="pt-6 flex justify-end gap-4 border-t border-[#1f334d]">
                    <button onClick={() => setSelectedFicha(null)} className="btn-primary px-10 h-14">Fechar Visualização</button>
                </div>
            </div>
        </div>
      )}

      <footer className="p-10 text-center opacity-40">
        <p className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-[0.4em]">SILO OPS Intelligence &mdash; Analytics Platform &copy; 2024</p>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f334d; border-radius: 10px; }
      `}</style>
    </div>
  );
}
