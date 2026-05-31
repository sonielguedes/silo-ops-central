"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/Header";
import Badge from "@/components/Badge";
import ApiErr from "@/components/ApiErr";
import Empty from "@/components/Empty";
import dynamic from "next/dynamic";
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#090e14] border border-[#1e2d3d] rounded-2xl text-[#4a6a8a] font-mono text-xs h-[480px]">
      Carregando mapa operacional...
    </div>
  )
});
import { api, getDynamicPresence, timeAgo, fmtDate, fmtDur, type Equipamento, type GpsPoint, type OperacaoAtiva } from "@/lib/api";
import { getEquipmentModel, getIconForModel, readIconConfig, renderEquipmentIconSvg } from "@/lib/equipment-icons";

export default function MapaPage() {
  const [equip, setEquip] = useState<Equipamento[]>([]);
  const [ops, setOps] = useState<OperacaoAtiva[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rastro, setRastro] = useState<GpsPoint[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fPresence, setFPresence] = useState<string>("");
  const [lastCheck, setLastCheck] = useState<string>("");
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<"geral" | "metricas" | "pat" | "rastro">("geral");
  const [rastroLimit, setRastroLimit] = useState(100);
  const [showRastro, setShowRastro] = useState(false);
  const [rastroLoading, setRastroLoading] = useState(false);
  const [iconConfig, setIconConfig] = useState<Record<string, any>>({});
  const ref = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    setIconConfig(readIconConfig());
  }, []);

  const sel = equip.find(e => e.trator_id === selectedId) || null;
  const selOp = ops.find(o => o.trator_id === selectedId) || null;
  const selIcon = sel ? getIconForModel(getEquipmentModel(sel), iconConfig) : null;

  const load = useCallback(async (s = false) => {
    const [rEquip, rOps] = await Promise.all([
      api.equipamentos(),
      api.operacoesAtivas()
    ]);

    if (rEquip.ok) {
      setEquip(rEquip.data);
      setErr(null);
    } else {
      setErr(rEquip.error);
    }

    if (rOps.ok) {
      setOps(rOps.data);
    }

    setLastCheck(new Date().toLocaleTimeString("pt-BR"));
    setLoading(false);
  }, []);

  const handleSelect = useCallback((eq: Equipamento) => {
    setSelectedId(prev => prev === eq.trator_id ? null : eq.trator_id);
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedId(null);
  }, []);

  ref.current = () => load(true);

  useEffect(() => {
    load();
    const id = setInterval(() => ref.current?.(), 3000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selectedId || !showRastro) {
      setRastro([]);
      return;
    }

    const fetchRastro = async () => {
      setRastroLoading(true);
      const res = await api.rastro(selectedId, rastroLimit);
      if (res.ok) {
        setRastro(res.data);
      } else {
        setRastro([]);
      }
      setRastroLoading(false);
    };

    fetchRastro();
    const interval = setInterval(fetchRastro, 10000);
    return () => clearInterval(interval);
  }, [selectedId, showRastro, rastroLimit]);

  const comGPS = equip.filter(e => e.latitude !== null && e.longitude !== null);
  const semGPS = equip.filter(e => e.latitude === null || e.longitude === null);

  const onlineCount = equip.filter(e => getDynamicPresence(e.last_seen) === "ONLINE").length;
  const offlineCount = equip.filter(e => getDynamicPresence(e.last_seen) === "OFFLINE").length;

  const filteredComGPS = comGPS.filter(e => {
    if (!fPresence) return true;
    return getDynamicPresence(e.last_seen) === fPresence;
  });

  const filteredSemGPS = semGPS.filter(e => {
    if (!fPresence) return true;
    return getDynamicPresence(e.last_seen) === fPresence;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header title="Mapa Operacional" sub="Localização dos equipamentos em tempo real" />

      <main className="p-6 space-y-6 flex-1 flex flex-col min-h-0">
        {err && <ApiErr label="/api/equipamentos/status" msg={err} />}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 flex-none">
          <div className="card-p">
            <p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">Equipamentos c/ GPS</p>
            <p className="text-[#00d4ff] text-2xl font-bold font-mono mt-1">{comGPS.length}</p>
            <p className="text-[#4a6a8a] text-[10px] mt-1">posicionados no mapa</p>
          </div>
          <div className="card-p">
            <p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">Equipamentos s/ GPS</p>
            <p className="text-[#4a6a8a] text-2xl font-bold font-mono mt-1">{semGPS.length}</p>
            <p className="text-[#4a6a8a] text-[10px] mt-1">sem coordenadas ativas</p>
          </div>
          <div className="card-p">
            <p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">ONLINE</p>
            <p className="text-[#00e676] text-2xl font-bold font-mono mt-1">{onlineCount}</p>
            <p className="text-[#4a6a8a] text-[10px] mt-1">comunicando na rede</p>
          </div>
          <div className="card-p">
            <p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">OFFLINE</p>
            <p className="text-[#ff3d57] text-2xl font-bold font-mono mt-1">{offlineCount}</p>
            <p className="text-[#4a6a8a] text-[10px] mt-1">sem sinal recente</p>
          </div>
          <div className="card-p">
            <p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">Atualização</p>
            <p className="text-[#c8d8e8] text-base font-bold font-mono mt-2" key={tick}>
              {lastCheck ? `há ${timeAgo(new Date().toISOString()) === "agora" ? "poucos segundos" : timeAgo(new Date(Date.now() - 10000).toISOString())}` : "Carregando..."}
            </p>
            <p className="text-[#4a6a8a] text-[9px] font-mono mt-1">polling auto 3s</p>
          </div>
        </div>

        <div className="flex gap-2 bg-[#111820] border border-[#1e2d3d] p-3 rounded-xl max-w-sm flex-none">
          <span className="text-xs text-[#4a6a8a] flex items-center font-bold px-2 uppercase">Filtrar:</span>
          {[
            { label: "Todos", val: "" },
            { label: "Online", val: "ONLINE" },
            { label: "Instável", val: "INSTAVEL" },
            { label: "Offline", val: "OFFLINE" }
          ].map(btn => (
            <button
              key={btn.label}
              onClick={() => setFPresence(btn.val)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                fPresence === btn.val 
                  ? "bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30" 
                  : "text-[#4a6a8a] hover:text-[#c8d8e8]"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[520px] pb-2 overflow-hidden">
            <div className="flex-1 relative border border-[#1e2d3d] rounded-2xl overflow-hidden bg-[#090e14]">
              <MapComponent
                equipamentosComGPS={filteredComGPS}
                selectedId={selectedId}
                rastro={rastro}
                onSelect={handleSelect}
                onDeselect={handleDeselect}
              />

              {sel && (
                <div className="absolute top-0 left-0 bottom-0 z-20 w-80 bg-[#0d1420]/95 backdrop-blur-xl border-r border-[#1e2d3d] shadow-2xl flex flex-col animate-fade-in overflow-y-auto">
                  <div className="p-4 border-b border-[#1e2d3d] flex items-center justify-between sticky top-0 bg-[#0d1420] z-30">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors overflow-hidden"
                        style={{
                          backgroundColor: selIcon?.color + "20",
                          borderColor: selIcon?.color + "40"
                        }}
                      >
                        {selIcon ? (
                          <div dangerouslySetInnerHTML={{ __html: renderEquipmentIconSvg(selIcon.svgPath, 24) }} />
                        ) : (
                          <svg className="w-6 h-6 text-[#00d4ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h4m0 0l3-4h-5v4M13 8h7v2M13 12h5" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h2 className="text-[#c8d8e8] font-bold text-sm leading-tight">Detalhes</h2>
                        <p className="text-[11px] font-mono font-bold" style={{ color: selIcon?.color || "#00d4ff" }}>{sel.trator_id}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-[#4a6a8a] transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  <div className="flex-1 p-4 space-y-6">
                    <div className="bg-[#111820] border border-[#1e2d3d] rounded-xl p-3 flex items-center justify-between">
                       <span className="text-[10px] text-[#4a6a8a] uppercase font-bold">Presença</span>
                       <Badge label={getDynamicPresence(sel.last_seen)} variant={getDynamicPresence(sel.last_seen) === "ONLINE" ? "online" : "offline"} />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                       {[
                         { id: "comando", label: "Comando", icon: "⚡", active: false },
                         { id: "rastro", label: "Rastro", icon: "📍", active: activeTab === "rastro" },
                         { id: "alertas", label: "Alarmes", icon: "⚠️", active: false }
                       ].map(btn => (
                         <button
                            key={btn.id}
                            onClick={() => btn.id === "rastro" && setActiveTab("rastro")}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all gap-1.5 group ${
                                btn.active
                                ? "bg-[#00d4ff]/10 border-[#00d4ff] text-[#00d4ff]"
                                : "bg-[#161f2a] border-[#1e2d3d] hover:border-[#00d4ff]/40 hover:bg-[#00d4ff]/5"
                            }`}
                         >
                            <span className="text-lg group-hover:scale-110 transition-transform">{btn.icon}</span>
                            <span className="text-[10px] text-[#4a6a8a] font-bold uppercase">{btn.label}</span>
                         </button>
                       ))}
                    </div>

                    <div className="border-b border-[#1e2d3d] flex gap-4">
                      {["geral", "metricas", "rastro"].map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab as any)}
                          className={`pb-2 text-[10px] uppercase font-bold tracking-wider transition-all relative ${activeTab === tab ? "text-[#00d4ff]" : "text-[#4a6a8a] hover:text-[#c8d8e8]"}`}
                        >
                          {tab}
                          {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00d4ff]" />}
                        </button>
                      ))}
                    </div>

                    {activeTab === "geral" && (
                      <div className="space-y-3 animate-fade-in">
                        {[
                          { label: "Descrição da Operação", val: selOp?.status || sel.status || "EM DESLOCAMENTO" },
                          { label: "Descrição do Implemento", val: "NÃO CADASTRADO" },
                          { label: "Rastro GPS", val: rastro.length > 0 ? `${rastro.length} pontos capturados` : "Rastro indisponível", color: rastro.length > 0 ? "text-[#00d4ff]" : "text-[#4a6a8a]" },
                          { label: "Duração Operação", val: selOp?.inicio ? fmtDur(null, selOp.inicio) : "--" },
                          { label: "Grupo Operação", val: (selOp?.status || "").includes("PROD") ? "PRODUTIVA" : "AUXILIAR" },
                          { label: "Velocidade Atual", val: `${Number(sel.velocidade || 0).toFixed(1)} km/h`, color: "text-[#00e676]" },
                          { label: "Operador", val: selOp?.nome_operador || "MOTORISTA PADRÃO" },
                          { label: "Comunicação", val: sel.gps_source || "GPRS / APK" },
                          { label: "Última Atualização", val: fmtDate(sel.last_seen) },
                          { label: "Fazenda Atual", val: "FAZENDA MODELO" },
                          { label: "Bateria Tablet", val: `${sel.bateria || 0}%`, color: (sel.bateria || 0) > 20 ? "text-[#00e676]" : "text-[#ff3d57]" },
                          { label: "Latitude", val: sel.latitude?.toFixed(7) },
                          { label: "Longitude", val: sel.longitude?.toFixed(7) },
                        ].map((row, idx) => (
                          <div key={idx} className="flex flex-col border-b border-[#1e2d3d]/50 pb-2">
                             <span className="text-[10px] text-[#4a6a8a] uppercase font-semibold">{row.label}</span>
                             <span className={`text-xs font-bold ${row.color || "text-[#c8d8e8]"}`}>{row.val}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "metricas" && (
                      <div className="space-y-4 animate-fade-in text-center py-8">
                         <div className="w-16 h-16 rounded-full bg-[#1e2d3d] flex items-center justify-center mx-auto mb-2">📊</div>
                         <p className="text-[#4a6a8a] text-xs font-medium italic px-4">Métricas de rendimento operacional (ha/h) serão exibidas aqui.</p>
                      </div>
                    )}

                    {activeTab === "rastro" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="bg-[#111820] border border-[#1e2d3d] rounded-xl p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-[#4a6a8a] uppercase font-bold">Rastro Operacional</span>
                                {rastroLoading && <div className="w-3 h-3 border-2 border-[#00d4ff]/20 border-t-[#00d4ff] rounded-full animate-spin"></div>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-[#090e14] p-2 rounded-lg border border-[#1e2d3d]/50">
                                    <p className="text-[9px] text-[#4a6a8a] uppercase font-bold">Pontos</p>
                                    <p className="text-xs font-bold text-[#c8d8e8] font-mono">{rastro.length}</p>
                                </div>
                                <div className="bg-[#090e14] p-2 rounded-lg border border-[#1e2d3d]/50">
                                    <p className="text-[9px] text-[#4a6a8a] uppercase font-bold">Último há</p>
                                    <p className="text-xs font-bold text-[#00e676] font-mono">{sel.last_seen ? timeAgo(sel.last_seen) : "--"}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[9px] text-[#4a6a8a] uppercase font-bold px-1">Limite de Pontos</p>
                                <div className="flex gap-2">
                                    {[50, 100, 500].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => setRastroLimit(val)}
                                            className={`flex-1 py-1 rounded border text-[10px] font-bold transition-all ${rastroLimit === val ? "bg-[#00d4ff]/20 border-[#00d4ff] text-[#00d4ff]" : "bg-[#161f2a] border-[#1e2d3d] text-[#4a6a8a]"}`}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                                {!showRastro ? (
                                    <button
                                        onClick={() => setShowRastro(true)}
                                        className="w-full py-2 bg-[#00d4ff] hover:bg-[#00b8e6] text-black font-bold text-[10px] uppercase rounded-lg transition-all shadow-lg"
                                    >
                                        Mostrar Rastro no Mapa
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowRastro(false)}
                                        className="w-full py-2 bg-[#ff3d57]/10 border border-[#ff3d57]/40 text-[#ff3d57] hover:bg-[#ff3d57]/20 font-bold text-[10px] uppercase rounded-lg transition-all"
                                    >
                                        Ocultar Rastro
                                    </button>
                                )}
                                <button
                                    onClick={() => { setShowRastro(false); setRastro([]); }}
                                    className="w-full py-2 bg-[#161f2a] border border-[#1e2d3d] text-[#4a6a8a] hover:text-[#c8d8e8] font-bold text-[10px] uppercase rounded-lg transition-all"
                                >
                                    Limpar Visualização
                                </button>
                            </div>

                            {showRastro && rastro.length === 0 && !rastroLoading && (
                                <p className="text-[10px] text-[#ff3d57] italic text-center">Sem rastro disponível para este equipamento.</p>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="w-full lg:w-72 space-y-4 h-full overflow-y-auto pr-1">
              <div>
                <p className="text-[#4a6a8a] text-[10px] uppercase font-bold tracking-wider mb-2">Com Coordenadas ({filteredComGPS.length})</p>
                {filteredComGPS.length === 0 && !equip.length ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-full h-12 bg-[#161f2a] border border-[#1e2d3d] rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : filteredComGPS.length === 0 ? (
                  <p className="text-[#4a6a8a] text-xs italic px-2">Nenhum equipamento com GPS nesta categoria.</p>
                ) : (
                  <div className="space-y-1.5">
                    {filteredComGPS.map(e => {
                      const active = selectedId === e.trator_id;
                      const p = getDynamicPresence(e.last_seen);
                      return (
                        <button
                          key={e.trator_id}
                          onClick={() => setSelectedId(active ? null : e.trator_id)}
                          className={`w-full text-left p-2.5 rounded-lg border text-xs flex justify-between items-center transition-all ${
                            active 
                              ? "bg-[#00d4ff]/10 border-[#00d4ff]/40 text-[#00d4ff]" 
                              : "bg-[#161f2a] border-[#1e2d3d] text-[#c8d8e8] hover:bg-[#1e2d3d]/50"
                          }`}
                        >
                          <div>
                            <span className="font-bold">{e.trator_id}</span>
                            <p className="text-[#4a6a8a] text-[9px] mt-0.5 font-mono">{e.latitude?.toFixed(4)}, {e.longitude?.toFixed(4)}</p>
                          </div>
                          <span className={`w-1.5 h-1.5 rounded-full ${p === "ONLINE" ? "bg-[#00e676] pulse-green" : p === "INSTAVEL" ? "bg-[#ffab00] pulse-yellow" : "bg-[#ff3d57]"}`} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[#4a6a8a] text-[10px] uppercase font-bold tracking-wider mb-2">Sem Coordenadas ({filteredSemGPS.length})</p>
                {filteredSemGPS.length === 0 && !equip.length ? (
                  <div className="w-full h-12 bg-[#161f2a] border border-[#1e2d3d] rounded-lg animate-pulse opacity-50" />
                ) : filteredSemGPS.length === 0 ? (
                  <p className="text-[#4a6a8a] text-xs italic px-2">Nenhum equipamento sem GPS nesta categoria.</p>
                ) : (
                  <div className="space-y-1.5">
                    {filteredSemGPS.map(e => {
                      const p = getDynamicPresence(e.last_seen);
                      return (
                        <div
                          key={e.trator_id}
                          className="bg-[#111820]/80 border border-[#1e2d3d]/50 rounded-lg p-2.5 text-xs flex justify-between items-center"
                        >
                          <div>
                            <span className="font-semibold text-[#4a6a8a]">{e.trator_id}</span>
                            <p className="text-[#4a6a8a] text-[9px] mt-0.5 font-mono">GPS ausente/desligado</p>
                          </div>
                          <span className={`w-1.5 h-1.5 rounded-full bg-[#ff3d57]/30`} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
        </div>
      </main>
    </div>
  );
}
