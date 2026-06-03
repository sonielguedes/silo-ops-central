import WorkforceManager from "@/components/workforce/WorkforceManager";

export default function EquipesPage() {
  return (
    <WorkforceManager
      config={{
        title: "Equipes",
        sub: "Cadastro de frentes e turnos padrão.",
        endpoint: "/api/admin/equipes",
        searchKeys: ["codigo", "nome", "descricao", "turno_padrao"],
        statusKey: "ativo",
        statusValues: ["TRUE", "FALSE"],
        fields: [
          { key: "codigo", label: "Codigo", type: "text" },
          { key: "nome", label: "Nome", type: "text" },
          { key: "descricao", label: "Descricao", type: "textarea" },
          { key: "turno_padrao", label: "Turno padrao", type: "text" },
          { key: "ativo", label: "Ativo", type: "checkbox" },
        ],
        columns: [
          { key: "codigo", label: "Codigo" },
          { key: "nome", label: "Nome" },
          { key: "turno_padrao", label: "Turno" },
          { key: "ativo", label: "Ativo" },
        ],
      }}
    />
  );
}
