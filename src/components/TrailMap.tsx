"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GpsPoint } from "@/lib/api";

type TrailMapProps = {
  points: GpsPoint[];
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
  const modeRef = useRef<LayerMode>("satellite");
  const satelliteFallbackRef = useRef(false);

  useEffect(() => {
    modeRef.current = mode;
    if (mode === "satellite") satelliteFallbackRef.current = false;
  }, [mode]);

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

    if (points.length < 1) return;

    const coords = points.map((point) => [Number(point.latitude), Number(point.longitude)] as [number, number]);
    const polyline = L.polyline(coords, {
      color: "#00d4ff",
      weight: 5,
      opacity: 0.85,
      lineJoin: "round",
    }).addTo(layer);

    const createDot = (color: string, size: number) =>
      L.divIcon({
        className: "",
        html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};border:3px solid white;box-shadow:0 0 14px ${color};"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

    if (coords.length === 1) {
      L.marker(coords[0], { icon: createDot("#00d4ff", 16) }).addTo(layer).bindTooltip("Posição atual", { direction: "top" });
      map.setView(coords[0], 18);
    } else {
      const start = coords[0];
      const end = coords[coords.length - 1];
      L.marker(start, { icon: createDot("#4a6a8a", 12) }).addTo(layer).bindTooltip("Primeira posição", { direction: "top" });
      L.marker(end, { icon: createDot("#00d4ff", 16) }).addTo(layer).bindTooltip("Última posição", { direction: "top" });
      const bounds = polyline.getBounds();
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 18 });
    }
  }, [points]);

  return (
    <div className="relative w-full h-full min-h-[520px] overflow-hidden rounded-2xl border border-[#1f334d] bg-[#090e14]">
      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-control-zoom a { background: #101b2d !important; color: #c8d8e8 !important; border-color: #1f334d !important; }
        .leaflet-control-attribution { background: rgba(5,10,15,0.75) !important; color: #4a6a8a !important; }
      ` }} />
      <div className="absolute top-4 right-4 z-[3] flex items-center gap-2 rounded-2xl border border-[#1f334d] bg-[#0d1420]/90 p-1 shadow-2xl backdrop-blur">
        <button
          type="button"
          onClick={() => setMode("satellite")}
          className={`rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-colors ${modeRef.current === "satellite" ? "bg-[#00d4ff] text-[#041018]" : "text-[#c8d8e8] hover:text-white"}`}
        >
          Satélite
        </button>
        <button
          type="button"
          onClick={() => setMode("map")}
          className={`rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-colors ${modeRef.current === "map" ? "bg-[#00d4ff] text-[#041018]" : "text-[#c8d8e8] hover:text-white"}`}
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
