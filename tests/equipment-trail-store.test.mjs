import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

function loadStoreModule(storePath) {
  const source = readFileSync(new URL("../src/lib/equipment-trail-store.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  process.env.EQUIPMENT_TRAIL_STORE_PATH = storePath;
  const url = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}#${Buffer.from(storePath).toString("base64")}`;
  return import(url);
}

test("equipment trail store dedupes equal points and caps per tractor growth", async () => {
  const dir = mkdtempSync(join(tmpdir(), "silo-trail-store-"));
  const storePath = join(dir, "equipment-trail.json");

  try {
    const mod = await loadStoreModule(storePath);
    await mod.appendEquipmentTrailPoints([
      {
        trator_id: "T01",
        timestamp: "2026-06-02T10:00:00.000Z",
        latitude: -10.1,
        longitude: -50.2,
        velocidade: 12,
        status: "ONLINE",
        origem: "status",
        empresa_id: "SILOOPS",
        usina_id: "USINA_PADRAO",
        unidade_id: "UNIDADE_PADRAO",
      },
      {
        trator_id: "T01",
        timestamp: "2026-06-02T10:00:00.000Z",
        latitude: -10.1,
        longitude: -50.2,
        velocidade: 12,
        status: "ONLINE",
        origem: "status",
        empresa_id: "SILOOPS",
        usina_id: "USINA_PADRAO",
        unidade_id: "UNIDADE_PADRAO",
      },
    ]);

    let store = await mod.readEquipmentTrailStore();
    assert.equal(store.points.length, 1);

    const bulk = Array.from({ length: 2105 }, (_, index) => ({
      trator_id: "T01",
      timestamp: new Date(Date.UTC(2026, 5, 2, 10, 0, index)).toISOString(),
      latitude: -10.1 + index * 0.00001,
      longitude: -50.2 + index * 0.00001,
      velocidade: 10 + (index % 5),
      status: "ONLINE",
      origem: "eventos",
      empresa_id: "SILOOPS",
      usina_id: "USINA_PADRAO",
      unidade_id: "UNIDADE_PADRAO",
    }));
    await mod.appendEquipmentTrailPoints(bulk);

    store = await mod.readEquipmentTrailStore();
    assert.ok(store.points.length <= 2000);
    assert.equal(store.points[0].trator_id, "T01");
    assert.match(readFileSync(storePath, "utf8"), /T01/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("equipment trail store filters by tenant and date range", async () => {
  const dir = mkdtempSync(join(tmpdir(), "silo-trail-store-"));
  const storePath = join(dir, "equipment-trail.json");

  try {
    const mod = await loadStoreModule(storePath);
    await mod.appendEquipmentTrailPoints([
      {
        trator_id: "T01",
        timestamp: "2026-06-02T09:00:00.000Z",
        latitude: -10.2,
        longitude: -50.3,
        velocidade: 9,
        status: "ONLINE",
        origem: "status",
        empresa_id: "SILOOPS",
        usina_id: "USINA_PADRAO",
        unidade_id: "UNIDADE_PADRAO",
      },
      {
        trator_id: "T01",
        timestamp: "2026-06-02T09:05:00.000Z",
        latitude: -11.2,
        longitude: -51.3,
        velocidade: 9,
        status: "ONLINE",
        origem: "status",
        empresa_id: "SILOOPS",
        usina_id: "USINA_TESTE_BLOQUEADA",
        unidade_id: "UNIDADE_TESTE_BLOQUEADA",
      },
    ]);

    const viewer = await mod.queryEquipmentTrailPoints({
      tratorId: "T01",
      from: "2026-06-02T08:59:00.000Z",
      to: "2026-06-02T09:59:00.000Z",
      limit: 100,
      session: {
        email: "viewer@siloops.com.br",
        name: "Viewer Tenant",
        role: "VIEWER",
        empresa_id: "SILOOPS",
        usinas: ["USINA_PADRAO"],
        unidades: ["UNIDADE_PADRAO"],
        permissions: ["read:dashboard"],
        expiry: Date.now() + 60_000,
        mode: "prod",
      },
    });

    assert.equal(viewer.length, 1);
    assert.equal(viewer[0].usina_id, "USINA_PADRAO");

    const admin = await mod.queryEquipmentTrailPoints({
      tratorId: "T01",
      limit: 100,
      session: {
        email: "sonieloficial@gmail.com",
        name: "Soniel Oficial",
        role: "ADMIN_GLOBAL",
        empresa_id: "SILOOPS",
        usinas: ["*"],
        unidades: ["*"],
        permissions: ["*"],
        expiry: Date.now() + 60_000,
        mode: "prod",
      },
    });

    assert.equal(admin.length, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("equipment trail store drops near-identical stationary points but keeps real movement and status changes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "silo-trail-store-"));
  const storePath = join(dir, "equipment-trail.json");

  try {
    const mod = await loadStoreModule(storePath);
    await mod.appendEquipmentTrailPoints([
      {
        trator_id: "T01",
        timestamp: "2026-06-02T10:00:00.000Z",
        latitude: -10.0000,
        longitude: -50.0000,
        velocidade: 0.4,
        status: "ONLINE",
        origem: "status",
        empresa_id: "SILOOPS",
        usina_id: "USINA_PADRAO",
        unidade_id: "UNIDADE_PADRAO",
      },
      {
        trator_id: "T01",
        timestamp: "2026-06-02T10:00:10.000Z",
        latitude: -10.00001,
        longitude: -50.00001,
        velocidade: 0.2,
        status: "ONLINE",
        origem: "status",
        empresa_id: "SILOOPS",
        usina_id: "USINA_PADRAO",
        unidade_id: "UNIDADE_PADRAO",
      },
      {
        trator_id: "T01",
        timestamp: "2026-06-02T10:00:20.000Z",
        latitude: -10.00002,
        longitude: -50.00002,
        velocidade: 0.3,
        status: "OFFLINE",
        origem: "status",
        empresa_id: "SILOOPS",
        usina_id: "USINA_PADRAO",
        unidade_id: "UNIDADE_PADRAO",
      },
      {
        trator_id: "T01",
        timestamp: "2026-06-02T10:00:30.000Z",
        latitude: -10.00003,
        longitude: -50.00003,
        velocidade: 2.5,
        status: "ONLINE",
        origem: "status",
        empresa_id: "SILOOPS",
        usina_id: "USINA_PADRAO",
        unidade_id: "UNIDADE_PADRAO",
      },
    ]);

    const store = await mod.readEquipmentTrailStore();
    assert.equal(store.points.length, 3);
    assert.equal(store.points[0].status, "ONLINE");
    assert.equal(store.points[1].status, "OFFLINE");
    assert.equal(store.points[2].velocidade, 2.5);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("equipment trail store derives operational state and stop metadata from raw records", async () => {
  const dir = mkdtempSync(join(tmpdir(), "silo-trail-store-"));
  const storePath = join(dir, "equipment-trail.json");

  try {
    const mod = await loadStoreModule(storePath);

    const stopped = mod.buildTrailPointFromRecord({
      trator_id: "T01",
      timestamp: "2026-06-02T10:10:00.000Z",
      latitude: -10.1,
      longitude: -50.2,
      velocidade: 0.3,
      status: "PARADA",
      operacao_id: "OP123",
      operacao_nome: "Colheita",
      codigo_parada: "P01",
      descricao_parada: "Parada para abastecimento",
      evento_status: "PARADA",
      motivo_status: "Abastecimento",
      origem: "status",
      empresa_id: "SILOOPS",
      usina_id: "USINA_PADRAO",
      unidade_id: "UNIDADE_PADRAO",
    }, "T01", "status");

    assert.equal(stopped?.estado_operacional, "PARADO");
    assert.equal(stopped?.codigo_parada, "P01");
    assert.equal(stopped?.descricao_parada, "Parada para abastecimento");
    assert.equal(stopped?.operacao_id, "OP123");
    assert.equal(stopped?.operacao_nome, "Colheita");
    assert.equal(stopped?.evento_status, "PARADA");
    assert.equal(stopped?.motivo_status, "Abastecimento");

    const explicitStatus = mod.buildTrailPointFromRecord({
      trator_id: "T01",
      timestamp: "2026-06-02T10:10:30.000Z",
      latitude: -10.15,
      longitude: -50.25,
      velocidade: 0.0,
      status_operacional: "PARADO",
      origem: "mobile",
      empresa_id: "SILOOPS",
      usina_id: "USINA_PADRAO",
      unidade_id: "UNIDADE_PADRAO",
    }, "T01", "mobile");

    assert.equal(explicitStatus?.estado_operacional, "PARADO");

    const moving = mod.buildTrailPointFromRecord({
      trator_id: "T01",
      timestamp: "2026-06-02T10:11:00.000Z",
      latitude: -10.2,
      longitude: -50.3,
      velocidade: 6.2,
      origem: "status",
      empresa_id: "SILOOPS",
      usina_id: "USINA_PADRAO",
      unidade_id: "UNIDADE_PADRAO",
    }, "T01", "status");

    assert.equal(moving?.estado_operacional, "EM_MOVIMENTO");

    const working = mod.buildTrailPointFromRecord({
      trator_id: "T01",
      timestamp: "2026-06-02T10:12:00.000Z",
      latitude: -10.2,
      longitude: -50.3,
      velocidade: 0.8,
      operacao_atual: "Plantio",
      operacao_id: "OP999",
      origem: "status",
      empresa_id: "SILOOPS",
      usina_id: "USINA_PADRAO",
      unidade_id: "UNIDADE_PADRAO",
    }, "T01", "status");

    assert.equal(working?.estado_operacional, "TRABALHANDO");
    assert.equal(working?.operacao_nome, "Plantio");

    const idle = mod.buildTrailPointFromRecord({
      trator_id: "T01",
      timestamp: "2026-06-02T10:13:00.000Z",
      latitude: -10.2,
      longitude: -50.3,
      velocidade: 0,
      origem: "status",
      empresa_id: "SILOOPS",
      usina_id: "USINA_PADRAO",
      unidade_id: "UNIDADE_PADRAO",
    }, "T01", "status");

    assert.equal(idle?.estado_operacional, "SEM_OPERACAO");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
