"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import ApiErr from "@/components/ApiErr";
import { api, getPresence, type Equipamento, type OperacaoAtiva } from "@/lib/api";

const STORAGE_KEY = "sil_powerbi_embed_url";

interface State {
  equip: Equipamento[];
  equipErr: string | null;
  ops: OperacaoAtiva[];
  opsErr: string | null;
  loading: boolean;
}

export default function PowerBiPage() {
  const [s, setS] = useState<State>({ equip: [], equipErr: null, ops: [], opsErr: null, loading: true });
  const [embedUrl, setEmbedUrl] = useState("");
  const [draftUrl, setDraftUrl] = useState("");

  const load = useCallback(async () => {
    setS(prev => ({ ...prev, loading: true }));
    const [equip, ops] = await Promise.all([api.equipamentos(), api.operacoesAtivas()]);
    setS({
      equip: equip.ok ? equip.data : [],
      equipErr: equip.ok ? null : equip.error,
      ops: ops.ok ? ops.data : [],
      opsErr: ops.ok ? null : ops.error,
      loading: false,
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || "";
    setEmbedUrl(saved);
    setDraftUrl(saved);
    load();
  }, [load]);

  const metrics = useMemo(() => {
    const total = s.equip.length;
    const online = s.equip.filter(e => getPresence(e.presence) === "ONLINE").length;
    const instavel = s.equip.filter(e => getPresence(e.presence) === "INSTAVEL").length;
    const offline = s.equip.filter(e => getPresence(e.presence) === "OFFLINE").length;
    const gps = s.equip.filter(e => e.latitude !== null && e.longitude !== null).length;
    const bateriaCritica = s.equip.filter(e => e.bateria !== null && e.bateria <= 30).length;
    return { total, online, instavel, offline, gps, bateriaCritica, ops: s.ops.length };
  }, [s.equip, s.ops.length]);

  const saveEmbed = (e: React.FormEvent) => {
    e.preventDefault();
    const next = draftUrl.trim();
    localStorage.setItem(STORAGE_KEY, next);
    setEmbedUrl(next);
  };

  return (
    <>
      <Header title="Power BI" sub="Relatorio executivo da operacao SILO OPS" />
      <main className="p-6 space-y-6">
        {s.equipErr && <ApiErr label="GET /api/equipamentos/status" msg={s.equipErr} />}
        {s.opsErr && <ApiErr label="GET /api/operacoes/ativas" msg={s.opsErr} />}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Frota Monitorada"
            value={metrics.total}
            sub="equipamentos"
            color="blue"
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h4m0 0l3-4h-5v4M13 8h7v2M13 12h5" /></svg>}
          />
          <StatCard
            label="Online"
            value={metrics.online}
            sub="com sinal"
            color="green"
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a9.5 9.5 0 0113.436 0M4.222 9.222a13.5 13.5 0 0115.556 0" /></svg>}
          />
          <StatCard
            label="Instavel"
            value={metrics.instavel}
            sub="atencao"
            color="yellow"
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          />
          <StatCard
            label="Offline"
            value={metrics.offline}
            sub="sem sinal"
            color="red"
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
          />
          <StatCard
            label="Operacoes"
            value={metrics.ops}
            sub="ativas"
            color="blue"
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2d3d]">
              <div>
                <p className="text-[#c8d8e8] font-semibold">Embed Power BI</p>
                <p className="text-[#4a6a8a] text-xs mt-0.5">Use link publico/seguro de incorporacao do relatorio.</p>
              </div>
              {embedUrl && <a href={embedUrl} target="_blank" rel="noreferrer" className="btn-ghost">Abrir</a>}
            </div>

            {embedUrl ? (
              <iframe
                title="Relatorio Power BI SILO OPS"
                src={embedUrl}
                className="w-full h-[560px] bg-[#080d12]"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : (
              <div className="h-[360px] flex items-center justify-center text-center px-6">
                <div>
                  <p className="text-[#c8d8e8] font-semibold">Nenhum relatorio Power BI configurado.</p>
                  <p className="text-[#4a6a8a] text-sm mt-1 max-w-xl">
                    Configure uma URL de embed. Integracao oficial com token exige Azure AD e backend.
                  </p>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <form onSubmit={saveEmbed} className="card-p space-y-3">
              <p className="text-[#c8d8e8] font-semibold text-sm">Configuracao</p>
              <input
                className="sil-input font-mono"
                value={draftUrl}
                onChange={e => setDraftUrl(e.target.value)}
                placeholder="https://app.powerbi.com/reportEmbed?..."
              />
              <button className="btn-primary w-full" type="submit">Salvar Link</button>
            </form>

            <div className="card-p space-y-3">
              <p className="text-[#4a6a8a] text-xs font-semibold uppercase tracking-wider">Indicadores Base</p>
              <Row label="Equipamentos com GPS" value={`${metrics.gps}/${metrics.total}`} />
              <Row label="Bateria critica" value={String(metrics.bateriaCritica)} danger={metrics.bateriaCritica > 0} />
              <Row label="Fonte frota" value={s.equipErr ? "erro" : s.loading ? "carregando" : "online"} />
              <Row label="Fonte operacoes" value={s.opsErr ? "erro" : s.loading ? "carregando" : "online"} />
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#4a6a8a]">{label}</span>
      <span className={danger ? "text-[#ff3d57] font-mono" : "text-[#c8d8e8] font-mono"}>{value}</span>
    </div>
  );
}
