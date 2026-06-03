import EquipmentClassificationManager from "@/components/equipamentos/EquipmentClassificationManager";

export default function PerfisEquipamentoPage() {
  return (
    <EquipmentClassificationManager
      config={{
        kind: "perfis",
        title: "Perfis de Equipamento",
        subtitle: "Regras e capacidades que guiam apontamento e operação.",
        endpoint: "/api/admin/equipamentos/perfis",
        seedHint: "Seed inicial vazia; capacidades ficam em lista separada por virgula.",
        fields: [
          { key: "nome", label: "Nome", type: "text" },
          { key: "descricao", label: "Descricao", type: "textarea" },
          { key: "capacidades", label: "Capacidades", type: "array", placeholder: "ex: horimetro, odometro, area" },
          { key: "ativo", label: "Ativo", type: "checkbox" },
        ],
        columns: [
          { key: "nome", label: "Nome" },
          { key: "descricao", label: "Descricao" },
          { key: "capacidades", label: "Capacidades" },
          { key: "ativo", label: "Ativo" },
        ],
      }}
    />
  );
}
