"use client";
import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const MapaClient = nextDynamic(() => import("./MapaClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-[#07111f] text-[#4a6a8a] font-mono text-xs">
      Carregando mapa operacional...
    </div>
  ),
});

export default function Page() {
  return <MapaClient />;
}
