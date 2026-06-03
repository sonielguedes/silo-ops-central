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

function buildStoreModuleUrl(jsonPath) {
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
  return `${storeUrl}#${Buffer.from(jsonPath).toString("base64")}`;
}

async function loadStoreModule(jsonPath) {
  return import(buildStoreModuleUrl(jsonPath));
}

async function loadDetailsModule(jsonPath) {
  const storeModuleUrl = buildStoreModuleUrl(jsonPath);
  const detailsSource = readFileSync(new URL("../src/lib/equipment-details.ts", import.meta.url), "utf8")
    .replace(/from "@\/lib\/app-env"/g, `from "data:text/javascript;base64,${Buffer.from(transpileTs(`
      export const IS_DEMO = false;
      export const SITE_URL = "";
    `)).toString("base64")}"`)
    .replace(/from "@\/lib\/api"/g, `from "data:text/javascript;base64,${Buffer.from(transpileTs(`
      export function normalizeEquipmentList(data) {
        return Array.isArray(data) ? data : [];
      }
    `)).toString("base64")}"`)
    .replace(/from "@\/lib\/auth"/g, `from "data:text/javascript;base64,${Buffer.from(transpileTs(`
      export function filterItemsBySessionScope(rows) { return rows; }
      export function normalizeScopeFields(scope) { return scope; }
    `)).toString("base64")}"`)
    .replace(/from "@\/lib\/equipment-master-store"/g, `from "${storeModuleUrl}"`)
    .replace(/from "@\/lib\/equipment-status-trail"/g, `from "data:text/javascript;base64,${Buffer.from(transpileTs(`
      export async function fetchEquipmentStatusSnapshot() {
        return {
          data: [
            {
              trator_id: "T01",
              status: "ONLINE",
              presence: "ONLINE",
              updated_at: "2026-06-03T10:00:00.000Z",
            },
          ],
        };
      }
      export function enrichTrailPointWithOperationalContext(point) {
        return point;
      }
    `)).toString("base64")}"`)
    .replace(/from "@\/lib\/equipment-state"/g, `from "data:text/javascript;base64,${Buffer.from(transpileTs(`
      export function normalizeEquipmentState(input) {
        return {
          presence: input.presence ?? null,
          estado_operacional: input.estado_operacional ?? null,
          codigo_parada: input.codigo_parada ?? null,
          descricao_parada: input.descricao_parada ?? null,
          operacao_atual: input.operacao_nome ?? null,
          ultima_operacao_conhecida: input.operacao_nome ?? null,
          status_resumo: input.status ?? null,
        };
      }
    `)).toString("base64")}"`)
    .replace(/from "@\/lib\/equipment-trail-store"/g, `from "data:text/javascript;base64,${Buffer.from(transpileTs(`
      export async function queryEquipmentTrailPoints() {
        return [];
      }
    `)).toString("base64")}"`)
    .replace(/from "@\/lib\/equipment-type"/g, `from "data:text/javascript;base64,${Buffer.from(transpileTs(`
      export function normalizeEquipmentType(input) {
        return input.tipo_equipamento || input.tipo || "TRATOR";
      }
    `)).toString("base64")}"`);

  const detailsUrl = `data:text/javascript;base64,${Buffer.from(transpileTs(detailsSource)).toString("base64")}`;
  return import(`${detailsUrl}#${Buffer.from(jsonPath).toString("base64")}`);
}

async function loadMobileRouteModule(kind, jsonPath, session) {
  const storeModuleUrl = buildStoreModuleUrl(jsonPath);
  const routePath = kind === "fleet"
    ? new URL("../src/app/api/mobile/equipamentos/frota/[frota]/route.ts", import.meta.url)
    : new URL("../src/app/api/mobile/equipamentos/route.ts", import.meta.url);
  const routeSource = readFileSync(routePath, "utf8")
    .replace(/from "next\/server"/g, `from "data:text/javascript;base64,${Buffer.from(transpileTs(`
      export const NextResponse = {
        json(body, init = {}) {
          return new Response(JSON.stringify(body), {
            status: init.status ?? 200,
            headers: { "content-type": "application/json" },
          });
        },
      };
    `)).toString("base64")}"`)
    .replace(/from "@\/lib\/auth"/g, `from "data:text/javascript;base64,${Buffer.from(transpileTs(`
      export function getSessionFromRequest() {
        return ${JSON.stringify(session)};
      }
    `)).toString("base64")}"`)
    .replace(/from "@\/lib\/equipment-master-store"/g, `from "${storeModuleUrl}"`);
  const routeUrl = `data:text/javascript;base64,${Buffer.from(transpileTs(routeSource)).toString("base64")}`;
  return import(`${routeUrl}#${Buffer.from(kind + jsonPath).toString("base64")}`);
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
      const findByFrotaFn = mod.findEquipmentMasterRecordByFrota ?? mod.resolveEquipmentMasterByFrota;
      const listActiveFn = mod.listActiveEquipmentMaster ?? mod.listActiveEquipmentMasterBySession;
      const normalizeFrotaFn = mod.normalizeFrotaCode ?? mod.normalizeFleetCode;

      assert.equal(typeof readFn, "function");
      assert.equal(typeof upsertFn, "function");
      assert.equal(typeof normalizeFn, "function");
      assert.equal(typeof filterFn, "function");
      assert.equal(typeof findFn, "function");
      assert.equal(typeof mergeFn, "function");
      assert.equal(typeof findByFrotaFn, "function");
      assert.equal(typeof listActiveFn, "function");
      assert.equal(typeof normalizeFrotaFn, "function");

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
        frota: "700010",
        empresa_id: "SILOOPS",
        usina_id: "USINA_PADRAO",
        unidade_id: "UNIDADE_PADRAO",
        nome: "Trator Teste",
        tipo_equipamento: "TRATOR",
        status: "ATIVO",
      });
      assert.ok(created);

      try {
        await upsertFn({
          id: "ALT_1",
          trator_id: "T99",
          frota: "700011",
          empresa_id: "SILOOPS",
          usina_id: "USINA_PADRAO",
          unidade_id: "UNIDADE_PADRAO",
          nome: "Conflito",
          tipo_equipamento: "TRATOR",
          status: "ATIVO",
        });
        assert.fail("expected duplicate_trator validation error");
      } catch (err) {
        assert.equal(err?.code, "duplicate_trator");
        assert.equal(err?.status, 409);
      }

      try {
        await upsertFn({
          id: "VIEWER_1",
          trator_id: "T100",
          empresa_id: "SILOOPS",
          usina_id: "USINA_PADRAO",
          unidade_id: "UNIDADE_PADRAO",
          nome: "Sem escrita",
          tipo_equipamento: "TRATOR",
          status: "ATIVO",
        }, { role: "VIEWER", empresa_id: "SILOOPS", usinas: ["USINA_PADRAO"], unidades: ["UNIDADE_PADRAO"] });
        assert.fail("expected tenant scope validation error");
      } catch (err) {
        assert.match(String(err?.message ?? err), /fora do escopo do tenant/);
      }

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

if (existsSync(storeFsPath)) {
  test("equipment master update propagates to status and detalhes payloads", async () => {
    const dir = mkdtempSync(join(tmpdir(), "silo-equipment-details-"));
    const jsonPath = join(dir, "equipment-master.json");
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = async (input) => {
        const url = String(input);
        const body = url.includes("/api/equipamentos/status")
          ? [{
              trator_id: "T01",
              status: "ONLINE",
              presence: "ONLINE",
              updated_at: "2026-06-03T10:00:00.000Z",
            }]
          : [];
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      };

    const storeMod = await loadStoreModule(jsonPath);
    const upsertFn = storeMod.upsertEquipmentMaster ?? storeMod.upsertEquipment ?? storeMod.upsertItem;
    const readFn = storeMod.readEquipmentMasterStore ?? storeMod.readEquipmentStore ?? storeMod.readStore;
    const mergeFn = storeMod.enrichEquipmentStatusWithMaster ?? storeMod.mergeEquipmentMasterStatus;
    const findByFrotaFn = storeMod.findEquipmentMasterRecordByFrota ?? storeMod.resolveEquipmentMasterByFrota;
    const listActiveFn = storeMod.listActiveEquipmentMaster ?? storeMod.listActiveEquipmentMasterBySession;
    const listMobileFn = storeMod.listMobileEquipmentMaster ?? storeMod.listActiveMobileEquipmentMaster;
    const normalizeFrotaFn = storeMod.normalizeFrotaCode ?? storeMod.normalizeFleetCode;

      await upsertFn({
        id: "T01",
        trator_id: "T01",
        nome: "TR PREPARO",
        frota: "602040",
        tipo_equipamento: "TRATOR",
        empresa_id: "SILOOPS",
        usina_id: "USINA_PADRAO",
        unidade_id: "UNIDADE_PADRAO",
      });

      await upsertFn({
        id: "T09",
        trator_id: "T09",
        nome: "TR INATIVO",
        frota: "700001",
        tipo_equipamento: "TRATOR",
        status: "INATIVO",
        empresa_id: "SILOOPS",
        usina_id: "USINA_PADRAO",
        unidade_id: "UNIDADE_PADRAO",
      });

      const store = await readFn();
      const master = store.items.find((item) => item.trator_id === "T01");
      assert.equal(master?.frota, "602040");
      assert.equal(master?.nome, "TR PREPARO");
      assert.equal(normalizeFrotaFn(" 602040 "), "602040");
      assert.equal(findByFrotaFn(store.items, " 602040 ", { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS", usinas: ["*"], unidades: ["*"] })?.trator_id, "T01");
      assert.equal(findByFrotaFn(store.items, "999999", { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS", usinas: ["*"], unidades: ["*"] }), null);
      assert.deepEqual(
        listMobileFn(store.items, { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS", usinas: ["*"], unidades: ["*"] }).map((item) => item.trator_id),
        ["T01"],
      );

      try {
        await upsertFn({
          trator_id: "T40",
          nome: "Sem Frota",
          tipo_equipamento: "TRATOR",
          status: "ATIVO",
          empresa_id: "SILOOPS",
          usina_id: "USINA_PADRAO",
          unidade_id: "UNIDADE_PADRAO",
        });
        assert.fail("expected missing_frota validation error");
      } catch (err) {
        assert.equal(err?.code, "missing_frota");
        assert.equal(err?.status, 400);
      }

      try {
        await upsertFn({
          trator_id: "T41",
          nome: "Frota Duplicada",
          frota: "602040",
          tipo_equipamento: "TRATOR",
          status: "ATIVO",
          empresa_id: "SILOOPS",
          usina_id: "USINA_PADRAO",
          unidade_id: "UNIDADE_PADRAO",
        });
        assert.fail("expected duplicate_frota validation error");
      } catch (err) {
        assert.equal(err?.code, "duplicate_frota");
        assert.equal(err?.status, 409);
      }

      const statusRow = mergeFn(
        {
          trator_id: "T01",
          status: "ONLINE",
          presence: "ONLINE",
          cadastro_status: "NAO_CADASTRADO",
        },
        master,
      );
      assert.equal(statusRow.frota, "602040");
      assert.equal(statusRow.nome, "TR PREPARO");

      const detailsMod = await loadDetailsModule(jsonPath);
      const details = await detailsMod.buildEquipmentDetails("T01", { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS", usinas: ["*"], unidades: ["*"] });
      assert.equal(details?.frota, "602040");
      assert.equal(details?.nome_equipamento, "TR PREPARO");

      const fleetRoute = await loadMobileRouteModule("fleet", jsonPath, { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS", usinas: ["*"], unidades: ["*"] });
      const listRoute = await loadMobileRouteModule("list", jsonPath, { role: "ADMIN_GLOBAL", empresa_id: "SILOOPS", usinas: ["*"], unidades: ["*"] });

      const okResponse = await fleetRoute.GET({}, { params: Promise.resolve({ frota: " 602040 " }) });
      assert.equal(okResponse.status, 200);
      assert.equal((await okResponse.json()).trator_id, "T01");

      const missingResponse = await fleetRoute.GET({}, { params: Promise.resolve({ frota: "999999" }) });
      assert.equal(missingResponse.status, 404);

      const inactiveResponse = await fleetRoute.GET({}, { params: Promise.resolve({ frota: "700001" }) });
      assert.equal(inactiveResponse.status, 409);

      const listResponse = await listRoute.GET({});
      assert.equal(listResponse.status, 200);
      assert.deepEqual((await listResponse.json()).map((item) => item.trator_id).sort(), ["T01"]);
    } finally {
      globalThis.fetch = originalFetch;
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
