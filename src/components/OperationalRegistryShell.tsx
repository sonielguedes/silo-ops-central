import Header from "@/components/Header";
import SectionHeader from "@/components/dashboard/SectionHeader";
import StatCard from "@/components/StatCard";
import Placeholder from "@/components/Placeholder";

type Props = {
  title: string;
  sub: string;
  module: string;
  endpoints?: string[];
  note?: string;
};

export default function OperationalRegistryShell({ title, sub, module, endpoints, note }: Props) {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title={title} sub={sub} />
      <main className="p-6 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <StatCard
            label="Status"
            value="EM PREPARAÇÃO"
            info="estrutura visual pronta"
            color="yellow"
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            label="Permissões"
            value="TENANT-AWARE"
            info="ADMIN e VIEWER separados"
            color="blue"
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4 9 5.567 9 7.5 10.343 11 12 11z" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0114 0" /></svg>}
          />
          <StatCard
            label="Persistência"
            value="/app/data"
            info="JSON server-side"
            color="green"
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7a4 4 0 014-4h8a4 4 0 014 4v10a4 4 0 01-4 4H8a4 4 0 01-4-4V7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 11h8M8 15h5" /></svg>}
          />
        </div>

        <div className="card-p border border-[#1f334d] bg-[#0d1420]">
          <SectionHeader title="Preparação operacional" sub="Layout, navegação e escopo técnico alinhados ao SILO OPS." />
          <p className="mt-3 text-sm text-[#c8d8e8] leading-relaxed">{note || "Este módulo está sendo estruturado para leitura e manutenção operacional, com compatibilidade com as rotas legadas e migração futura para banco."}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[#1f334d] bg-[#101b2d] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4a6a8a]">Compatibilidade</p>
              <p className="mt-2 text-sm text-[#dce8f5]">As rotas antigas permanecem ativas.</p>
            </div>
            <div className="rounded-2xl border border-[#1f334d] bg-[#101b2d] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4a6a8a]">Leitura</p>
              <p className="mt-2 text-sm text-[#dce8f5]">VIEWER navega sem escrita.</p>
            </div>
            <div className="rounded-2xl border border-[#1f334d] bg-[#101b2d] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4a6a8a]">Admin</p>
              <p className="mt-2 text-sm text-[#dce8f5]">ADMIN_GLOBAL e ADMIN_EMPRESA mantêm edição onde já existe.</p>
            </div>
          </div>
        </div>

        <Placeholder module={module} endpoints={endpoints} />
      </main>
    </div>
  );
}
