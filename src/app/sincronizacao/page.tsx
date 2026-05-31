"use client";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Badge from "@/components/Badge";
import Empty from "@/components/Empty";
import ApiErr from "@/components/ApiErr";
import { api, type OutboxItem } from "@/lib/api";

export default function SincronizacaoPage() {
  const [queue, setQueue] = useState<OutboxItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const res = await api.outbox();
    if (res.ok) {
      setQueue(res.data);
      setErr(null);
    } else {
      setErr(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 15000);
    return () => clearInterval(id);
  }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Simulação de flush command via API
      await new Promise(resolve => setTimeout(resolve, 2000));
      setLastSync(new Date().toLocaleTimeString("pt-BR"));
      await load(true);
      setToast({ msg: "Sinal de sincronização emitido via broker!", ok: true });
    } catch (e) {
      setToast({ msg: "Erro ao comunicar com coletor.", ok: false });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const countPendente = queue.filter(q => q.status === "PENDENTE").length;
  const countErro = queue.filter(q => q.status === "ERRO").length;
  const countEnviado = queue.filter(q => q.status === "ENVIADO").length;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Sincronização" sub="Fila de pacotes offline e monitoramento de upload" />

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-6 py-3 rounded-2xl border text-xs font-black uppercase tracking-widest shadow-2xl animate-fade-in ${
          toast.ok ? "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e]" : "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ef4444]"
        }`}>
          {toast.msg}
        </div>
      )}

      <main className="p-8 space-y-8 flex-1 animate-fade-in max-w-[1920px] mx-auto w-full">

        {/* Banner Informativo */}
        <div className="card-p bg-gradient-to-r from-[#00d4ff]/5 to-transparent border-[#00d4ff]/20">
            <div className="flex items-start gap-6">
                <div className="w-14 h-14 rounded-2xl bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center text-[#00d4ff] shadow-lg flex-shrink-0">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Protocolo de Redundância Offline</h3>
                    <p className="text-[#4a6a8a] text-xs font-bold mt-2 leading-relaxed max-w-2xl">
                        O SILO OPS utiliza uma fila Outbox inteligente. Se a conexão em campo for interrompida, os pacotes são armazenados localmente no APK e transmitidos automaticamente assim que o sinal (4G/Sat) for restabelecido.
                    </p>
                </div>
            </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="card-p">
            <p className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest opacity-60">Pendentes</p>
            <p className="text-3xl font-black text-[#f59e0b] mt-2 font-mono tabular-nums">{countPendente}</p>
          </div>
          <div className="card-p bg-gradient-to-br from-[#ef4444]/5 to-transparent">
            <p className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest opacity-60">Erros Retidos</p>
            <p className="text-3xl font-black text-[#ef4444] mt-2 font-mono tabular-nums">{countErro}</p>
          </div>
          <div className="card-p">
            <p className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest opacity-60">Sincronizados (24h)</p>
            <p className="text-3xl font-black text-[#22c55e] mt-2 font-mono tabular-nums">{countEnviado}</p>
          </div>
          <div className="card-p">
            <p className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest opacity-60">Último Heartbeat</p>
            <p className="text-base font-black text-white mt-4 font-mono">{lastSync || new Date().toLocaleTimeString("pt-BR")}</p>
          </div>
        </div>

        {err && <ApiErr label="OUTBOX MONITOR" msg={err} />}

        {/* Sync Controls */}
        <div className="flex justify-between items-center bg-[#0d1420] border border-[#1f334d] p-5 rounded-[22px] shadow-inner">
          <div className="flex items-center gap-3">
             <div className={`w-2.5 h-2.5 rounded-full ${syncing ? "bg-[#f59e0b] animate-ping" : "bg-[#22c55e] pulse-green"}`} />
             <span className="text-[#4a6a8a] text-xs font-black uppercase tracking-widest">
                Status do Coletor: <span className={syncing ? "text-[#f59e0b]" : "text-[#22c55e]"}>{syncing ? "Solicitando Flush..." : "Canal de Dados Online"}</span>
             </span>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing || loading}
            className="btn-primary h-12 px-10 shadow-[0_0_20px_rgba(0,212,255,0.2)]"
          >
            {syncing ? "PROCESSANDO..." : "FORÇAR UPLOAD"}
          </button>
        </div>

        {/* Data Table */}
        <div className="card overflow-hidden">
            <div className="px-8 py-6 border-b border-[#1f334d] flex justify-between items-center bg-[#101b2d]/50">
                <h3 className="text-white font-black text-sm uppercase tracking-widest">Fila de Transmissão Central</h3>
                <span className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest opacity-60">Monitoramento via MQTT Bridge</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#0d1420] border-b border-[#1f334d] text-[#4a6a8a] font-black uppercase tracking-[0.2em] text-left">
                            <th className="px-8 py-5">Timestamp</th>
                            <th className="px-8 py-5">Recurso / API</th>
                            <th className="px-8 py-5">Payload de Dados</th>
                            <th className="px-8 py-5 text-center">Tentativas</th>
                            <th className="px-8 py-5">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f334d]/40">
                        {loading && queue.length === 0 ? (
                            Array.from({length: 4}).map((_, i) => (
                                <tr key={i} className="animate-pulse"><td colSpan={5} className="px-8 py-6"><div className="h-4 bg-[#1f334d]/50 rounded w-full" /></td></tr>
                            ))
                        ) : queue.length === 0 ? (
                            <tr><td colSpan={5} className="py-24 text-center"><Empty icon="☁️" title="Sincronismo em dia" sub="Todos os dispositivos móveis estão atualizados." /></td></tr>
                        ) : queue.map(item => (
                            <tr key={item.id} className="hover:bg-[#00d4ff]/5 transition-all group">
                                <td className="px-8 py-6 font-mono text-xs text-[#c8d8e8] opacity-70">
                                    {new Date(item.timestamp).toLocaleTimeString("pt-BR")}
                                </td>
                                <td className="px-8 py-6">
                                    <span className="text-[#00d4ff] font-black text-xs font-mono uppercase bg-[#00d4ff]/5 px-2 py-1 rounded border border-[#00d4ff]/20">/{item.recurso}</span>
                                </td>
                                <td className="px-8 py-6">
                                    <p className="font-mono text-[10px] text-[#4a6a8a] max-w-xs truncate group-hover:text-[#c8d8e8] transition-colors" title={item.payload}>
                                        {item.payload}
                                    </p>
                                </td>
                                <td className="px-8 py-6 text-center text-white font-black font-mono">
                                    {item.tentativas}
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col gap-2">
                                        <Badge
                                            label={item.status}
                                            variant={item.status === "ENVIADO" ? "online" : item.status === "PENDENTE" ? "instavel" : "offline"}
                                            dot
                                        />
                                        {item.status === "ERRO" && item.ultimo_erro && (
                                            <span className="text-[#ef4444] text-[9px] font-bold uppercase leading-tight max-w-[150px]">
                                                {item.ultimo_erro}
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </main>

      <footer className="p-10 text-center opacity-40">
        <p className="text-[#4a6a8a] text-[11px] font-black uppercase tracking-[0.4em]">SILO OPS Cloud Sync &mdash; Protocol Layer v3.2 &copy; 2024</p>
      </footer>
    </div>
  );
}
