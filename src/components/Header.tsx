"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export default function Header({ title, sub }: { title: string; sub?: string }) {
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [apiCheckTime, setApiCheckTime] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const { logout } = useAuth();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("pt-BR"));
      setCurrentDate(now.toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase());
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        const savedUrl = localStorage.getItem("sil_api_base_url");
        const url = savedUrl
          ? `${savedUrl.trim().replace(/\/$/, "")}/health`
          : "/api/health";
        
        const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
        setApiOk(r.ok);
        setApiCheckTime(new Date().toLocaleTimeString("pt-BR"));
      } catch {
        setApiOk(false);
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-20 flex items-center justify-between px-8 sticky top-0 z-30 bg-[#07111f]/60 backdrop-blur-xl border-b border-[#1f334d]/50">
      
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#101b2d] border border-[#1f334d] flex items-center justify-center text-[#00d4ff]">
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-none">{title}</h1>
          {sub && <p className="text-[#4a6a8a] text-[10px] uppercase font-black tracking-widest mt-1.5 opacity-70">{sub}</p>}
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-3 bg-[#101b2d]/50 px-5 py-2 rounded-2xl border border-[#1f334d]/50">
          <svg className="w-5 h-5 text-[#4a6a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div className="flex flex-col">
            <span className="text-white font-mono font-bold text-sm tracking-tighter leading-none">{currentTime}</span>
            <span className="text-[#4a6a8a] text-[9px] font-bold mt-0.5">{currentDate}</span>
          </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${apiOk ? "bg-[#22c55e] pulse-green shadow-[0_0_10px_rgba(34,197,94,0.4)]" : "bg-[#ef4444]"}`} />
          <div className="flex flex-col">
             <span className={`text-[10px] font-black uppercase tracking-widest ${apiOk ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                {apiOk ? "API Online" : "API Offline"}
             </span>
             <span className="text-[#4a6a8a] text-[9px] font-bold">Check: {apiCheckTime || "--:--"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#00d4ff] text-[#07111f] flex items-center justify-center font-black text-xs shadow-[0_0_15px_rgba(0,212,255,0.2)]">
                OP
            </div>
            <button
                onClick={logout}
                className="p-2.5 rounded-xl hover:bg-white/5 text-[#4a6a8a] hover:text-[#ef4444] transition-all"
                title="Sair do Sistema"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
        </div>
      </div>
    </header>
  );
}
