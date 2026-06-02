"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ApiErr from "@/components/ApiErr";
import Badge from "@/components/Badge";
import Empty from "@/components/Empty";
import { api, fmtDate, timeAgo, getDynamicPresence, type Equipamento } from "@/lib/api";

export default function EquipmentTrailIndexPage() {
  const [equip, setEquip] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const res = await api.equipamentos();
      if (!active) return;
      if (res.ok) {
        setEquip(res.data);
        setError(null);
      } else {
        setEquip([]);
        setError(res.error);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(
    () =>
      equip.reduce(
        (acc, item) => {
          acc[getDynamicPresence(item.last_seen)] += 1;
          return acc;
        },
        { ONLINE: 0, INSTAVEL: 0, OFFLINE: 0 },
      ),
    [equip],
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Rastro dos Equipamentos" sub="Acesso direto ao histórico GPS individual por trator" />
      <main className="p-6 space-y-5">
        {error && <ApiErr label="/api/equipamentos/status" msg={error} />}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="card-p"><p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">Total</p><p className="text-white text-2xl font-black mt-1">{equip.length}</p></div>
          <div className="card-p"><p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">Online</p><p className="text-[#00e676] text-2xl font-black mt-1">{summary.ONLINE}</p></div>
          <div className="card-p"><p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">Instável</p><p className="text-[#ffab00] text-2xl font-black mt-1">{summary.INSTAVEL}</p></div>
          <div className="card-p"><p className="text-[#4a6a8a] text-[10px] uppercase font-semibold tracking-wider">Offline</p><p className="text-[#ff3d57] text-2xl font-black mt-1">{summary.OFFLINE}</p></div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card-p h-48 animate-pulse bg-[#101b2d]/50" />)}</div>
        ) : equip.length === 0 ? (
          <Empty title="Nenhum equipamento localizado" sub="Aguarde a sincronização do status operacional para liberar o rastro individual." />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {equip.map((item) => {
              const presence = getDynamicPresence(item.last_seen);
              return (
                <article key={item.trator_id} className="card-p space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-white font-black text-lg">{item.trator_id}</h3>
                      <p className="text-[#4a6a8a] text-xs uppercase tracking-widest font-black">Último sinal {timeAgo(item.last_seen)}</p>
                    </div>
                    <Badge label={presence} variant={presence === "ONLINE" ? "online" : presence === "INSTAVEL" ? "instavel" : "offline"} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Field label="Presença" value={item.presence || "--"} />
                    <Field label="Estado operacional" value={item.estado_operacional || item.status || "--"} />
                    <Field label="Último sinal" value={fmtDate(item.last_seen)} />
                    <Field label="GPS" value={item.latitude !== null && item.longitude !== null ? `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}` : "--"} />
                  </div>
                  <Link href={`/equipamentos/${item.trator_id}/rastro`} className="btn-primary w-full justify-center inline-flex">
                    Ver rastro
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#1f334d] bg-[#0d1420] p-3">
      <p className="text-[#4a6a8a] text-[10px] uppercase font-black tracking-widest">{label}</p>
      <p className="text-[#c8d8e8] font-mono text-sm mt-1 truncate">{value}</p>
    </div>
  );
}
