import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const storePath = new URL("../src/lib/equipment-master-store.ts", import.meta.url);
const routePath = new URL("../src/app/api/admin/equipamentos/route.ts", import.meta.url);
const routeIdPath = new URL("../src/app/api/admin/equipamentos/[id]/route.ts", import.meta.url);
const storeFsPath = fileURLToPath(storePath);
const routeFsPath = fileURLToPath(routePath);
const routeIdFsPath = fileURLToPath(routeIdPath);

function transpileTs(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
}

function loadStoreModule(jsonPath) {
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
  const storeSource = readFileSync(storeFsPath, "utf8")
    .replace(/from "@\/lib\/auth"/g, `from "${authUrl}"`);
  const storeUrl = `data:text/javascript;base64,${Buffer.from(transpileTs(storeSource)).toString("base64")}`;

  process.env.EQUIPMENT_MASTER_STORE_PATH = jsonPath;
  const url = `${storeUrl}#${Buffer.from(jsonPath).toString("base64")}`;
  return import(url);
}

test("equipment master registry docs expose the planned store and admin API contract", () => {
  const roadmap = readFileSync(new URL("../docs/specs/roadmap.md", import.meta.url), "utf8");
  const cadastros = readFileSync(new URL("../docs/specs/cadastros-operacionais.md", import.meta.url), "utf8");

  assert.match(roadmap, /cadastro mestre real de equipamentos/);
  assert.match(roadmap, /\/api\/admin\/equipamentos/);
  assert.match(roadmap, /Sem telemetria/);
  assert.match(roadmap, /Nao cadastrado/);
  assert.match(cadastros, /cadastro mestre de equipamentos/);
  assert.match(cadastros, /\/equipamentos/);
  assert.match(cadastros, /store JSON server-side/);
});

if (existsSync(storeFsPath)) {
  test("equipment master store seeds, normalizes and enforces tenant constraints", async () => {
    const dir = mkdtempSync(join(tmpdir(), "silo-equipment-master-"));
    const jsonPath = join(dir, "equipment-master.json");

    try {
      const mod = await loadStoreModule(jsonPath);
      const readFn = mod.readEquipmentMasterStore ?? mod.readEquipmentStore ?? mod.readStore;
      const upsertFn = mod.upsertEquipmentMaster ?? mod.upsertEquipment ?? mod.upsertItem;
      const normalizeFn = mod.normalizeEquipmentMasterInput ?? mod.normalizeEquipmentInput;
      const filterFn = mod.filterEquipmentMasterBySession ?? mod.listAccessibleEquipmentMaster;
      const findFn = mod.findEquipmentMasterRecord ?? mod.resolveEquipmentMasterRecord ?? mod.getEquipmentMasterByScope;
      const mergeFn = mod.enrichEquipmentStatusWithMaster ?? mod.mergeEquipmentMasterStatus;

      assert.equal(typeof readFn, "function");
      assert.equal(typeof upsertFn, "function");
      assert.equal(typeof normalizeFn, "function");
      assert.equal(typeof filterFn, "function");
      assert.equal(typeof findFn, "function");
      assert.equal(typeof mergeFn, "function");

      const normalized = normalizeFn({
        trator_id: "  T99  ",
        nome: "  Trator Teste  ",
        tipo_equipamento: " trator ",
        empresa_id: "SILOOPS",
        usina_id: "USINA_PADRAO",
        unidade_id: "UNIDADE_PADRAO",
        gera_rastro: "1",
        usa_horimetro: "true",
        unidade_medida: "km",
      });
      assert.equal(normalized.trator_id, "T99");
      assert.equal(normalized.nome, "Trator Teste");
      assert.equal(normalized.tipo_equipamento, "trator");
      assert.equal(normalized.gera_rastro, true);
      assert.equal(normalized.usa_horimetro, true);

      const initial = await readFn();
      assert.ok(Array.isArray(initial.items));
      assert.match(JSON.stringify(initial.items), /T01/);
      assert.match(JSON.stringify(initial.items), /T02/);
      const t01 = findFn(initial.items, {
        trator_id: "T01",
        empresa_id: "SILOOPS",
        usina_id: "USINA_PADRAO",
        unidade_id: "UNIDADE_PADRAO",
      }, { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS", usinas: ["*"], unidades: ["*"] });
      assert.equal(t01?.id, "T01");
      const t01Wildcard = findFn(initial.items, {
        trator_id: "T01",
        empresa_id: "*",
        usina_id: "*",
        unidade_id: "*",
      }, { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS", usinas: ["*"], unidades: ["*"] });
      assert.equal(t01Wildcard?.id, "T01");
      const mergedT01 = mergeFn({
        trator_id: "T01",
        nome: "Não cadastrado",
        tipo_equipamento: "TRATOR",
        cadastro_status: "NAO_CADASTRADO",
        master: false,
      }, t01);
      assert.equal(mergedT01.cadastro_status, "CADASTRADO");
      assert.equal(mergedT01.master, true);
      assert.equal(mergedT01.nome, t01.nome);

      const created = await upsertFn({
        trator_id: "T99",
        empresa_id: "SILOOPS",
        usina_id: "USINA_PADRAO",
        unidade_id: "UNIDADE_PADRAO",
        nome: "Trator Teste",
        tipo_equipamento: "TRATOR",
        status: "ATIVO",
      });
      assert.ok(created);

      await assert.rejects(
        () => upsertFn({
          id: "ALT_1",
          trator_id: "T99",
          empresa_id: "SILOOPS",
          usina_id: "USINA_PADRAO",
          unidade_id: "UNIDADE_PADRAO",
          nome: "Conflito",
          tipo_equipamento: "TRATOR",
          status: "ATIVO",
        }),
        /trator_id deve ser/,
      );

      await assert.rejects(
        () => upsertFn({
          id: "VIEWER_1",
          trator_id: "T100",
          empresa_id: "SILOOPS",
          usina_id: "USINA_PADRAO",
          unidade_id: "UNIDADE_PADRAO",
          nome: "Sem escrita",
          tipo_equipamento: "TRATOR",
          status: "ATIVO",
        }, { role: "VIEWER", empresa_id: "SILOOPS", usinas: ["USINA_PADRAO"], unidades: ["UNIDADE_PADRAO"] }),
        /fora do escopo do tenant/,
      );

      const refreshed = await readFn();
      const scoped = filterFn(refreshed.items, { role: "VIEWER", empresa_id: "SILOOPS", usinas: ["USINA_PADRAO"], unidades: ["UNIDADE_PADRAO"] });
      assert.ok(Array.isArray(scoped));
      assert.match(JSON.stringify(scoped), /T99/);

      const raw = readFileSync(jsonPath, "utf8");
      assert.match(raw, /T99/);
      assert.match(raw, /SILOOPS/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

if (existsSync(routeFsPath) && existsSync(routeIdFsPath)) {
  test("admin equipment API routes expose GET/POST/PUT guards", () => {
    const routeSource = readFileSync(routeFsPath, "utf8");
    const routeIdSource = readFileSync(routeIdFsPath, "utf8");

    assert.match(routeSource, /GET/);
    assert.match(routeSource, /POST/);
    assert.match(routeSource, /requireSession/);
    assert.match(routeSource, /unauthorized/);
    assert.match(routeSource, /forbidden/);
    assert.match(routeSource, /readEquipmentMasterStore/);
    assert.match(routeSource, /upsertEquipmentMaster/);
    assert.match(routeSource, /filterEquipmentMasterBySession/);

    assert.match(routeIdSource, /GET/);
    assert.match(routeIdSource, /PUT/);
    assert.match(routeIdSource, /requireSession/);
    assert.match(routeIdSource, /unauthorized/);
    assert.match(routeIdSource, /forbidden/);
    assert.match(routeIdSource, /readEquipmentMasterStore/);
    assert.match(routeIdSource, /upsertEquipmentMaster/);
    assert.match(routeIdSource, /filterEquipmentMasterBySession/);
    assert.match(routeIdSource, /not_found/);
  });
}
