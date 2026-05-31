"use client";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Badge from "@/components/Badge";
import { IS_DEMO } from "@/lib/app-env";

interface OpLimits {
  operacao: string;
  rpmMin: number;
  rpmMax: number;
  velMin: number;
  velMax: number;
  profundidadeAlvo: number;
}

const DEFAULT_CONFIGS: OpLimits[] = [
  { operacao: "Subsolagem", rpmMin: 1600, rpmMax: 2100, velMin: 4.5, velMax: 7.0, profundidadeAlvo: 35 },
  { operacao: "Aração", rpmMin: 1500, rpmMax: 1900, velMin: 5.0, velMax: 8.0, profundidadeAlvo: 25 },
  { operacao: "Gradagem", rpmMin: 1400, rpmMax: 2000, velMin: 6.0, velMax: 10.0, profundidadeAlvo: 15 },
  { operacao: "Nivelamento", rpmMin: 1300, rpmMax: 1800, velMin: 7.0, velMax: 12.0, profundidadeAlvo: 10 },
];

export default function ConfigOpPage() {
  const [configs, setConfigs] = useState<OpLimits[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("sil_config_operacionais");
    if (saved) {
      try {
        setConfigs(JSON.parse(saved));
      } catch {
        setConfigs(DEFAULT_CONFIGS);
      }
    } else {
      setConfigs(DEFAULT_CONFIGS);
    }
  }, []);

  const handleSave = () => {
    if (IS_DEMO) return;
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem("sil_config_operacionais", JSON.stringify(configs));
      setSaving(false);
      setToast("Configurações operacionais salvas com sucesso!");
      setTimeout(() => setToast(null), 3000);
    }, 800);
  };

  const updateField = (index: number, key: keyof OpLimits, value: number) => {
    const updated = [...configs];
    updated[index] = { ...updated[index], [key]: value };
    setConfigs(updated);
  };

  return (
    <>
      <Header title="Configurações Operacionais" sub="Parâmetros técnicos e limites de trabalho por operação" />
      
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border border-[#00e676]/40 bg-[#00e676]/10 text-[#00e676] text-xs font-semibold shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}

      <main className="p-6 space-y-6">
        {/* Banner Aguardando Integração */}
        <div className="card-p border border-[#ffab00]/20 bg-[#ffab00]/5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-[#ffab00] text-xl font-bold leading-none mt-0.5">!</span>
            <div>
              <p className="text-[#ffab00] font-semibold text-sm">Aguardando Integração com o Backend</p>
              <p className="text-[#4a6a8a] text-xs mt-1">
                Os parâmetros abaixo estão rodando em modo de simulação local. Eles definem as regras para os alertas de telemetria enviados pelos tablets das máquinas.
              </p>
              <p className="text-[#4a6a8a] text-[10px] font-mono mt-2">API: POST /api/configuracoes/limites · GET /api/configuracoes/limites</p>
            </div>
          </div>
          <Badge label="Demonstração" variant="instavel" dot />
        </div>

        {/* Form Grid */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e2d3d] flex justify-between items-center bg-[#111820]/45">
            <p className="text-[#c8d8e8] font-semibold text-sm">Limites por Operação Agrícola</p>
            <span className="text-[#4a6a8a] text-xs">Unidades: RPM, km/h, cm</span>
          </div>

          <div className="divide-y divide-[#1e2d3d]/50 bg-[#161f2a]">
            {configs.map((cfg, index) => (
              <div key={cfg.operacao} className="p-5 grid md:grid-cols-6 gap-4 items-center hover:bg-[#1e2d3d]/10 transition-colors">
                <div className="md:col-span-1">
                  <p className="text-[#c8d8e8] font-bold text-sm">{cfg.operacao}</p>
                  <p className="text-[#4a6a8a] text-xs">Preparo de Solo</p>
                </div>
                
                <div className="grid grid-cols-2 md:col-span-5 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#4a6a8a] uppercase font-semibold">RPM Mínimo</label>
                    <input
                      type="number"
                      value={cfg.rpmMin}
                      onChange={(e) => updateField(index, "rpmMin", Number(e.target.value))}
                      className="sil-input text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#4a6a8a] uppercase font-semibold">RPM Máximo</label>
                    <input
                      type="number"
                      value={cfg.rpmMax}
                      onChange={(e) => updateField(index, "rpmMax", Number(e.target.value))}
                      className="sil-input text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#4a6a8a] uppercase font-semibold">Vel. Mínima (km/h)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cfg.velMin}
                      onChange={(e) => updateField(index, "velMin", Number(e.target.value))}
                      className="sil-input text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#4a6a8a] uppercase font-semibold">Vel. Máxima (km/h)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cfg.velMax}
                      onChange={(e) => updateField(index, "velMax", Number(e.target.value))}
                      className="sil-input text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <label className="text-[10px] text-[#4a6a8a] uppercase font-semibold">Prof. Alvo (cm)</label>
                    <input
                      type="number"
                      value={cfg.profundidadeAlvo}
                      onChange={(e) => updateField(index, "profundidadeAlvo", Number(e.target.value))}
                      className="sil-input text-xs font-mono border-[#00d4ff]/20 text-[#00d4ff]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-4 border-t border-[#1e2d3d] bg-[#111820]/45 flex justify-end gap-3">
            <button
              onClick={() => setConfigs(DEFAULT_CONFIGS)}
              className="btn-ghost"
              disabled={saving || IS_DEMO}
            >
              Restaurar Padrões
            </button>
            <button
              onClick={handleSave}
              className="btn-primary flex items-center gap-2"
              disabled={saving || IS_DEMO}
            >
              {IS_DEMO ? "Bloqueado" : saving ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
