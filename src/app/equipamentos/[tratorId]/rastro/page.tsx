"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Badge from "@/components/Badge";
import ApiErr from "@/components/ApiErr";
import { api, fmtDate, timeAgo, type GpsPoint } from "@/lib/api";

type TrailPoint = GpsPoint & {
  status?: string | null;
  origem?: string | null;
  empresa_id?: string | null;
  usina_id?: string | null;
  unidade_id?: string | null;
};

type PeriodPreset = "6h" | "24h" | "72h" | "7d" | "all" | "custom";

const TrailMapClient = dynamic(() => import("@/components/TrailMap"), { ssr: false });

function haversineKm(a: TrailPoint, b: TrailPoint) {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const c = 2 * Math.atan2(
    Math.sqrt(sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon),
    Math.sqrt(1 - sinLat * sinLat - Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon),
  );
  return R * c;
}

function durationLabel(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "--";
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function periodStart(preset: PeriodPreset) {
  const now = Date.now();
  if (preset === "6h") return now - 6 * 60 * 60 * 1000;
  if (preset === "24h") return now - 24 * 60 * 60 * 1000;
  if (preset === "72h") return now - 72 * 60 * 60 * 1000;
  if (preset === "7d") return now - 7 * 24 * 60 * 60 * 1000;
  return null;
}

export default function EquipamentoRastroPage() {
  const router = useRouter();
  const params = useParams<{ tratorId: string }>();
  const tratorId = Array.isArray(params?.tratorId) ? params.tratorId[0] : params?.tratorId || "";
  const [points, setPoints] = useState<TrailPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<PeriodPreset>("24h");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      const result = await api.rastro(tratorId, 1000);
      if (!active) return;
      if (result.ok) {
        setPoints(result.data as TrailPoint[]);
      } else {
        setPoints([]);
        setError(result.error);
      }
      setLoading(false);
    }
    if (tratorId) load();
    return () => {
      active = false;
    };
  }, [tratorId]);

  const filteredPoints = useMemo(() => {
    const customStart = customFrom ? new Date(customFrom).getTime() : null;
    const customEnd = customTo ? new Date(customTo).getTime() : null;
    const start = preset === "custom" ? customStart : periodStart(preset);
    const end = preset === "custom" ? customEnd : null;

    return points.filter((point) => {
      const ts = new Date(point.timestamp).getTime();
      if (!Number.isFinite(ts)) return false;
      if (start !== null && ts < start) return false;
      if (end !== null && ts > end) return false;
      return true;
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [points, preset, customFrom, customTo]);

  const stats = useMemo(() => {
    const first = filteredPoints.length > 0 ? filteredPoints[0] : null;
    const last = filteredPoints.length > 0 ? filteredPoints[filteredPoints.length - 1] : null;
    const km = filteredPoints.length > 1 ? filteredPoints.reduce((total, point, index) => {
      if (index === 0) return total;
      return total + haversineKm(filteredPoints[index - 1], point);
    }, 0) : null;
    const duration = first && last ? new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime() : 0;
    return { first, last, km, duration: first && last ? duration : null };
  }, [filteredPoints]);

  const lastPoint = filteredPoints.length > 0 ? filteredPoints[filteredPoints.length - 1] : null;
  const hasPoints = filteredPoints.length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title={`Rastro do Equipamento ${tratorId || "--"}`} sub="Trajeto histórico com filtro temporal, pontos GPS e métricas operacionais" />
      <main className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/equipamentos")} className="btn-ghost">← Voltar para Equipamentos</button>
            <Badge label={hasPoints ? `${filteredPoints.length} pontos` : "Sem dados"} variant={hasPoints ? "info" : "offline"} />
          </div>
          <div className="text-[#4a6a8a] text-xs font-mono">Atualizado: {lastPoint ? timeAgo(lastPoint.timestamp) : "--"}</div>
        </div>

        {error && <ApiErr label="/api/equipamentos/[tratorId]/rastro" msg={error} />}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="card-p"><p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">Km estimado</p><p className="text-[#00d4ff] text-2xl font-bold font-mono mt-1">{stats.km === null ? "--" : stats.km.toFixed(2)}</p></div>
          <div className="card-p"><p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">Tempo total</p><p className="text-[#c8d8e8] text-2xl font-bold font-mono mt-1">{stats.duration === null ? "--" : durationLabel(stats.duration)}</p></div>
          <div className="card-p"><p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">Primeira posição</p><p className="text-[#c8d8e8] text-sm font-mono mt-1">{stats.first ? fmtDate(stats.first.timestamp) : "--"}</p></div>
          <div className="card-p"><p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">Última posição</p><p className="text-[#c8d8e8] text-sm font-mono mt-1">{stats.last ? fmtDate(stats.last.timestamp) : "--"}</p></div>
        </div>

        <div className="flex flex-wrap gap-3 items-end card-p">
          <div className="flex flex-col gap-1">
            <span className="text-[#4a6a8a] text-[10px] uppercase font-black tracking-widest">Período</span>
            <div className="flex gap-2 flex-wrap">
              {(["6h", "24h", "72h", "7d", "all", "custom"] as PeriodPreset[]).map((item) => (
                <button key={item} className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${preset === item ? "bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30" : "bg-[#0d1420] text-[#4a6a8a] border-[#1f334d]"}`} onClick={() => setPreset(item)}>
                  {item === "custom" ? "Personalizado" : item}
                </button>
              ))}
            </div>
          </div>
          {preset === "custom" && (
            <>
              <label className="flex flex-col gap-1 text-xs text-[#4a6a8a]">
                De
                <input type="datetime-local" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="sil-input min-w-[220px]" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[#4a6a8a]">
                Até
                <input type="datetime-local" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="sil-input min-w-[220px]" />
              </label>
            </>
          )}
        </div>

        {loading ? (
          <div className="grid xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 card-p h-[520px] animate-pulse" />
            <div className="card-p h-[520px] animate-pulse" />
          </div>
        ) : (
          <div className="grid xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <TrailMapClient
                points={filteredPoints}
                title={`Trajeto ${tratorId}`}
                emptyMessage="Nenhum ponto de rastro encontrado para este equipamento no período."
              />
            </div>
            <div className="card-p space-y-3 max-h-[520px] overflow-auto">
              <h3 className="text-white font-black">Pontos GPS</h3>
              {filteredPoints.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#1f334d] bg-[#0d1420] p-6 text-center">
                  <p className="text-white font-black text-sm uppercase tracking-widest">Nenhum ponto de rastro encontrado para este equipamento no período.</p>
                  <p className="mt-2 text-[#4a6a8a] text-xs">Ajuste o filtro temporal ou aguarde novos dados do equipamento.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPoints.map((point, index) => (
                    <div key={`${point.timestamp}-${index}`} className="rounded-xl border border-[#1f334d] bg-[#0d1420] p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#00d4ff] text-xs font-mono font-black">{fmtDate(point.timestamp)}</span>
                        <Badge label={point.status || "GPS"} variant={point.status?.toUpperCase().includes("OFF") ? "offline" : point.status?.toUpperCase().includes("INST") ? "instavel" : "info"} dot={false} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-[#4a6a8a]">Velocidade</span><div className="text-[#c8d8e8] font-mono">{point.velocidade ?? "--"}</div></div>
                        <div><span className="text-[#4a6a8a]">Origem</span><div className="text-[#c8d8e8] font-mono">{point.origem || "--"}</div></div>
                        <div className="col-span-2"><span className="text-[#4a6a8a]">Coordenadas</span><div className="text-[#c8d8e8] font-mono">{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
