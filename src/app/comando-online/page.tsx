import OperationalRegistryShell from "@/components/OperationalRegistryShell";

export default function ComandoOnlinePage() {
  return (
    <OperationalRegistryShell
      title="Comando Online"
      sub="Acesso preparado para ações remotas e integrações de campo."
      module="telemetria_eventos"
      endpoints={["POST /api/comando-online"]}
      note="A rota de API permanece disponível; esta página é o placeholder visual do módulo."
    />
  );
}
