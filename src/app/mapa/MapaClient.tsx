"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import ApiErr from "@/components/ApiErr";
import Empty from "@/components/Empty";
import EquipmentDetailsDrawer from "@/components/EquipmentDetailsDrawer";
import { api, getOperationalPresenceInfo, resolveEquipmentCoordinates, timeAgo, type Equipamento, type GpsPoint } from "@/lib/api";
import { fetchJson } from "@/lib/admin-tenant-client";
import { VisualConfig } from "@/lib/equipment-visual-store";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] flex items-center justify-center bg-[#090e14] border border-[#1e2d3d] rounded-2xl text-[#4a6a8a] font-mono text-xs">
      Carregando mapa operacional...
    </div>
  ),
});

export default function MapaClient() {
  const [equip, setEquip] = useState<Equipamento[]>([]);
  const [visualConfigs, setVisualConfigs] = useState<VisualConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rastro, setRastro] = useState<GpsPoint[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [fPresence, setFPresence] = useState("");
  const [lastCheck, setLastCheck] = useState("");
  const [tick, setTick] = useState(0);
  const [showRastro, setShowRastro] = useState(false);
  const [rastroLimit] = useState(100);
  const ref = useRef<(() => Promise<void>) | null>(null);

  const load = useCallback(async () => {
    const [equipResult, visualResult] = await Promise.all([
      api.equipamentos(),
      fetchJson<VisualConfig[]>("/api/admin/equipamentos/visual")
    ]);

    setEquip(equipResult.ok ? equipResult.data : []);
    setVisualConfigs(visualResult.ok ? visualResult.data : []);
    setErr(equipResult.ok ? null : equipResult.error);
    setLastCheck(new Date().toLocaleTimeString("pt-BR"));
  }, []);

  ref.current = load;

  useEffect(() => {
    ref.current?.();
    const id = setInterval(() => ref.current?.(), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selectedId || !showRastro) {
      setRastro([]);
      return;
    }

    let active = true;
    api.rastro(selectedId, rastroLimit).then((res) => active && setRastro(res.ok ? res.data : [])).catch(() => active && setRastro([]));
    const id = setInterval(() => {
      api.rastro(selectedId, rastroLimit).then((res) => active && setRastro(res.ok ? res.data : [])).catch(() => active && setRastro([]));
    }, 10000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [selectedId, showRastro, rastroLimit]);

  const isDrawerOpen = Boolean(selectedId);
  const equipamentoComCoordenadas = useMemo(() => equip.map((eq) => ({ eq, coord: resolveEquipmentCoordinates(eq as unknown as Record<string, unknown>) })), [equip]);
  const comGPS = equipamentoComCoordenadas.filter((item) => item.coord.hasCoordinates).map((item) => item.eq);
  const semGPS = equipamentoComCoordenadas.filter((item) => !item.coord.hasCoordinates);
  const resolvedPresence = (e: Equipamento) => (e.presence === "ONLINE" || e.presence === "INSTAVEL" || e.presence === "OFFLINE") ? e.presence : getOperationalPresenceInfo(e.last_seen).label;
  const onlineCount = equip.filter((e) => resolvedPresence(e) === "ONLINE").length;
  const instavelCount = equip.filter((e) => resolvedPresence(e) === "INSTAVEL").length;
  const offlineCount = equip.filter((e) => resolvedPresence(e) === "OFFLINE").length;
  const filteredComGPS = comGPS.filter((e) => !fPresence || resolvedPresence(e) === fPresence);
  const filteredSemGPS = semGPS.filter((item) => !fPresence || resolvedPresence(item.eq) === fPresence);
  const semLocalizacaoReason = "Sem última localização recebida";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header title="Mapa Operacional" sub="Localizaçao dos equipamentos em tempo real" />
      <main className="p-6 space-y-6 flex-1 flex flex-col min-h-0">
        {err && <ApiErr label="/api/equipamentos/status" msg={err} />}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 flex-none">
          <div className="card-p"><p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">Equipamentos c/ GPS</p><p className="text-[#00d4ff] text-2xl font-bold font-mono mt-1">{comGPS.length}</p></div>
          <div className="card-p"><p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">Equipamentos s/ GPS</p><p className="text-[#4a6a8a] text-2xl font-bold font-mono mt-1">{semGPS.length}</p></div>
          <div className="card-p"><p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">ONLINE</p><p className="text-[#00e676] text-2xl font-bold font-mono mt-1">{onlineCount}</p></div>
          <div className="card-p"><p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">INSTAVEL</p><p className="text-[#ffab00] text-2xl font-bold font-mono mt-1">{instavelCount}</p></div>
          <div className="card-p"><p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">OFFLINE</p><p className="text-[#ff3d57] text-2xl font-bold font-mono mt-1">{offlineCount}</p></div>
          <div className="card-p"><p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">Atualizacao</p><p className="text-[#c8d8e8] text-base font-bold font-mono mt-2">{lastCheck ? `ha ${timeAgo(new Date(Date.now() - 10000).toISOString()) === "agora" ? "poucos segundos" : timeAgo(new Date(Date.now() - 10000).toISOString())}` : "Carregando..."}</p></div>
        </div>

        <div className="flex gap-2 bg-[#111820] border border-[#1e2d3d] p-3 rounded-xl max-w-sm flex-none">
          <span className="text-xs text-[#4a6a8a] flex items-center font-bold px-2 uppercase">Filtrar:</span>
          {[{ label: "Todos", val: "" }, { label: "Online", val: "ONLINE" }, { label: "Instavel", val: "INSTAVEL" }, { label: "Offline", val: "OFFLINE" }].map((btn) => (
            <button
              key={btn.label}
              onClick={() => setFPresence(btn.val)}
              className={`px-3 py-1 rounded text-xs font-semibold ${fPresence === btn.val ? "bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30" : "text-[#4a6a8a]"}`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-6 flex-1 min-h-[520px] pb-2 overflow-hidden">
          <div className={`grid gap-6 flex-1 min-h-[520px] ${isDrawerOpen ? "xl:grid-cols-[minmax(0,1fr)_440px]" : "xl:grid-cols-1"}`}>
            <div className="relative min-w-0 border border-[#1e2d3d] rounded-2xl overflow-hidden bg-[#090e14] min-h-[520px]">
              <MapComponent
                equipamentosComGPS={comGPS}
                visualConfigs={visualConfigs}
                selectedId={selectedId}
                drawerOpen={isDrawerOpen}
                rastro={rastro}
                onSelect={(eq) => setSelectedId((prev) => (prev === eq.trator_id ? null : eq.trator_id))}
                onDeselect={() => setSelectedId(null)}
              />
            </div>

            <EquipmentDetailsDrawer tratorId={selectedId} open={Boolean(selectedId)} onClose={() => setSelectedId(null)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <button className="btn-primary" onClick={() => setShowRastro((v) => !v)}>{showRastro ? "Ocultar rastro" : "Exibir rastro"}</button>
              <div className="card-p space-y-3">
                <h3 className="text-white font-bold">Com coordenadas</h3>
                {filteredComGPS.length > 0 ? filteredComGPS.map((eq) => (
                  <button
                    key={eq.trator_id}
                    onClick={() => setSelectedId((prev) => (prev === eq.trator_id ? null : eq.trator_id))}
                    className="w-full flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-2 hover:bg-[#1e2d3d]/30 transition-colors text-left"
                  >
                    <span className="text-[#c8d8e8] font-semibold">{eq.trator_id}</span>
                    <span className={`px-2 py-0.5 rounded border font-bold uppercase ${resolvedPresence(eq) === "ONLINE" ? "text-[#00e676] border-[#00e676]/30" : resolvedPresence(eq) === "INSTAVEL" ? "text-[#ffab00] border-[#ffab00]/30" : resolvedPresence(eq) === "OFFLINE" ? "text-[#ff3d57] border-[#ff3d57]/30" : "text-[#6b7280] border-[#6b7280]/30"}`}>
                      {resolvedPresence(eq)}
                    </span>
                  </button>
                )) : <div className="text-xs text-[#4a6a8a]">Nenhum equipamento com coordenadas filtrado.</div>}
              </div>
            </div>

            {filteredSemGPS.length > 0 ? (
              <div className="card-p space-y-3">
                <h3 className="text-white font-bold">Sem localização</h3>
                {filteredSemGPS.map((item) => (
                  <button
                    key={item.eq.trator_id}
                    type="button"
                    onClick={() => setSelectedId((prev) => (prev === item.eq.trator_id ? null : item.eq.trator_id))}
                    className="w-full rounded-2xl border border-[#1e2d3d] bg-[#0d1420] p-3 text-left transition-colors hover:border-[#00d4ff]/35 hover:bg-[#111c2a]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white">{item.eq.frota || item.eq.trator_id} · {item.eq.nome || item.eq.descricao || "Sem descrição"}</p>
                        <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.18em] text-[#4a6a8a]">ID técnico: {item.eq.trator_id}</p>
                      </div>
                      <span className="rounded-full border border-[#1f334d] px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#ffb3bc]">
                        {item.eq.cadastro_status || "DESCONHECIDO"}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-1 text-[11px] text-[#c8d8e8]">
                      <div><span className="text-[#4a6a8a]">Tipo:</span> {item.eq.tipo_equipamento || "--"}</div>
                      <div><span className="text-[#4a6a8a]">Grupo:</span> {item.eq.grupo || "--"}</div>
                      <div><span className="text-[#4a6a8a]">Status cadastral:</span> {item.eq.cadastro_status || "DESCONHECIDO"}</div>
                      <div><span className="text-[#4a6a8a]">Motivo:</span> {semLocalizacaoReason}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <Empty title="Nenhum equipamento sem GPS" sub="Todos os equipamentos visiveis possuem coordenadas validas." />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
