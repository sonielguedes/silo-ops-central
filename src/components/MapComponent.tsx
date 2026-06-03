"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getOperationalPresenceInfo, resolveEquipmentCoordinates, type EquipmentCoordinateInfo, type Equipamento, type GpsPoint } from "@/lib/api";
import { renderEquipmentIconSvg, resolveEquipmentVisualState, ALL_ICONS } from "@/lib/equipment-icons";
import { VisualConfig } from "@/lib/equipment-visual-store";

interface MapComponentProps {
  equipamentosComGPS: Equipamento[];
  selectedId: string | null;
  rastro?: GpsPoint[];
  visualConfigs?: VisualConfig[];
  onSelect: (eq: Equipamento) => void;
  onDeselect?: () => void;
}

export default function MapComponent({
  equipamentosComGPS,
  selectedId,
  rastro = [],
  visualConfigs = [],
  onSelect,
  onDeselect
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const polylineRef = useRef<L.Polyline | null>(null);
  const rastroMarkersRef = useRef<L.Marker[]>([]);
  const lastSelectedIdRef = useRef<string | null>(null);
  const hasFittedRef = useRef(false);
  const [mapType, setMapType] = useState<"dark" | "satellite">("satellite");
  const [zoomLevel, setZoomLevel] = useState(13);

  // 1. Inicia o Mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Configura Leaflet para não usar imagens default
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: null,
      iconUrl: null,
      shadowUrl: null,
    });

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: true,
      markerZoomAnimation: true
    }).setView([-17.5512, -52.5514], 13);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    setZoomLevel(map.getZoom());
    map.on("zoomend", () => setZoomLevel(map.getZoom()));

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    });
    if (mapContainerRef.current) resizeObserver.observe(mapContainerRef.current);

    setTimeout(() => map.invalidateSize(), 500);

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Camadas de Mapa
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    const url = mapType === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
    const layer = L.tileLayer(url, { maxZoom: 22, attribution: "Google Maps" });
    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [mapType]);

  // 3. Gerador de Ícones PADRONIZADOS (Nova Versão SILO OPS)
  const createIcon = useCallback((eq: Equipamento, isActive: boolean) => {
    const type = (eq.tipo_equipamento || "DEFAULT").toUpperCase();
    const config = visualConfigs.find(c => c.tipo_equipamento === type) || visualConfigs.find(c => c.tipo_equipamento === "DEFAULT");

    const iconDef = ALL_ICONS.find(i => i.id === config?.icone) || ALL_ICONS.find(i => i.id === "default");
    const statusTone = resolveEquipmentVisualState(eq as unknown as Record<string, unknown>);

    let statusColor = config?.cor_online || "#22c55e";
    if (statusTone.key === "OFFLINE") statusColor = config?.cor_offline || "#ef4444";
    if (statusTone.key === "INSTAVEL") statusColor = config?.cor_instavel || "#f59e0b";

    const presenceTone = getOperationalPresenceInfo(eq.last_seen);
    const isOffline = statusTone.key === "OFFLINE";
    const isInstavel = statusTone.key === "INSTAVEL";

    const compact = zoomLevel < 14;
    const outerWidth = compact ? 62 : 76;
    const outerHeight = compact ? 88 : 102;
    const circleSize = compact ? 44 : 52;
    const iconSize = compact ? 22 : 28;

    // Heading calculation
    const direction = (config?.rotaciona_icone && isActive && rastro.length > 1)
      ? (() => {
          const prev = rastro[rastro.length - 2];
          const last = rastro[rastro.length - 1];
          const toRad = (deg: number) => (deg * Math.PI) / 180;
          const toDeg = (rad: number) => (rad * 180) / Math.PI;
          const lat1 = toRad(Number(prev.latitude));
          const lat2 = toRad(Number(last.latitude));
          const dLon = toRad(Number(last.longitude) - Number(prev.longitude));
          const y = Math.sin(dLon) * Math.cos(lat2);
          const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
          return (toDeg(Math.atan2(y, x)) + 360) % 360;
        })()
      : null;

    const label = `${eq.frota || eq.trator_id} · ${statusTone.short}`;

    return L.divIcon({
      className: "sil-marker-node",
      html: `
        <div class="marker-container ${isActive ? "is-selected" : ""}" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: ${outerWidth}px;
          height: ${outerHeight}px;
          pointer-events: none;
          transform: scale(${isActive ? 1.15 : 1});
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        ">
          <!-- Badge Superior -->
          ${config?.mostrar_label ? `
          <div style="
            display: flex;
            align-items: center;
            gap: 4px;
            background: rgba(5,10,15,0.96);
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
            font-size: ${compact ? "9px" : "10px"};
            font-weight: 900;
            padding: ${compact ? "2px 6px" : "2px 7px"};
            border-radius: 999px;
            border: 1px solid ${statusColor};
            margin-bottom: -5px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.55);
            z-index: 1001;
            text-transform: uppercase;
          ">
            <span style="width: 7px; height: 7px; border-radius: 999px; background: ${statusColor}; box-shadow: 0 0 8px ${statusColor};"></span>
            <span>${label}</span>
          </div>
          ` : ""}

          <!-- Círculo Principal com Ícone -->
          <div style="
            width: ${circleSize}px;
            height: ${circleSize}px;
            background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18), rgba(255,255,255,0.02) 42%, rgba(0,0,0,0.22) 100%), ${statusColor}dd;
            border: 3px solid ${statusColor};
            border-radius: 18px 18px 18px 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            pointer-events: auto;
            cursor: pointer;
            z-index: 1000;
            position: relative;
            overflow: visible;
            ${isOffline ? "filter: grayscale(0.5) brightness(0.8);" : ""}
          ">
            <div style="width: ${iconSize}px; height: ${iconSize}px; display: flex; align-items: center; justify-content: center; ${direction !== null ? `transform: rotate(${direction}deg);` : ""}">
                ${renderEquipmentIconSvg(iconDef?.svgPath || "", iconSize)}
            </div>
            ${direction !== null ? `<div style="position:absolute;right:-7px;top:-7px;width:18px;height:18px;display:flex;align-items:center;justify-content:center;transform:rotate(${direction}deg);background:rgba(5,10,15,0.9);border:1px solid ${statusColor};border-radius:999px;color:${statusColor};font-size:10px;box-shadow:0 0 8px rgba(0,0,0,0.35);">▲</div>` : ""}

            <div style="
                position: absolute;
                left: 50%;
                bottom: -10px;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 10px solid transparent;
                border-right: 10px solid transparent;
                border-top: 12px solid ${statusColor};
                filter: drop-shadow(0 2px 2px rgba(0,0,0,0.35));
            "></div>
          </div>

          ${isActive ? `<div class="pulse-ring"></div>` : ""}
        </div>
      `,
      iconSize: [outerWidth, outerHeight],
      iconAnchor: [outerWidth / 2, outerHeight - 7]
    });
  }, [visualConfigs, zoomLevel, rastro]);

  // 4. Gestão de Marcadores e Centralização Inteligente
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const validPoints = equipamentosComGPS
      .map(eq => ({ eq, coords: resolveEquipmentCoordinates(eq as unknown as Record<string, unknown>) }))
      .filter((item): item is { eq: Equipamento; coords: EquipmentCoordinateInfo & { latitude: number; longitude: number } } =>
        item.coords.hasCoordinates && item.coords.latitude !== null && item.coords.longitude !== null
      );

    const currentIds = new Set(validPoints.map(item => item.eq.trator_id));

    // Cleanup órfãos
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Adiciona ou Atualiza
    validPoints.forEach(({ eq, coords }) => {
      const pos = new L.LatLng(coords.latitude, coords.longitude);
      const isSelected = selectedId === eq.trator_id;

      if (markersRef.current[eq.trator_id]) {
        const m = markersRef.current[eq.trator_id];
        m.setLatLng(pos);
        m.setIcon(createIcon(eq, isSelected));
        m.setZIndexOffset(isSelected ? 30000 : (getOperationalPresenceInfo(eq.last_seen).label === "ONLINE" ? 5000 : 100));
      } else {
        const m = L.marker(pos, {
            icon: createIcon(eq, isSelected),
            zIndexOffset: isSelected ? 30000 : 1000
        })
        .addTo(map)
        .on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            onSelect(eq);
        });
        markersRef.current[eq.trator_id] = m;
      }

      // Se selecionado, centraliza
      if (isSelected && selectedId !== lastSelectedIdRef.current) {
        lastSelectedIdRef.current = selectedId;
        map.setView(pos, 18, { animate: true });
      }
    });

    // Initial Fit
    if (validPoints.length > 0 && !hasFittedRef.current) {
        hasFittedRef.current = true;

        // Verifica dispers?o (se est?o muito longe, ex: Brasil e EUA)
        const lats = validPoints.map(p => Number(p.coords.latitude));
        const lons = validPoints.map(p => Number(p.coords.longitude));
        const latDiff = Math.max(...lats) - Math.min(...lats);
        const lonDiff = Math.max(...lons) - Math.min(...lons);

        if (latDiff > 5 || lonDiff > 5) {
            // Est?o muito longe. Prioriza o mais recente
            const sorted = [...validPoints].sort((a,b) => new Date(b.eq.last_seen).getTime() - new Date(a.eq.last_seen).getTime());
            map.setView([Number(sorted[0].coords.latitude), Number(sorted[0].coords.longitude)], 17);
        } else {
            const bounds = L.latLngBounds(validPoints.map(e => [Number(e.coords.latitude), Number(e.coords.longitude)]));
            map.fitBounds(bounds, { padding: [100, 100], maxZoom: 17 });
        }
    }
  }, [equipamentosComGPS, selectedId, createIcon, onSelect]);

  // 5. Rastro
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Cleanup rastro anterior
    if (polylineRef.current) polylineRef.current.remove();
    rastroMarkersRef.current.forEach(m => m.remove());
    rastroMarkersRef.current = [];

    if (rastro && rastro.length > 1) {
      const pts = rastro.map(p => [Number(p.latitude), Number(p.longitude)] as [number, number]);

      // Linha do rastro
      polylineRef.current = L.polyline(pts, {
        color: "#00d4ff",
        weight: 6,
        dashArray: "10, 15",
        opacity: 0.7,
        lineJoin: "round"
      }).addTo(map);

      // Marcador de Início (Onde começou o rastro solicitado)
      const startPos = pts[0];
      const startMarker = L.marker(startPos, {
        icon: L.divIcon({
          className: "rastro-dot-start",
          html: `<div style="width: 12px; height: 12px; background: #4a6a8a; border: 2px solid white; border-radius: 50%;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        })
      }).addTo(map).bindTooltip("Início do Rastro", { permanent: false, direction: "top" });

      // Marcador de Fim (Posição mais recente do rastro)
      const endPos = pts[pts.length - 1];
      const endMarker = L.marker(endPos, {
        icon: L.divIcon({
          className: "rastro-dot-end",
          html: `<div style="width: 16px; height: 16px; background: #00d4ff; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px #00d4ff;"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      }).addTo(map).bindTooltip("Último Ponto", { permanent: false, direction: "top" });

      rastroMarkersRef.current = [startMarker, endMarker];
    }
  }, [rastro]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#000] rounded-2xl border border-white/10">
        <style dangerouslySetInnerHTML={{ __html: `
            .sil-marker-node { background: transparent !important; border: none !important; box-shadow: none !important; overflow: visible !important; }
            .leaflet-marker-icon { opacity: 1 !important; visibility: visible !important; display: block !important; }
            .leaflet-pane { z-index: 500 !important; }
            .leaflet-tile-pane { z-index: 100 !important; }
            .leaflet-marker-pane { z-index: 1000 !important; }

            .pulse-ring {
                position: absolute;
                width: 60px;
                height: 60px;
                border: 4px solid #00d4ff;
                border-radius: 50%;
                animation: marker-pulse 2s infinite;
                z-index: 999;
                pointer-events: none;
            }

            @keyframes marker-pulse {
                0% { transform: scale(0.8); opacity: 0.8; }
                100% { transform: scale(2.2); opacity: 0; }
            }
        `}} />
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 z-[2000] flex flex-col gap-2 pointer-events-auto">
        <div className="bg-black/90 backdrop-blur-md p-1.5 rounded-xl border border-white/20 flex gap-1">
          <button onClick={() => setMapType("dark")} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${mapType === "dark" ? "bg-[#00d4ff]/20 text-[#00d4ff]" : "text-gray-400"}`}>Escuro</button>
          <button onClick={() => setMapType("satellite")} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${mapType === "satellite" ? "bg-[#00d4ff]/20 text-[#00d4ff]" : "text-gray-400"}`}>Satélite</button>
        </div>
        <button onClick={() => {
            if (onDeselect) onDeselect();
            hasFittedRef.current = false;
            const valid = equipamentosComGPS
              .map(eq => resolveEquipmentCoordinates(eq as unknown as Record<string, unknown>))
              .filter(coords => coords.hasCoordinates)
              .map(coords => [Number(coords.latitude), Number(coords.longitude)] as [number, number]);
            if (mapRef.current && valid.length > 0) {
                const bounds = L.latLngBounds(valid);
                mapRef.current.fitBounds(bounds, { padding: [150, 150], maxZoom: 17 });
            }
        }} className="bg-black/90 border border-white/20 text-white rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase shadow-2xl hover:bg-white hover:text-black transition-all">Centralizar Frota</button>
      </div>
    </div>
  );
}
