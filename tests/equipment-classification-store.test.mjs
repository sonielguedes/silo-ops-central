import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const storePath = new URL("../src/lib/equipment-classification-store.ts", import.meta.url);
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
    export function isAdminGlobal(profile) {
      return profile?.role === "ADMIN_GLOBAL";
    }
    export function canAccessEmpresa(profile, empresaId) {
      if (!profile) return false;
      if (isAdminGlobal(profile)) return true;
      return profile.empresa_id === empresaId;
    }
  `;
  const authUrl = `data:text/javascript;base64,${Buffer.from(transpileTs(authShim)).toString("base64")}`;
  const source = readFileSync(storeFsPath, "utf8").replace(/from "@\/lib\/auth"/g, `from "${authUrl}"`);
  const storeUrl = `data:text/javascript;base64,${Buffer.from(transpileTs(source)).toString("base64")}`;
  process.env.EQUIPMENT_CLASSIFICATION_STORE_PATH = jsonPath;
  return import(`${storeUrl}#${Buffer.from(jsonPath).toString("base64")}`);
}

test("equipment classification store seeds and enforces unique names per empresa", async () => {
  assert.equal(existsSync(storeFsPath), true);
  const dir = mkdtempSync(join(tmpdir(), "silo-classification-"));
  const jsonPath = join(dir, "equipment-classification.json");

  try {
    const mod = await loadStoreModule(jsonPath);
    const readFn = mod.readEquipmentClassificationStore ?? mod.readStore;
    const upsertFn = mod.upsertEquipmentClassification ?? mod.upsertRecord;
    const listFn = mod.listEquipmentClassificationByKind ?? mod.listRecords;
    const getFn = mod.getEquipmentClassificationById ?? mod.getRecordById;

    assert.equal(typeof readFn, "function");
    assert.equal(typeof upsertFn, "function");
    assert.equal(typeof listFn, "function");
    assert.equal(typeof getFn, "function");

    const initial = await readFn();
    assert.match(JSON.stringify(initial), /TRATOR/);
    assert.match(JSON.stringify(initial), /TRABALHANDO/);

    const tipo = await upsertFn("tipos", {
      codigo: "PULVERIZADOR",
      nome: "Pulverizador",
      descricao: "Tipo de apoio",
      ativo: true,
      empresa_id: "SILOOPS",
    }, { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS", usinas: ["*"], unidades: ["*"] });

    assert.equal(tipo.codigo, "PULVERIZADOR");
    const list = await listFn("tipos", { role: "VIEWER", empresa_id: "SILOOPS", usinas: ["*"], unidades: ["*"] });
    assert.ok(list.some((item) => item.codigo === "PULVERIZADOR"));
    const refreshed = await readFn();
    assert.ok(refreshed.tipos.some((item) => item.id === tipo.id && item.codigo === "PULVERIZADOR"));

    await assert.rejects(
      () => upsertFn("tipos", {
        codigo: "PULVERIZADOR",
        nome: "Pulverizador 2",
        descricao: "Outro",
        ativo: true,
        empresa_id: "SILOOPS",
      }, { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS", usinas: ["*"], unidades: ["*"] }),
      /único|unico/i,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
