import EquipmentClassificationManager from "@/components/equipamentos/EquipmentClassificationManager";

export default function TiposEquipamentoPage() {
  return (
    <EquipmentClassificationManager
      config={{
        kind: "tipos",
        title: "Tipos de Equipamento",
        subtitle: "Cadastro tecnico de tipos usados no mapa, rastro e relatórios.",
        endpoint: "/api/admin/equipamentos/tipos",
        seedHint: "Seed inicial: TRATOR, COLHEDORA, TRANSBORDO, CAMINHAO e IMPLEMENTO.",
        fields: [
          { key: "codigo", label: "Codigo", type: "text" },
          { key: "nome", label: "Nome", type: "text" },
          { key: "descricao", label: "Descricao", type: "textarea" },
          { key: "ativo", label: "Ativo", type: "checkbox" },
        ],
        columns: [
          { key: "codigo", label: "Codigo" },
          { key: "nome", label: "Nome" },
          { key: "descricao", label: "Descricao" },
          { key: "ativo", label: "Ativo" },
        ],
      }}
    />
  );
}
