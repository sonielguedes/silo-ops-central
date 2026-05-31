"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Badge from "@/components/Badge";
import ApiErr from "@/components/ApiErr";
import Empty from "@/components/Empty";
import { api, type Equipamento } from "@/lib/api";
import {
  ALL_ICONS,
  getIconForModel,
  readIconConfig,
  renderEquipmentIconSvg,
  saveIconConfig,
  type EquipmentIconId,
} from "@/lib/equipment-icons";

export default function EquipmentIconsPage() {
  const [equip, setEquip] = useState<Equipamento[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<Record<string, EquipmentIconId>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.equipamentos();
    if (r.ok) {
      setEquip(r.data);
      setErr(null);
    } else {
      setErr(r.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setConfig(readIconConfig());
    load();
  }, [load]);

  const models = useMemo(() => {
    const byModel = new Map<string, Equipamento[]>();
    equip.forEach(eq => {
      const id = (eq.trator_id || "").toUpperCase();
      const prefixMatch = id.match(/^[A-Z]+/);
      const model = prefixMatch ? prefixMatch[0] : "OUTROS";
      byModel.set(model, [...(byModel.get(model) || []), eq]);
    });
    return Array.from(byModel.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [equip]);

  const updateIcon = (model: string, icon: EquipmentIconId) => {
    const next = { ...config, [model]: icon };
    setConfig(next);
    saveIconConfig(next);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Configuração de Frota" sub="Mapeamento visual de categorias e ícones do mapa" />

      <main className="p-8 space-y-8 flex-1 animate-fade-in max-w-[1920px] mx-auto w-full">

        {/* Banner de Ajuda */}
        <div className="card-p bg-gradient-to-r from-[#00d4ff]/5 to-transparent border-[#1f334d]">
            <div className="flex items-start gap-6">
                <div className="w-14 h-14 rounded-2xl bg-[#0d1420] border border-[#1f334d] flex items-center justify-center text-[#00d4ff] shadow-xl">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Padronização Visual SILO OPS</h3>
                    <p className="text-[#4a6a8a] text-xs font-bold mt-2 leading-relaxed max-w-2xl opacity-80">
                        O sistema identifica automaticamente a frota pelo prefixo da matrícula. Aqui você define como cada categoria (Tratores, Colhedoras, Apoio) deve aparecer no Mapa Operacional.
                    </p>
                </div>
            </div>
        </div>

        {err && <ApiErr label="FROTA CONFIG" msg={err} />}

        {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
               {[1,2,3].map(i => <div key={i} className="card-p h-40 animate-pulse bg-[#101b2d]/50" />)}
            </div>
        ) : models.length === 0 ? (
            <Empty icon="🚜" title="Nenhum prefixo identificado" sub="Cadastre equipamentos para habilitar a configuração visual." />
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {models.map(([model, rows]) => {
                  const icon = getIconForModel(model, config);
                  return (
                    <div key={model} className="card-p flex flex-col justify-between group hover:border-[#00d4ff]/30 transition-all">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h4 className="text-white font-black text-lg tracking-tighter uppercase">{model}</h4>
                                <p className="text-[#4a6a8a] text-[10px] font-black uppercase tracking-widest">Categoria de Frota</p>
                            </div>
                            <div
                                style={{ backgroundColor: icon.color }}
                                className="w-16 h-16 rounded-[22px] border-4 border-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500"
                                dangerouslySetInnerHTML={{ __html: renderEquipmentIconSvg(icon.svgPath, 32) }}
                            />
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="bg-[#0d1420] p-4 rounded-2xl border border-[#1f334d] shadow-inner">
                                <span className="text-[#4a6a8a] text-[9px] font-black uppercase tracking-widest block mb-2 opacity-60">Selecione o Ícone do Mapa</span>
                                <select
                                    className="sil-input h-11 text-xs font-black uppercase tracking-wider"
                                    value={config[model] || ""}
                                    onChange={e => updateIcon(model, e.target.value as EquipmentIconId)}
                                >
                                    <option value="">AUTO (PADRÃO TRATOR)</option>
                                    {ALL_ICONS.map(option => (
                                        <option key={option.id} value={option.id}>{option.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center justify-between px-2">
                                <span className="text-[#4a6a8a] text-[10px] font-bold uppercase truncate max-w-[150px]">
                                    {rows.slice(0, 3).map(eq => eq.trator_id).join(", ")} {rows.length > 3 ? `+ ${rows.length - 3}` : ""}
                                </span>
                                <Badge label={icon.label} variant="info" dot={false} />
                            </div>
                        </div>
                    </div>
                  );
                })}
            </div>
        )}
      </main>

      <footer className="p-10 text-center opacity-40">
        <p className="text-[#4a6a8a] text-[11px] font-black uppercase tracking-[0.4em]">SILO OPS Visual Identity System &mdash; &copy; 2024</p>
      </footer>
    </div>
  );
}
