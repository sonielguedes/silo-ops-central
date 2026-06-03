import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadModule() {
  const source = readFileSync(new URL("../src/lib/equipment-type.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

test("equipment type normalizer uses explicit field before inference", async () => {
  const mod = await loadModule();
  assert.equal(mod.normalizeEquipmentType({ tipo_equipamento: "transbordo" }), "TRANSBORDO");
  assert.equal(mod.normalizeEquipmentType({ tipo: "carregadeira", nome: "Trator T01" }), "CARREGADEIRA");
});

test("equipment type normalizer infers from model/name/description and prefix", async () => {
  const mod = await loadModule();
  assert.equal(mod.normalizeEquipmentType({ nome: "Colhedora 9900" }), "COLHEDORA");
  assert.equal(mod.normalizeEquipmentType({ modelo: "Caminhão de apoio" }), "CAMINHAO");
  assert.equal(mod.normalizeEquipmentType({ descricao: "Comboio abastecimento" }), "COMBOIO");
  assert.equal(mod.normalizeEquipmentType({ trator_id: "TB12" }), "TRANSBORDO");
  assert.equal(mod.normalizeEquipmentType({ trator_id: "T01" }), "TRATOR");
});

test("equipment type normalizer falls back to OUTRO", async () => {
  const mod = await loadModule();
  assert.equal(mod.normalizeEquipmentType({ nome: "Equipamento sem pista" }), "OUTRO");
});

