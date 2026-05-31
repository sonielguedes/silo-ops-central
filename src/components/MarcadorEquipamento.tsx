"use client";
import { getPresence, type Equipamento } from "@/lib/api";

interface MarcadorProps {
  eq: Equipamento;
  x: number; // Percentual x (0 - 100)
  y: number; // Percentual y (0 - 100)
  active: boolean;
  onClick: () => void;
}

export default function MarcadorEquipamento({ eq, x, y, active, onClick }: MarcadorProps) {
  const p = getPresence(eq.presence);
  
  const colors = {
    ONLINE: {
      dot: "bg-[#00e676]",
      pulse: "border-[#00e676]/50 bg-[#00e676]/20",
      text: "text-[#00e676]",
    },
    INSTAVEL: {
      dot: "bg-[#ffab00]",
      pulse: "border-[#ffab00]/50 bg-[#ffab00]/20",
      text: "text-[#ffab00]",
    },
    OFFLINE: {
      dot: "bg-[#ff3d57]",
      pulse: "border-[#ff3d57]/50 bg-[#ff3d57]/20",
      text: "text-[#ff3d57]",
    },
  };

  const current = colors[p] || colors.OFFLINE;

  return (
    <div
      className="absolute cursor-pointer transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 group"
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={onClick}
    >
      {/* Halo de Pulso */}
      <div 
        className={`absolute inset-0 -m-3 rounded-full border animate-ping duration-1000 ${current.pulse} ${
          p !== "OFFLINE" ? "opacity-100" : "opacity-0"
        }`} 
      />

      {/* Círculo Principal do Marcador */}
      <div 
        className={`w-4 h-4 rounded-full border-2 border-[#080d12] relative z-10 flex items-center justify-center transition-all ${
          current.dot
        } ${active ? "ring-4 ring-[#00d4ff]/40 scale-125" : "group-hover:scale-110"}`}
      >
        {/* Ponto Central Brilhante */}
        <span className="w-1.5 h-1.5 rounded-full bg-white opacity-60" />
      </div>

      {/* Tag flutuante com o ID do Trator */}
      <div 
        className={`absolute left-1/2 -translate-x-1/2 top-5 px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold tracking-wider transition-all z-20 whitespace-nowrap shadow-md ${
          active 
            ? "bg-[#00d4ff] border-[#00d4ff] text-[#080d12]" 
            : "bg-[#111820]/95 border-[#1e2d3d] text-[#c8d8e8] group-hover:border-[#00d4ff]/55"
        }`}
      >
        {eq.trator_id}
      </div>
    </div>
  );
}
