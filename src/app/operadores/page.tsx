"use client";
import WorkforceManager from "@/components/workforce/WorkforceManager";

async function loadOptions() {
  const read = async (url: string) => {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(7000) });
    const text = await res.text();
    const parsed = text.trim() ? JSON.parse(text) : [];
    return res.ok && Array.isArray(parsed) ? parsed : [];
  };
  const [cargos, equipes] = await Promise.all([read("/api/admin/cargos"), read("/api/admin/equipes")]);
  const names = (items: Record<string, unknown>[]) => items.map((item) => String(item.codigo || item.nome || "").trim()).filter(Boolean);
  return { cargo_id: names(cargos), equipe_id: names(equipes) };
}

export default function OperadoresPage() {
  return (
    <WorkforceManager
      config={{
        title: "Operadores",
        sub: "Matrículas, cargo e equipe operacional.",
        endpoint: "/api/admin/operadores",
        searchKeys: ["matricula", "nome", "cpf", "telefone", "cargo_id", "equipe_id", "observacoes"],
        statusKey: "status",
        statusValues: ["ATIVO", "INATIVO", "BLOQUEADO", "FERIAS"],
        loadOptions,
        fields: [
          { key: "matricula", label: "Matricula", type: "text" },
          { key: "nome", label: "Nome", type: "text" },
          { key: "cpf", label: "CPF", type: "text" },
          { key: "telefone", label: "Telefone", type: "text" },
          { key: "cargo_id", label: "Cargo", type: "select" },
          { key: "equipe_id", label: "Equipe", type: "select" },
          { key: "status", label: "Status", type: "select", options: ["ATIVO", "INATIVO", "BLOQUEADO", "FERIAS"] },
          { key: "habilitacoes", label: "Habilitacoes", type: "multiselect", placeholder: "A, B, D" },
          { key: "observacoes", label: "Observacoes", type: "textarea" },
        ],
        columns: [
          { key: "matricula", label: "Matricula" },
          { key: "nome", label: "Nome" },
          { key: "cargo_id", label: "Cargo" },
          { key: "equipe_id", label: "Equipe" },
          { key: "status", label: "Status" },
        ],
      }}
    />
  );
}

