import Link from "next/link";
import Header from "@/components/Header";
import SectionHeader from "@/components/dashboard/SectionHeader";

const items = [
  { href: "/cadastros/equipamentos/tipos", label: "Tipos de Equipamento" },
  { href: "/cadastros/equipamentos/modelos", label: "Modelos de Equipamento" },
  { href: "/cadastros/equipamentos/grupos", label: "Grupos de Equipamento" },
  { href: "/cadastros/equipamentos/perfis", label: "Perfis de Equipamento" },
  { href: "/cadastros/equipamentos/estados", label: "Estados Operacionais" },
  { href: "/cadastros/implementos", label: "Implementos" },
  { href: "/cadastros/implementos/medidas", label: "Medidas do Implemento" },
  { href: "/cadastros/cargos", label: "Cargos" },
  { href: "/cadastros/equipes", label: "Equipes" },
  { href: "/cadastros/operacoes", label: "Operações" },
  { href: "/cadastros/codigos-parada", label: "Códigos de Parada" },
  { href: "/cadastros/safras", label: "Safras" },
  { href: "/cadastros/combustivel", label: "Combustível" },
];

export default function CadastrosPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Cadastros Operacionais" sub="Estrutura de referência para o SILO OPS, com navegação organizada e preparo para futuras integrações." />
      <main className="p-6 space-y-6">
        <div className="card-p border border-[#1f334d] bg-[#0d1420]">
          <SectionHeader title="Visão geral" sub="Portal de cadastros operacionais agrícolas." />
          <p className="mt-3 text-sm text-[#c8d8e8]">Os módulos abaixo mantêm o padrão visual SILO OPS e encaminham para páginas funcionais ou placeholders compatíveis com a estrutura atual.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="card-p border border-[#1f334d] bg-[#101b2d] hover:border-[#00d4ff]/40 transition-colors">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4a6a8a]">Acesso rápido</p>
              <h2 className="mt-2 text-lg font-black text-white">{item.label}</h2>
              <p className="mt-2 text-sm text-[#7f9bb8]">Abrir cadastro operacional</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
