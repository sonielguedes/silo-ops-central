"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  buildJumpTooltip,
  buildPointTooltip,
  buildTrailVisualization,
  getTrailColor,
  type TrailPointLike,
} from "@/lib/trail-map";

type TrailMapProps = {
  points: TrailPointLike[];
  title?: string;
  emptyMessage?: string;
};

type LayerMode = "satellite" | "map";

const SATELLITE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_ATTRIBUTION = "Tiles © Esri";
const MAP_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const MAP_ATTRIBUTION = "Map tiles © OpenStreetMap contributors © CARTO";

export default function TrailMap({ points, title = "Trajeto", emptyMessage }: TrailMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [mode, setMode] = useState<LayerMode>("satellite");
  const satelliteFallbackRef = useRef(false);
  const trail = useMemo(() => buildTrailVisualization(points), [points]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: true,
    }).setView([-17.5512, -52.5514], 13);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mode === "satellite") satelliteFallbackRef.current = false;
  }, [mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileRef.current) {
      map.removeLayer(tileRef.current);
      tileRef.current = null;
    }

    const isSatellite = mode === "satellite";
    const layer = L.tileLayer(isSatellite ? SATELLITE_URL : MAP_URL, {
      maxZoom: 22,
      attribution: isSatellite ? SATELLITE_ATTRIBUTION : MAP_ATTRIBUTION,
      crossOrigin: true,
    });

    const onTileError = () => {
      if (!isSatellite || satelliteFallbackRef.current) return;
      satelliteFallbackRef.current = true;
      setMode("map");
    };

    if (isSatellite) {
      layer.on("tileerror", onTileError);
    }

    layer.addTo(map);
    tileRef.current = layer;

    return () => {
      layer.off("tileerror", onTileError);
    };
  }, [mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (layerRef.current) {
      layerRef.current.remove();
    }

    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;

    if (trail.points.length < 1) return;

    const coords = trail.points.map((point) => [Number(point.latitude), Number(point.longitude)] as [number, number]);
    const createDot = (color: string, size: number) =>
      L.divIcon({
        className: "",
        html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};border:3px solid white;box-shadow:0 0 14px ${color};"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    const createArrow = (color: string, angle: number) =>
      L.divIcon({
        className: "",
        html: `
          <div style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;transform:rotate(${angle}deg);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 0 8px ${color});">
              <path d="M12 2L4 12h5v10h6V12h5L12 2z" />
            </svg>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

    trail.points.forEach((point, index) => {
      const color = getTrailColor(point);
      const marker = L.marker(coords[index], { icon: createDot(color, index === 0 || index === trail.points.length - 1 ? 16 : 12) }).addTo(layer);
      marker.bindTooltip(buildPointTooltip(point), {
        direction: "top",
        sticky: true,
        opacity: 0.98,
        className: "trail-tooltip",
      });
    });

    trail.segments.forEach((segment) => {
      const segmentLayer = L.polyline(
        [
          [segment.from.latitude, segment.from.longitude],
          [segment.to.latitude, segment.to.longitude],
        ],
        {
          color: segment.color,
          weight: segment.jump ? 4 : 5,
          opacity: segment.jump ? 0.95 : 0.88,
          dashArray: segment.jump ? "10 12" : undefined,
          lineJoin: "round",
          lineCap: "round",
        },
      ).addTo(layer);

      if (segment.jump) {
        segmentLayer.bindTooltip(buildJumpTooltip(segment), {
          direction: "top",
          sticky: true,
          opacity: 0.98,
          className: "trail-tooltip",
        });
      } else {
        const mid = [
          (segment.from.latitude + segment.to.latitude) / 2,
          (segment.from.longitude + segment.to.longitude) / 2,
        ] as [number, number];
        L.marker(mid, {
          icon: createArrow(segment.color, segment.bearing),
          interactive: false,
        }).addTo(layer);
      }
    });

    if (trail.points.length === 1) {
      map.setView(coords[0], 18);
    } else {
      map.fitBounds(L.latLngBounds(coords), { padding: [48, 48], maxZoom: 18 });
    }
  }, [trail]);

  return (
    <div className="relative w-full h-full min-h-[520px] overflow-hidden rounded-2xl border border-[#1f334d] bg-[#090e14]">
      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-control-zoom a { background: #101b2d !important; color: #c8d8e8 !important; border-color: #1f334d !important; }
        .leaflet-control-attribution { background: rgba(5,10,15,0.75) !important; color: #4a6a8a !important; }
        .trail-tooltip { background: rgba(9, 14, 20, 0.96) !important; border: 1px solid #1f334d !important; box-shadow: 0 18px 40px rgba(0,0,0,0.55) !important; }
        .trail-tooltip.leaflet-tooltip-top:before { border-top-color: #1f334d !important; }
      ` }} />
      <div className="absolute top-4 left-4 z-[3] flex flex-col gap-2">
        {trail.jumpCount > 0 && (
          <div className="rounded-2xl border border-[#ffb020]/40 bg-[#1a1205]/90 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-[#ffb020] shadow-2xl backdrop-blur">
            Salto GPS detectado: {trail.jumpCount}
          </div>
        )}
        <div className="rounded-2xl border border-[#1f334d] bg-[#0d1420]/90 p-1 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-2 px-2 pt-1 flex-wrap">
            {[
              { label: "Trabalhando", color: "#22c55e" },
              { label: "Em movimento", color: "#00d4ff" },
              { label: "Parado", color: "#ffb020" },
              { label: "Sem operação", color: "#64748b" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1 rounded-full bg-[#09111b] px-2 py-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}` }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#c8d8e8]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute top-4 right-4 z-[3] flex items-center gap-2 rounded-2xl border border-[#1f334d] bg-[#0d1420]/90 p-1 shadow-2xl backdrop-blur">
        <button
          type="button"
          onClick={() => setMode("satellite")}
          className={`rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-colors ${mode === "satellite" ? "bg-[#00d4ff] text-[#041018]" : "text-[#c8d8e8] hover:text-white"}`}
        >
          Satélite
        </button>
        <button
          type="button"
          onClick={() => setMode("map")}
          className={`rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-colors ${mode === "map" ? "bg-[#00d4ff] text-[#041018]" : "text-[#c8d8e8] hover:text-white"}`}
        >
          Mapa
        </button>
      </div>
      <div ref={containerRef} className="absolute inset-0" aria-label={title} />
      {points.length === 0 && (
        <div className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none bg-[linear-gradient(180deg,rgba(9,14,20,0.20),rgba(9,14,20,0.72))]">
          <div className="max-w-sm rounded-2xl border border-[#1f334d] bg-[#0d1420]/90 px-5 py-4 text-center shadow-2xl">
            <p className="text-white font-black text-sm uppercase tracking-widest">Sem pontos de rastro</p>
            <p className="mt-2 text-[#7f9bb8] text-xs leading-relaxed">{emptyMessage || "Nenhum ponto disponível para este período."}</p>
          </div>
        </div>
      )}
    </div>
  );
}
