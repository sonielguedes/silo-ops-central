import EquipmentClassificationManager from "@/components/equipamentos/EquipmentClassificationManager";

export default function GruposEquipamentoPage() {
  return (
    <EquipmentClassificationManager
      config={{
        kind: "grupos",
        title: "Grupos de Equipamento",
        subtitle: "Agrupamentos usados para padronizar operação e leitura gerencial.",
        endpoint: "/api/admin/equipamentos/grupos",
        seedHint: "Seed inicial vazia; grupos surgem conforme o uso operacional.",
        fields: [
          { key: "nome", label: "Nome", type: "text" },
          { key: "descricao", label: "Descricao", type: "textarea" },
          { key: "ativo", label: "Ativo", type: "checkbox" },
        ],
        columns: [
          { key: "nome", label: "Nome" },
          { key: "descricao", label: "Descricao" },
          { key: "ativo", label: "Ativo" },
        ],
      }}
    />
  );
}
