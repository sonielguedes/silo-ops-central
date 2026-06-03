import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const storePath = new URL("../src/lib/operation-registry-store.ts", import.meta.url);
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
  const source = readFileSync(storeFsPath, "utf8");
  const storeUrl = `data:text/javascript;base64,${Buffer.from(transpileTs(source)).toString("base64")}`;
  process.env.OPERATION_REGISTRY_STORE_PATH = jsonPath;
  return import(`${storeUrl}#${Buffer.from(jsonPath).toString("base64")}`);
}

test("operation registry store seeds and handles CRUD", async () => {
  const dir = mkdtempSync(join(tmpdir(), "silo-op-registry-"));
  const jsonPath = join(dir, "operation-registry.json");
  try {
    const mod = await loadStoreModule(jsonPath);
    const readFn = mod.readOperationRegistryStore;
    const upsertOpFn = mod.upsertOperacao;
    const upsertPaFn = mod.upsertParada;

    const initial = await readFn();
    assert.ok(initial.operacoes.length >= 6, "Devia ter operações de seed");
    assert.ok(initial.paradas.length >= 7, "Devia ter paradas de seed");
    assert.ok(initial.operacoes.some(o => o.codigo === "PLANTIO"));
    assert.ok(initial.paradas.some(p => p.codigo === "MANUTENCAO"));

    const op = await upsertOpFn({
      codigo: "TESTE_OP",
      nome: "Operação Teste",
      empresa_id: "SILOOPS",
      usina_id: "U1",
      unidade_id: "UN1"
    });
    assert.equal(op.codigo, "TESTE_OP");

    const pa = await upsertPaFn({
      codigo: "TESTE_PA",
      nome: "Parada Teste",
      empresa_id: "SILOOPS",
      usina_id: "U1",
      unidade_id: "UN1"
    });
    assert.equal(pa.codigo, "TESTE_PA");

    // Duplicate code check
    await assert.rejects(
      () => upsertOpFn({
        codigo: "TESTE_OP",
        nome: "Duplicado",
        empresa_id: "SILOOPS",
        usina_id: "U1",
        unidade_id: "UN1"
      }),
      /Código já existe/i
    );

    // Edit
    const updated = await upsertOpFn({
      id: op.id,
      codigo: "TESTE_OP",
      nome: "Operação Teste Editada",
      empresa_id: "SILOOPS",
      usina_id: "U1",
      unidade_id: "UN1"
    });
    assert.equal(updated.nome, "Operação Teste Editada");

    const final = await readFn();
    assert.ok(final.operacoes.some(o => o.nome === "Operação Teste Editada"));

  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
