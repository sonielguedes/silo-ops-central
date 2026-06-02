"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GpsPoint } from "@/lib/api";

type TrailMapProps = {
  points: GpsPoint[];
  title?: string;
};

export default function TrailMap({ points, title = "Trajeto" }: TrailMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

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

    if (tileRef.current) map.removeLayer(tileRef.current);
    const layer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 22,
      attribution: "SILO OPS",
    }).addTo(map);
    tileRef.current = layer;
  }, []);

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

    const start = coords[0];
    const end = coords[coords.length - 1];

    const createDot = (color: string, size: number) =>
      L.divIcon({
        className: "",
        html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};border:3px solid white;box-shadow:0 0 14px ${color};"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

    L.marker(start, { icon: createDot("#4a6a8a", 12) }).addTo(layer).bindTooltip("Primeira posição", { direction: "top" });
    L.marker(end, { icon: createDot("#00d4ff", 16) }).addTo(layer).bindTooltip("Última posição", { direction: "top" });

    if (coords.length > 1) {
      const bounds = polyline.getBounds();
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 18 });
    } else {
      map.setView(coords[0], 18);
    }
  }, [points]);

  return (
    <div className="relative w-full h-full min-h-[520px] overflow-hidden rounded-2xl border border-[#1f334d] bg-[#090e14]">
      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-control-zoom a { background: #101b2d !important; color: #c8d8e8 !important; border-color: #1f334d !important; }
        .leaflet-control-attribution { background: rgba(5,10,15,0.75) !important; color: #4a6a8a !important; }
      ` }} />
      <div ref={containerRef} className="absolute inset-0" aria-label={title} />
    </div>
  );
}
