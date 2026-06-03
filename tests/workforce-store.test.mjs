import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const storePath = new URL("../src/lib/workforce-store.ts", import.meta.url);
const storeFsPath = fileURLToPath(storePath);

function transpileTs(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
}

async function loadStoreModule(jsonPath) {
  const authShim = `
    export function isAdminGlobal(profile) { return profile?.role === "ADMIN_GLOBAL"; }
    export function canAccessEmpresa(profile, empresaId) {
      if (!profile) return false;
      if (isAdminGlobal(profile)) return true;
      return profile.empresa_id === empresaId;
    }
  `;
  const authUrl = `data:text/javascript;base64,${Buffer.from(transpileTs(authShim)).toString("base64")}`;
  const source = readFileSync(storeFsPath, "utf8").replace(/from "@\/lib\/auth"/g, `from "${authUrl}"`);
  const storeUrl = `data:text/javascript;base64,${Buffer.from(transpileTs(source)).toString("base64")}`;
  process.env.WORKFORCE_STORE_PATH = jsonPath;
  return import(`${storeUrl}#${Buffer.from(jsonPath).toString("base64")}`);
}

test("workforce store seeds and enforces tenant-aware uniqueness", async () => {
  const dir = mkdtempSync(join(tmpdir(), "silo-workforce-"));
  const jsonPath = join(dir, "workforce.json");
  try {
    const mod = await loadStoreModule(jsonPath);
    const readFn = mod.readWorkforceStore;
    const upsertFn = mod.upsertWorkforce;
    const listFn = mod.listWorkforce;

    const initial = await readFn();
    assert.ok(initial.cargos.length >= 4);
    assert.ok(initial.equipes.length >= 3);
    assert.ok(initial.operadores.some((item) => item.matricula === "0001"));

    const cargo = await upsertFn("cargos", {
      codigo: "OPERADOR_COLHEDORA",
      nome: "Operador Colhedora",
      descricao: "Cargo de operacao",
      ativo: true,
      empresa_id: "SILOOPS",
    }, { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS", usinas: ["*"], unidades: ["*"] });
    assert.equal(cargo.codigo, "OPERADOR_COLHEDORA");

    const eq = await upsertFn("equipes", {
      codigo: "EQUIPE_X",
      nome: "Equipe X",
      descricao: "Nova equipe",
      turno_padrao: "DIA",
      ativo: true,
      empresa_id: "SILOOPS",
    }, { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS", usinas: ["*"], unidades: ["*"] });
    assert.equal(eq.codigo, "EQUIPE_X");

    const op = await upsertFn("operadores", {
      matricula: "1001",
      nome: "Operador 1001",
      cpf: "",
      telefone: "",
      cargo_id: cargo.id,
      equipe_id: eq.id,
      status: "ATIVO",
      habilitacoes: ["B"],
      observacoes: "teste",
      empresa_id: "SILOOPS",
      usina_id: "USINA_PADRAO",
      unidade_id: "UNIDADE_PADRAO",
    }, { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS", usinas: ["*"], unidades: ["*"] });
    assert.equal(op.matricula, "1001");

    const listed = await listFn("operadores", { role: "VIEWER", empresa_id: "SILOOPS", usinas: ["*"], unidades: ["*"] });
    assert.ok(listed.some((item) => item.matricula === "1001"));

    await assert.rejects(
      () => upsertFn("operadores", {
        matricula: "1001",
        nome: "Duplicado",
        cargo_id: cargo.id,
        equipe_id: eq.id,
        status: "ATIVO",
        empresa_id: "SILOOPS",
        usina_id: "USINA_PADRAO",
        unidade_id: "UNIDADE_PADRAO",
      }, { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS", usinas: ["*"], unidades: ["*"] }),
      /matricula deve ser unica/i,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
