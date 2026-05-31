"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Header from "@/components/Header";

type ModuleKind = "monitoramento" | "cadastro" | "alerta" | "relatorio";

const MODULES: Record<string, { title: string; kind: ModuleKind; endpoints: string[]; sgpa?: string }> = {
  "comando-online": { title: "Comando Online", kind: "monitoramento", endpoints: ["/api/comando-online"], sgpa: "#!/details/online-command" },
  "mensagem-online": { title: "Mensagem Online", kind: "alerta", endpoints: ["/api/mensagens/online"] },
  "frentes-trabalho": { title: "Frentes de Trabalho", kind: "cadastro", endpoints: ["/api/frentes-trabalho"] },
  equipes: { title: "Equipes", kind: "cadastro", endpoints: ["/api/equipes"], sgpa: "#!/settings/teams" },
  "realizacao-operacional": { title: "Realização Operacional", kind: "relatorio", endpoints: ["/api/relatorios/realizacao-operacional"], sgpa: "#!/details/PBIoperationalRealizationV4Report" },
  "area-trabalhada": { title: "Área Trabalhada", kind: "relatorio", endpoints: ["/api/relatorios/area-trabalhada"], sgpa: "#!/details/PBIworkingAreaV4Report" },
  eficiencia: { title: "Eficiência", kind: "relatorio", endpoints: ["/api/relatorios/eficiencia"], sgpa: "#!/details/PBIEfficiencyCOAReport" },
  "variaveis-operacionais": { title: "Variáveis Operacionais", kind: "relatorio", endpoints: ["/api/relatorios/variaveis-operacionais"], sgpa: "#!/details/PBIoperationalVariablesReportCOA" },
  "clima-operacao": { title: "Clima x Operação", kind: "relatorio", endpoints: ["/api/relatorios/clima-operacao"], sgpa: "#!/details/PBIclimateOperationCaneReport" },
  benchmark: { title: "Benchmark", kind: "relatorio", endpoints: ["/api/relatorios/benchmark"], sgpa: "#!/details/benchmark" },
};

const KIND_LABEL: Record<ModuleKind, string> = {
  monitoramento: "Módulo de monitoramento",
  cadastro: "Módulo de cadastro operacional",
  alerta: "Módulo de alerta e inconsistência",
  relatorio: "Módulo de relatório gerencial",
};

interface ApiStatus {
  online: boolean;
  status?: string;
  fonte?: string;
  integracao?: string;
  prioridade?: string;
  ultimaAtualizacao?: string;
}

export default function SgpaModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [apiStatuses, setApiStatuses] = useState<Record<string, ApiStatus>>({});

  useEffect(() => {
    params.then(p => setSlug(p.slug));
  }, [params]);

  const mod = useMemo(() => slug ? MODULES[slug] || { title: "Módulo SGPA", kind: "monitoramento" as const, endpoints: [] } : null, [slug]);

  const checkEndpoints = useCallback(async () => {
    if (!mod) return;
    const results: Record<string, ApiStatus> = {};
    for (const ep of mod.endpoints) {
      try {
        const r = await fetch(ep, { cache: "no-store", signal: AbortSignal.timeout(5000) });
        if (r.ok) {
          const data = await r.json();
          results[ep] = {
            online: true,
            status: data.status || "OK",
            fonte: data.fonte,
            integracao: data.integracao,
            prioridade: data.prioridade,
            ultimaAtualizacao: data.ultimaAtualizacao,
          };
        } else {
          results[ep] = { online: false };
        }
      } catch {
        results[ep] = { online: false };
      }
    }
    setApiStatuses(results);
  }, [mod]);

  useEffect(() => {
    if (mod && mod.endpoints.length > 0) {
      checkEndpoints();
      const id = setInterval(checkEndpoints, 15000);
      return () => clearInterval(id);
    }
  }, [mod, checkEndpoints]);

  if (!mod) {
    return <div className="p-6 text-[#4a6a8a]">Carregando...</div>;
  }

  const sgpaUrl = mod.sgpa ? `https://sja.saas-solinftec.com/${mod.sgpa}` : null;

  // Use live data from the first endpoint if available
  const firstEp = mod.endpoints[0];
  const liveData = firstEp ? apiStatuses[firstEp] : null;

  return (
    <>
      <Header title={mod.title} sub={KIND_LABEL[mod.kind]} />
      <main className="p-6 space-y-6">
        <section className="grid md:grid-cols-4 gap-4">
          <Metric
            label="Status"
            value={liveData?.online ? (liveData.status || "OK") : "Pendente"}
            tone={liveData?.online ? "green" : "yellow"}
          />
          <Metric
            label="Fonte"
            value={liveData?.fonte || "SGPA / SILO OPS"}
            tone="blue"
          />
          <Metric
            label="Integração"
            value={liveData?.integracao || "Planejada"}
            tone={liveData?.online ? "green" : "default"}
          />
          <Metric
            label="Prioridade"
            value={liveData?.prioridade || (mod.kind === "relatorio" ? "Alta" : "Média")}
            tone={mod.kind === "relatorio" ? "green" : "default"}
          />
        </section>

        <section className="card-p space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[#c8d8e8] font-semibold">Filtros padrão SGPA</p>
              <p className="text-[#4a6a8a] text-xs mt-1">Estrutura visual pronta para conectar quando o backend expor os dados.</p>
            </div>
            {sgpaUrl && <a className="btn-primary text-center" href={sgpaUrl} target="_blank" rel="noreferrer">Abrir no SGPA</a>}
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {["Unidade", "Equipe", "Operador", "Processo", "Modelo", "Equipamento", "Operação", "Período"].map(label => (
              <label key={label} className="space-y-1">
                <span className="text-[#4a6a8a] text-[10px] uppercase font-semibold">{label}</span>
                <input className="sil-input" placeholder="Todos" readOnly />
              </label>
            ))}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e2d3d]">
            <p className="text-[#c8d8e8] font-semibold">Contrato de integração</p>
          </div>
          <div className="divide-y divide-[#1e2d3d]/50">
            {mod.endpoints.map(endpoint => {
              const st = apiStatuses[endpoint];
              return (
                <div key={endpoint} className="grid md:grid-cols-[1fr_140px_120px] gap-3 px-5 py-3 text-xs">
                  <span className="font-mono text-[#c8d8e8]">{endpoint}</span>
                  {st?.online ? (
                    <span className="text-[#00e676] font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-pulse" />
                      API Online
                    </span>
                  ) : (
                    <span className="text-[#ffab00]">aguardando API</span>
                  )}
                  <span className="text-[#4a6a8a]">não quebra UI</span>
                </div>
              );
            })}
          </div>
        </section>

        {liveData?.ultimaAtualizacao && (
          <p className="text-[#4a6a8a] text-[10px] text-right">
            Última verificação: {new Date(liveData.ultimaAtualizacao).toLocaleString("pt-BR")}
          </p>
        )}
      </main>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "blue" | "green" | "yellow" | "default" }) {
  const color = tone === "blue" ? "text-[#00d4ff]" : tone === "green" ? "text-[#00e676]" : tone === "yellow" ? "text-[#ffab00]" : "text-[#c8d8e8]";
  return (
    <div className="card-p">
      <p className="text-[#4a6a8a] text-xs uppercase font-semibold tracking-wider">{label}</p>
      <p className={`mt-2 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
