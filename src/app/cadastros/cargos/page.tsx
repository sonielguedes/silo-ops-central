import WorkforceManager from "@/components/workforce/WorkforceManager";

export default function CargosPage() {
  return (
    <WorkforceManager
      config={{
        title: "Cargos",
        sub: "Cadastro funcional da estrutura de pessoas.",
        endpoint: "/api/admin/cargos",
        searchKeys: ["codigo", "nome", "descricao"],
        statusKey: "ativo",
        statusValues: ["TRUE", "FALSE"],
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
