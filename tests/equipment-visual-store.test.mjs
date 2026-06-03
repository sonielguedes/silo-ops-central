import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const storePath = new URL("../src/lib/equipment-visual-store.ts", import.meta.url);
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
  `;
  const authUrl = `data:text/javascript;base64,${Buffer.from(transpileTs(authShim)).toString("base64")}`;
  const source = readFileSync(storeFsPath, "utf8").replace(/from "@\/lib\/auth"/g, `from "${authUrl}"`);
  const storeUrl = `data:text/javascript;base64,${Buffer.from(transpileTs(source)).toString("base64")}`;
  process.env.EQUIPMENT_VISUAL_STORE_PATH = jsonPath;
  return import(`${storeUrl}#${Buffer.from(jsonPath).toString("base64")}`);
}

test("equipment visual store seeds and handles CRUD", async () => {
  const dir = mkdtempSync(join(tmpdir(), "silo-vis-store-"));
  const jsonPath = join(dir, "visual.json");
  try {
    const mod = await loadStoreModule(jsonPath);
    const readFn = mod.readEquipmentVisualStore;
    const upsertFn = mod.upsertVisualConfig;

    const initial = await readFn();
    assert.ok(initial.configs.length >= 13, "Devia ter configs de seed");
    assert.ok(initial.configs.some(c => c.tipo_equipamento === "TRATOR"));

    const config = await upsertFn({
      tipo_equipamento: "TESTE_TIPO",
      icone: "trator",
      cor_online: "#00FF00",
      empresa_id: "SILOOPS"
    }, { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS" });
    assert.equal(config.tipo_equipamento, "TESTE_TIPO");

    // Duplicate check
    await assert.rejects(
      () => upsertFn({
        tipo_equipamento: "TESTE_TIPO",
        icone: "caminhao",
        empresa_id: "SILOOPS"
      }, { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS" }),
      /Configuração já existe/i
    );

    // Edit
    const updated = await upsertFn({
      id: config.id,
      tipo_equipamento: "TESTE_TIPO",
      icone: "caminhao",
      empresa_id: "SILOOPS"
    }, { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS" });
    assert.equal(updated.icone, "caminhao");

  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
