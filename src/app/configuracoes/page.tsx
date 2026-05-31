"use client";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Badge from "@/components/Badge";
import { IS_DEMO } from "@/lib/app-env";

export default function ConfiguracoesPage() {
  const [apiUrl, setApiUrl] = useState("http://localhost:3000");
  const [polling, setPolling] = useState("10");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUrl = localStorage.getItem("sil_api_base_url");
      const savedPolling = localStorage.getItem("sil_polling_interval");
      if (savedUrl) setApiUrl(savedUrl);
      if (savedPolling) setPolling(savedPolling);
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (IS_DEMO) return;
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem("sil_api_base_url", apiUrl.trim());
      localStorage.setItem("sil_polling_interval", polling.trim());
      setSaving(false);
      setToast("Configurações do sistema salvas com sucesso!");
      setTimeout(() => setToast(null), 3000);
      
      // Força recarregamento leve se mudar IP para renovar conexões
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("storage"));
      }
    }, 800);
  };

  return (
    <>
      <Header title="Configurações" sub="Parâmetros globais, comunicação e auditoria de endpoints SILO OPS" />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border border-[#00e676]/40 bg-[#00e676]/10 text-[#00e676] text-xs font-semibold shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}

      <main className="p-6 space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Conectividade */}
            <div className="card-p space-y-4">
              <p className="text-[#c8d8e8] font-semibold border-b border-[#1e2d3d] pb-3 text-sm">Conectividade & Comunicação</p>
              
              <div className="space-y-1.5">
                <p className="text-[#4a6a8a] text-xs uppercase tracking-wider font-semibold">API Base URL</p>
                <input 
                  className="sil-input text-xs font-mono" 
                  value={apiUrl} 
                  onChange={e => setApiUrl(e.target.value)} 
                  required
                  placeholder="ex: http://localhost:3000"
                />
                <p className="text-[#4a6a8a] text-[10px]">Aponta para a VPS central do SILO OPS (Padrão: http://localhost:3000)</p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[#4a6a8a] text-xs uppercase tracking-wider font-semibold">Frequência de Polling (segundos)</p>
                <input 
                  className="sil-input text-xs font-mono" 
                  type="number" 
                  min="2"
                  max="120"
                  value={polling} 
                  onChange={e => setPolling(e.target.value)} 
                  required
                />
                <p className="text-[#4a6a8a] text-[10px]">Intervalo de tempo para atualização do dashboard e tratores (Padrão: 10s)</p>
              </div>

              <div className="pt-2 flex justify-end">
                <button type="submit" disabled={saving || IS_DEMO} className="btn-primary">
                  {IS_DEMO ? "Bloqueado" : saving ? "Salvando..." : "Salvar Conexão"}
                </button>
              </div>
            </div>

            {/* Informações do Sistema */}
            <div className="card-p space-y-4">
              <p className="text-[#c8d8e8] font-semibold border-b border-[#1e2d3d] pb-3 text-sm">Propriedades da Central SILO OPS</p>
              <div className="space-y-3">
                {[
                  ["Versão do Sistema", "SILO OPS v0.1.0-enterprise"],
                  ["Next.js Framework", "v15.3.2 (App Router)"],
                  ["Aparência / Estilos", "Tailwind CSS + Vanilla CSS (Industrial Dark)"],
                  ["Protocolo Mensageria", "MQTT broker:1883 over WebSocket"],
                  ["Servidor Principal", "ambiente configurável"],
                  ["Ambiente Técnico", "Produção Vercel Client (MVP)"]
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-xs items-center">
                    <span className="text-[#4a6a8a]">{label}</span>
                    <span className="text-[#c8d8e8] font-mono font-medium">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>

        {/* Auditoria de Endpoints */}
        <div className="card-p border border-[#1e2d3d]">
          <p className="text-[#c8d8e8] font-semibold mb-4 text-sm">Mapeamento de Integração de Módulos</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#4a6a8a] text-left border-b border-[#1e2d3d] uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Módulo Central</th>
                  <th className="pb-3">Endpoint Remoto</th>
                  <th className="pb-3 text-right">Status da Conexão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2d3d]/30 bg-[#161f2a]/20">
                {[
                  ["1. Dashboard Geral", "/health", "real"],
                  ["2. Equipamentos / Tratores", "/api/equipamentos/status", "real"],
                  ["3. Operadores / Matrículas", "/api/operadores", "real"],
                  ["4. Operações (Ativas)", "/api/operacoes/ativas", "real"],
                  ["5. Eventos Operacionais", "/api/eventos/recentes", "mock-db"],
                  ["6. Telemetria (RPM/Profundidade)", "/api/telemetria/:tratorId/realtime", "mock-sim"],
                  ["7. Alertas de Desvio", "/api/alertas", "mock-sim"],
                  ["8. Sincronização / Outbox", "/api/outbox/queue", "mock-sim"],
                  ["9. Configurações Operacionais", "/api/configuracoes/limites", "mock-sim"],
                  ["10. Fazendas e Talhões", "/api/fazendas", "mock-sim"],
                  ["11. Mapa Operacional", "/api/mapa/coordenadas", "real"],
                  ["12. Relatórios Consolidados", "/api/relatorios/export", "mock-sim"],
                  ["13. Auditoria / Logs Técnicos", "/api/auditoria/logs", "mock-sim"],
                ].map(([m, e, s]) => (
                  <tr key={m} className="hover:bg-[#1e2d3d]/10 transition-colors">
                    <td className="py-2.5 text-[#c8d8e8] font-medium">{m}</td>
                    <td className="py-2.5 font-mono text-[#4a6a8a] text-[10px]">{e}</td>
                    <td className="py-2.5 text-right">
                      {s === "real" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-[#00e676]/30 bg-[#00e676]/10 text-[#00e676]">
                          INTEGRADO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-[#ffab00]/30 bg-[#ffab00]/10 text-[#ffab00]">
                          MOCK MÓDULO
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
