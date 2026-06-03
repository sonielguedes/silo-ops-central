import EquipmentClassificationManager from "@/components/equipamentos/EquipmentClassificationManager";

export default function EstadosOperacionaisPage() {
  return (
    <EquipmentClassificationManager
      config={{
        kind: "estados",
        title: "Estados Operacionais",
        subtitle: "Estados reais que alimentam mapa, rastro, timeline e drawer.",
        endpoint: "/api/admin/equipamentos/estados",
        seedHint: "Seed inicial: TRABALHANDO, PARADO, PAUSADO, EM_MOVIMENTO, SEM_OPERACAO e DESCONHECIDO.",
        fields: [
          { key: "codigo", label: "Codigo", type: "text" },
          { key: "nome", label: "Nome", type: "text" },
          { key: "descricao", label: "Descricao", type: "textarea" },
          { key: "cor", label: "Cor", type: "color" },
          { key: "bloqueia_operacao", label: "Bloqueia operacao", type: "checkbox" },
          { key: "ativo", label: "Ativo", type: "checkbox" },
        ],
        columns: [
          { key: "codigo", label: "Codigo" },
          { key: "nome", label: "Nome" },
          { key: "cor", label: "Cor" },
          { key: "bloqueia_operacao", label: "Bloqueia" },
          { key: "ativo", label: "Ativo" },
        ],
      }}
    />
  );
}
