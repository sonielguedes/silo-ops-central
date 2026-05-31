"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: React.ReactNode };
type NavGroup = { title: string; items: NavItem[] };

const homeIcon = <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const fleetIcon = <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h4m0 0l3-4h-5v4M13 8h7v2M13 12h5" /></svg>;
const mapIcon = <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L16 4m0 13V4m0 0L9 7" /></svg>;
const opsIcon = <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>;
const eventsIcon = <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const telemetriaIcon = <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>;
const operatorIcon = <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const farmIcon = <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const alarmIcon = <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const syncIcon = <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 4.89M9 11l3 3L22 4" /></svg>;
const auditIcon = <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const configOpIcon = <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>;
const relatoriosIcon = <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const configIcon = <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

const nav: NavGroup[] = [
  { title: "Monitoramento", items: [{ href: "/", label: "Dashboard", icon: homeIcon }, { href: "/mapa", label: "Mapa Operacional", icon: mapIcon }, { href: "/operacoes", label: "Operações Ativas", icon: opsIcon }] },
  { title: "Frota & Equipes", items: [{ href: "/equipamentos", label: "Equipamentos", icon: fleetIcon }, { href: "/equipamentos/icones", label: "Ícones Equipamentos", icon: fleetIcon }, { href: "/operadores", label: "Cadastro Operadores", icon: operatorIcon }, { href: "/fazendas", label: "Fazendas & Talhões", icon: farmIcon }] },
  { title: "Alertas & Telemetria", items: [{ href: "/telemetria", label: "Sensores Telemetria", icon: telemetriaIcon }, { href: "/eventos", label: "Histórico de Eventos", icon: eventsIcon }, { href: "/alertas", label: "Painel Alertas", icon: alarmIcon }] },
  { title: "Sistema & Relatórios", items: [{ href: "/sincronizacao", label: "Outbox / Sincronismo", icon: syncIcon }, { href: "/configuracoes-op", label: "Config. Operacionais", icon: configOpIcon }, { href: "/relatorios", label: "Fichas & Relatórios", icon: relatoriosIcon }, { href: "/power-bi", label: "Power BI", icon: relatoriosIcon }, { href: "/auditoria", label: "Auditoria Logs", icon: auditIcon }, { href: "/configuracoes", label: "Configurações Globais", icon: configIcon }] },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-[#0d1420] border-r border-[#1f334d] z-40 flex flex-col overflow-y-auto custom-scrollbar">
      <div className="px-8 py-10 flex flex-col items-start gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#050a0f] border border-[#1f334d] overflow-hidden shadow-[0_0_20px_rgba(0,212,255,0.15)]">
            <Image src="/logo-silo.png" alt="Marca SILO OPS" width={48} height={48} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-white font-black text-base tracking-widest leading-none">SILO OPS Central</p>
            <p className="text-[#4a6a8a] text-[12px] uppercase font-black tracking-tighter mt-2 opacity-85 leading-tight">Centro de Operações Agrícolas em Tempo Real</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-5 py-2 space-y-10">
        {nav.map((group) => (
          <div key={group.title} className="space-y-3">
            <p className="text-[#4a6a8a] text-[12px] font-black tracking-[0.22em] uppercase px-4 opacity-45">{group.title}</p>
            <div className="space-y-1.5">
              {group.items.map((item) => {
                const active = path === item.href || (item.href !== "/" && path.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[14px] transition-all duration-300 group ${active ? "sidebar-item-active font-black shadow-lg" : "text-[#4a6a8a] hover:text-[#c8d8e8] hover:bg-[#101b2d] hover:translate-x-1"}`}>
                    <span className={`flex-shrink-0 transition-colors ${active ? "" : "group-hover:text-[#00d4ff]"}`}>{item.icon}</span>
                    <span className="tracking-tight leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-5 m-5 bg-[#101b2d] border border-[#1f334d] rounded-[22px] flex items-center gap-4 shadow-xl">
        <div className="w-12 h-12 rounded-[18px] bg-[#0d1420] border border-[#1f334d] flex items-center justify-center text-[#00d4ff] font-black text-sm shadow-inner">SO</div>
        <div className="flex-1 overflow-hidden">
          <p className="text-white font-black text-xs truncate uppercase">SILO OPS</p>
          <p className="text-[#4a6a8a] text-[10px] truncate uppercase font-bold mt-1 tracking-widest">Gestor Central</p>
        </div>
        <svg className="w-5 h-5 text-[#4a6a8a] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
    </aside>
  );
}
