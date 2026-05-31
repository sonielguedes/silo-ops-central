import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  info?: string;
  color?: "blue" | "green" | "yellow" | "red" | "purple";
  icon: React.ReactElement<{ className?: string }>;
}

const COLORS = {
  blue: {
    bg: "bg-[#00d4ff]/10",
    border: "border-[#00d4ff]/30",
    text: "text-[#00d4ff]",
    gradient: "from-[#00d4ff]/10 to-transparent",
    sparkline: "#00d4ff",
    shadow: "shadow-[#00d4ff]/10"
  },
  green: {
    bg: "bg-[#22c55e]/10",
    border: "border-[#22c55e]/30",
    text: "text-[#22c55e]",
    gradient: "from-[#22c55e]/10 to-transparent",
    sparkline: "#22c55e",
    shadow: "shadow-[#22c55e]/10"
  },
  yellow: {
    bg: "bg-[#f59e0b]/10",
    border: "border-[#f59e0b]/30",
    text: "text-[#f59e0b]",
    gradient: "from-[#f59e0b]/10 to-transparent",
    sparkline: "#f59e0b",
    shadow: "shadow-[#f59e0b]/10"
  },
  red: {
    bg: "bg-[#ef4444]/10",
    border: "border-[#ef4444]/30",
    text: "text-[#ef4444]",
    gradient: "from-[#ef4444]/10 to-transparent",
    sparkline: "#ef4444",
    shadow: "shadow-[#ef4444]/10"
  },
  purple: {
    bg: "bg-[#a855f7]/10",
    border: "border-[#a855f7]/30",
    text: "text-[#a855f7]",
    gradient: "from-[#a855f7]/10 to-transparent",
    sparkline: "#a855f7",
    shadow: "shadow-[#a855f7]/10"
  }
};

export default function StatCard({ label, value, sub, info, color = "blue", icon }: StatCardProps) {
  const c = COLORS[color];

  return (
    <div className={`card relative overflow-hidden group min-h-[125px] flex flex-col justify-between hover:scale-[1.02] transition-all duration-500 ${c.shadow}`}>
      {/* Background Gradient Effect */}
      <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${c.gradient} opacity-20 pointer-events-none`} />

      <div className="p-5 xl:p-6 relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-[0.12em] opacity-70 truncate">{label}</p>
            <div className="flex items-baseline gap-2">
                <p className={`text-4xl xl:text-5xl font-black tabular-nums ${c.text} leading-tight`}>{value}</p>
                {sub && <span className="text-[#4a6a8a] text-[10px] font-bold uppercase opacity-50 truncate">{sub}</span>}
            </div>
            {info && <p className="text-[#4a6a8a] text-[9px] font-bold mt-1 tracking-tight uppercase opacity-60 leading-none">{info}</p>}
          </div>

          <div className={`w-12 h-12 xl:w-14 xl:h-14 rounded-full ${c.bg} border ${c.border} flex items-center justify-center ${c.text} group-hover:scale-110 transition-transform duration-500 shadow-inner shrink-0 relative overflow-hidden`}>
             <div className="absolute inset-0 bg-current opacity-5 animate-pulse" />
              {React.cloneElement(icon, { className: "w-6 h-6 xl:w-7 xl:h-7 relative z-10" })}
          </div>
        </div>
      </div>

      {/* Optimized subtle sparkline */}
      <div className="h-10 w-full px-1 relative -bottom-1">
          <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
              <path
                  d="M0 25 Q 10 5, 20 20 T 40 15 T 60 25 T 80 10 T 100 20"
                  fill="none"
                  stroke={c.sparkline}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="opacity-20 group-hover:opacity-40 transition-opacity duration-500"
              />
          </svg>
      </div>
    </div>
  );
}
