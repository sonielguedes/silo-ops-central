import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

function loadStoreModule(storePath) {
  const source = readFileSync(new URL("../src/lib/admin-tenant-store.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  process.env.TENANT_STORE_PATH = storePath;
  const url = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}#${Buffer.from(storePath).toString("base64")}`;
  return import(url);
}

test("admin tenant store persists empresa, usina and unidade hierarchy", async () => {
  const dir = mkdtempSync(join(tmpdir(), "silo-admin-tenants-"));
  const storePath = join(dir, "admin-tenants.json");

  try {
    const mod = await loadStoreModule(storePath);

    const empresa = await mod.upsertEmpresa({
      empresa_id: "SILOOPS",
      nome_empresa: "SILO OPS",
      status: "ATIVO",
    });
    assert.equal(empresa.empresa_id, "SILOOPS");

    const usina = await mod.upsertUsina({
      usina_id: "USINA_PADRAO",
      empresa_id: "SILOOPS",
      nome_usina: "Usina Padrão",
      status: "ATIVO",
    });
    assert.equal(usina.empresa_id, "SILOOPS");

    const unidade = await mod.upsertUnidade({
      unidade_id: "UNIDADE_PADRAO",
      usina_id: "USINA_PADRAO",
      nome_unidade: "Unidade Padrão",
      status: "ATIVO",
    });
    assert.equal(unidade.usina_id, "USINA_PADRAO");

    const store = await mod.readAdminTenantStore();
    assert.deepEqual(store.empresas.map((item) => item.empresa_id), ["SILOOPS"]);
    assert.deepEqual(store.usinas.map((item) => item.usina_id), ["USINA_PADRAO"]);
    assert.deepEqual(store.unidades.map((item) => item.unidade_id), ["UNIDADE_PADRAO"]);

    const raw = readFileSync(storePath, "utf8");
    assert.match(raw, /SILOOPS/);
    assert.match(raw, /USINA_PADRAO/);
    assert.match(raw, /UNIDADE_PADRAO/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("admin tenant store blocks orphan usina and unidade writes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "silo-admin-tenants-"));
  const storePath = join(dir, "admin-tenants.json");

  try {
    const mod = await loadStoreModule(storePath);
    await assert.rejects(
      () => mod.upsertUsina({
        usina_id: "USINA_TESTE_BLOQUEADA",
        empresa_id: "SILOOPS",
        nome_usina: "Usina Bloqueada",
      }),
      /empresa_id inexistente/,
    );

    await mod.upsertEmpresa({
      empresa_id: "SILOOPS",
      nome_empresa: "SILO OPS",
    });

    await assert.rejects(
      () => mod.upsertUnidade({
        unidade_id: "UNIDADE_TESTE_BLOQUEADA",
        usina_id: "USINA_TESTE_BLOQUEADA",
        nome_unidade: "Unidade Bloqueada",
      }),
      /usina_id inexistente/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
