import EquipmentClassificationManager from "@/components/equipamentos/EquipmentClassificationManager";

export default function ModelosEquipamentoPage() {
  return (
    <EquipmentClassificationManager
      config={{
        kind: "modelos",
        title: "Modelos de Equipamento",
        subtitle: "Modelos vinculados ao cadastro mestre e aos filtros operacionais.",
        endpoint: "/api/admin/equipamentos/modelos",
        seedHint: "Seed inicial vazia; a lista nasce do cadastro real.",
        fields: [
          { key: "nome", label: "Nome", type: "text" },
          { key: "fabricante", label: "Fabricante", type: "text" },
          { key: "tipo_id", label: "Tipo vinculado", type: "text" },
          { key: "descricao", label: "Descricao", type: "textarea" },
          { key: "ativo", label: "Ativo", type: "checkbox" },
        ],
        columns: [
          { key: "nome", label: "Nome" },
          { key: "fabricante", label: "Fabricante" },
          { key: "tipo_id", label: "Tipo" },
          { key: "ativo", label: "Ativo" },
        ],
      }}
    />
  );
}
