"use client";
import { useState } from "react";
import Header from "@/components/Header";
import Badge from "@/components/Badge";

interface LogEntry {
  timestamp: string;
  source: "APK" | "MQTT" | "API" | "GPS";
  level: "INFO" | "WARN" | "ERROR";
  message: string;
}

const INITIAL_LOGS: LogEntry[] = [
  { timestamp: "2026-05-29 19:08:12", source: "APK", level: "INFO", message: "Tablet T01 iniciado com sucesso. Versão do App: v1.4.2" },
  { timestamp: "2026-05-29 19:09:05", source: "GPS", level: "WARN", message: "Trator T02 com desvio de precisão GPS horizontal. HDOP = 4.2 metros." },
  { timestamp: "2026-05-29 19:09:40", source: "API", level: "ERROR", message: "Falha de conexão com a API central em GET /api/operadores. Servidor indisponível (HTTP 502)." },
  { timestamp: "2026-05-29 19:10:02", source: "MQTT", level: "INFO", message: "Conectado ao broker MQTT sil.api.lavoura.org:1883" },
  { timestamp: "2026-05-29 19:10:15", source: "APK", level: "INFO", message: "Jornada iniciada para Operador 48117 no trator T01. Evento de INÍCIO enfileirado." },
  { timestamp: "2026-05-29 19:11:00", source: "MQTT", level: "ERROR", message: "Erro de autenticação no canal sil/frota/T03/telemetria. Conexão terminada pelo broker." },
  { timestamp: "2026-05-29 19:11:35", source: "APK", level: "WARN", message: "Outbox acumulando dados. 15 registros retidos na fila por falha de sincronização." },
  { timestamp: "2026-05-29 19:12:01", source: "GPS", level: "INFO", message: "Sinal de GPS do trator T01 restabelecido com precisão diferencial (RTK ativo)." },
  { timestamp: "2026-05-29 19:13:22", source: "API", level: "INFO", message: "Operação finalizada pelo tablet T04 sincronizada com o backend com sucesso." },
];

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [search, setSearch] = useState("");
  const [fSource, setFSource] = useState("");
  const [fLevel, setFLevel] = useState("");

  const filtered = logs.filter(l => {
    if (fSource && l.source !== fSource) return false;
    if (fLevel && l.level !== fLevel) return false;
    if (search && !l.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <>
      <Header title="Auditoria / Logs Técnicos" sub="Histórico de logs de sistema, erros de conexão e eventos do APK" />

      <main className="p-6 space-y-5">
        {/* Banner de Integração */}
        <div className="card-p border border-[#ffab00]/20 bg-[#ffab00]/5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-[#ffab00] text-xl font-bold leading-none mt-0.5">!</span>
            <div>
              <p className="text-[#ffab00] font-semibold text-sm">Visualizador de Auditoria de Integração</p>
              <p className="text-[#4a6a8a] text-xs mt-1">
                Visualização unificada de logs de conexão e auditoria técnica. Coleta traces gerados em campo e na nuvem para depuração.
              </p>
              <p className="text-[#4a6a8a] text-[10px] font-mono mt-2">API: GET /api/auditoria/logs · MQTT topic: sil/logs/#</p>
            </div>
          </div>
          <Badge label="Demonstração" variant="instavel" dot />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Buscar nos logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="sil-input max-w-xs text-xs"
          />

          <select
            value={fSource}
            onChange={e => setFSource(e.target.value)}
            className="sil-input w-36 text-xs"
          >
            <option value="">Todas Origens</option>
            <option value="APK">APK Tablet</option>
            <option value="MQTT">Broker MQTT</option>
            <option value="API">API REST</option>
            <option value="GPS">Módulo GPS</option>
          </select>

          <select
            value={fLevel}
            onChange={e => setFLevel(e.target.value)}
            className="sil-input w-36 text-xs"
          >
            <option value="">Todos Níveis</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
          </select>

          <button
            onClick={clearLogs}
            className="btn-ghost ml-auto text-xs"
          >
            Limpar Terminal
          </button>
        </div>

        {/* Console terminal */}
        <div className="card overflow-hidden border-[#1e2d3d] bg-[#090e14]">
          <div className="px-4 py-3 border-b border-[#1e2d3d] flex items-center justify-between bg-[#111820]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff3d57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffab00]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#00e676]" />
            </div>
            <p className="text-xs font-mono text-[#4a6a8a]">sil-terminal ~ logs visualizer</p>
          </div>

          <div className="p-4 font-mono text-xs text-[#c8d8e8] h-96 overflow-y-auto space-y-2">
            {filtered.length === 0 ? (
              <p className="italic text-center py-20 text-[#4a6a8a]">Nenhum registro de log encontrado para os filtros.</p>
            ) : (
              filtered.map((l, i) => {
                const lvlColor = l.level === "ERROR" 
                  ? "text-[#ff3d57] font-bold" 
                  : l.level === "WARN" 
                    ? "text-[#ffab00] font-bold" 
                    : "text-[#4a6a8a]";
                
                const srcColor = l.source === "APK" 
                  ? "text-[#00d4ff]" 
                  : l.source === "MQTT" 
                    ? "text-purple-400" 
                    : l.source === "GPS" 
                      ? "text-orange-400" 
                      : "text-emerald-400";
                
                return (
                  <div key={i} className="hover:bg-[#1e2d3d]/20 py-0.5 rounded px-1 transition-colors flex gap-2 items-start">
                    <span className="text-[#4a6a8a] text-[11px] whitespace-nowrap">{l.timestamp}</span>
                    <span className={`text-[11px] font-bold ${srcColor}`}>[{l.source}]</span>
                    <span className={`text-[11px] ${lvlColor}`}>[{l.level}]</span>
                    <span className="text-[#c8d8e8] leading-relaxed">{l.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </>
  );
}
