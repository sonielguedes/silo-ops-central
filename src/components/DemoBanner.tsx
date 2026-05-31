"use client";
import { IS_DEMO } from "@/lib/app-env";

export default function DemoBanner() {
  if (!IS_DEMO) return null;
  return (
    <div className="fixed top-4 right-4 z-[70] px-4 py-2 rounded-2xl border border-[#ffab00]/30 bg-[#ffab00]/10 text-[#ffab00] text-[10px] font-black uppercase tracking-[0.24em] shadow-2xl backdrop-blur-md">
      Ambiente Demonstrativo
    </div>
  );
}
