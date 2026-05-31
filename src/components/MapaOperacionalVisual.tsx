"use client";
import { type Equipamento } from "@/lib/api";
import MarcadorEquipamento from "./MarcadorEquipamento";

interface MapaVisualProps {
  equipamentosComGPS: Equipamento[];
  selectedId: string | null;
  onSelect: (eq: Equipamento) => void;
}

// Helper para normalizar coordenadas (Latitude/Longitude) em porcentagem de tela (0 a 100)
// Isso centraliza e dimensiona automaticamente os tratores no mapa de radar tático
export function normalizarCoordenadasParaMapa(
  lat: number,
  lon: number,
  equipamentosComGPS: { latitude: number | null; longitude: number | null }[]
): { x: number; y: number } {
  // Filtra itens com coordenadas válidas
  const validos = equipamentosComGPS.filter(e => e.latitude !== null && e.longitude !== null) as { latitude: number; longitude: number }[];

  if (validos.length <= 1) {
    // Se houver apenas 1 trator, fixa-o no centro (50%, 50%)
    return { x: 50, y: 50 };
  }

  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;

  validos.forEach(e => {
    if (e.latitude < minLat) minLat = e.latitude;
    if (e.latitude > maxLat) maxLat = e.latitude;
    if (e.longitude < minLon) minLon = e.longitude;
    if (e.longitude > maxLon) maxLon = e.longitude;
  });

  const latSpan = maxLat - minLat;
  const lonSpan = maxLon - minLon;

  // Adiciona 20% de margem/padding para que as bolinhas não toquem as bordas do painel
  const paddingLat = latSpan === 0 ? 0.005 : latSpan * 0.2;
  const paddingLon = lonSpan === 0 ? 0.005 : lonSpan * 0.2;

  const adjMinLat = minLat - paddingLat;
  const adjMaxLat = maxLat + paddingLat;
  const adjMinLon = minLon - paddingLon;
  const adjMaxLon = maxLon + paddingLon;

  const finalLatSpan = adjMaxLat - adjMinLat;
  const finalLonSpan = adjMaxLon - adjMinLon;

  // Longitude mapeia para X (Leste-Oeste)
  const x = ((lon - adjMinLon) / finalLonSpan) * 100;
  // Latitude mapeia para Y (Norte-Sul). Invertemos (100 - Y) pois SVG/CSS topo é y=0
  const y = 100 - ((lat - adjMinLat) / finalLatSpan) * 100;

  return { x, y };
}

export default function MapaOperacionalVisual({
  equipamentosComGPS,
  selectedId,
  onSelect,
}: MapaVisualProps) {
  
  // Define os cantos geográficos para exibição de coordenadas nas extremidades do mapa
  let boundingBox = {
    top: "-37.4000° S",
    bottom: "-37.4400° S",
    left: "-122.1000° O",
    right: "-122.0600° O"
  };

  if (equipamentosComGPS.length > 0) {
    const lats = equipamentosComGPS.map(e => e.latitude).filter((l): l is number => l !== null);
    const lons = equipamentosComGPS.map(e => e.longitude).filter((l): l is number => l !== null);
    
    if (lats.length > 0 && lons.length > 0) {
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      
      const padLat = (maxLat - minLat) === 0 ? 0.01 : (maxLat - minLat) * 0.2;
      const padLon = (maxLon - minLon) === 0 ? 0.01 : (maxLon - minLon) * 0.2;

      boundingBox = {
        top: `${(maxLat + padLat).toFixed(4)}° N`,
        bottom: `${(minLat - padLat).toFixed(4)}° N`,
        left: `${(minLon - padLon).toFixed(4)}° O`,
        right: `${(maxLon + padLon).toFixed(4)}° O`
      };
    }
  }

  return (
    <div className="relative card overflow-hidden bg-[#090e14] border-[#1e2d3d] h-[480px] w-full flex items-center justify-center select-none">
      
      {/* 1. Grid Sutil de Coordenadas de Fundo (Visual de Radar) */}
      <div className="absolute inset-0 z-0">
        <svg width="100%" height="100%" className="opacity-30">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e2d3d" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Círculos Concêntricos de Radar */}
          <circle cx="50%" cy="50%" r="100" fill="none" stroke="#1e2d3d" strokeWidth="0.5" strokeDasharray="3,3" />
          <circle cx="50%" cy="50%" r="200" fill="none" stroke="#1e2d3d" strokeWidth="0.5" strokeDasharray="3,3" />
          <circle cx="50%" cy="50%" r="300" fill="none" stroke="#1e2d3d" strokeWidth="0.5" strokeDasharray="3,3" />
        </svg>
      </div>

      {/* 2. Eixos Centrais com Miras */}
      <div className="absolute w-full h-[0.5px] bg-[#1e2d3d]/50 top-1/2 left-0 pointer-events-none" />
      <div className="absolute h-full w-[0.5px] bg-[#1e2d3d]/50 left-1/2 top-0 pointer-events-none" />

      {/* 3. Efeitos de Varredura de Radar Agrícola (Animação Radial) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="w-full h-full opacity-10 animate-spin" style={{ animationDuration: "12s" }}>
          <svg className="w-full h-full" viewBox="0 0 200 200">
            <defs>
              <radialGradient id="sweep" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path d="M 100 100 L 100 0 A 100 100 0 0 1 200 100 Z" fill="url(#sweep)" />
          </svg>
        </div>
      </div>

      {/* TODO Fase 2: Substituir o Grid e radar pelo mapa do Leaflet */}
      {/* 
        TODO: Adicionar rastro histórico (Polyline/Breadcrumb) para cada trator selecionado.
        Exemplo:
        <svg className="absolute inset-0 z-0 w-full h-full pointer-events-none">
          <polyline
            points={rastroCoordenadas.map(c => `${c.x},${c.y}`).join(" ")}
            fill="none"
            stroke="#00d4ff"
            strokeWidth="2"
            strokeDasharray="4,4"
          />
        </svg>
      */}

      {/* 4. Rótulos de Coordenadas Geográficas nos Cantos */}
      <div className="absolute top-3 left-4 text-[10px] font-mono text-[#4a6a8a]">{boundingBox.top} | {boundingBox.left}</div>
      <div className="absolute top-3 right-4 text-[10px] font-mono text-[#4a6a8a]">{boundingBox.top} | {boundingBox.right}</div>
      <div className="absolute bottom-3 left-4 text-[10px] font-mono text-[#4a6a8a]">{boundingBox.bottom} | {boundingBox.left}</div>
      <div className="absolute bottom-3 right-4 text-[10px] font-mono text-[#4a6a8a]">{boundingBox.bottom} | {boundingBox.right}</div>

      {/* 5. Renderização de Equipamentos na Grade */}
      <div className="absolute inset-0 z-10">
        {equipamentosComGPS.map(eq => {
          const { x, y } = normalizarCoordenadasParaMapa(
            eq.latitude || 0,
            eq.longitude || 0,
            equipamentosComGPS
          );
          return (
            <MarcadorEquipamento
              key={eq.trator_id}
              eq={eq}
              x={x}
              y={y}
              active={selectedId === eq.trator_id}
              onClick={() => onSelect(eq)}
            />
          );
        })}
      </div>

      {/* Bússola Decorativa */}
      <div className="absolute bottom-4 right-4 bg-[#111820]/80 border border-[#1e2d3d] rounded p-2 pointer-events-none flex flex-col items-center gap-1">
        <span className="text-[9px] font-mono text-[#4a6a8a] uppercase tracking-widest font-bold">Monitor SILO OPS</span>
        <div className="w-5 h-5 rounded-full border border-[#4a6a8a]/40 relative flex items-center justify-center">
          <span className="absolute top-0 text-[8px] font-bold text-[#4a6a8a] leading-none">N</span>
          <span className="w-0.5 h-3 bg-[#ff3d57] rounded-full transform rotate-12" />
        </div>
      </div>
    </div>
  );
}
