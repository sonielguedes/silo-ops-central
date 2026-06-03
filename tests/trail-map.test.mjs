import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadTrailMapModule() {
  const source = readFileSync(new URL("../src/lib/trail-map.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const url = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
  return import(url);
}

test("trail map helper splits jump segments and keeps directional metadata", async () => {
  const mod = await loadTrailMapModule();
  const trail = mod.buildTrailVisualization([
    {
      latitude: -10,
      longitude: -50,
      timestamp: "2026-06-03T10:00:00.000Z",
      velocidade: 4,
      estado_operacional: "TRABALHANDO",
      operacao_nome: "Plantio",
      codigo_parada: null,
      descricao_parada: null,
    },
    {
      latitude: -10.01,
      longitude: -50.01,
      timestamp: "2026-06-03T10:01:00.000Z",
      velocidade: 5,
      estado_operacional: "EM_MOVIMENTO",
    },
    {
      latitude: -10.8,
      longitude: -51.2,
      timestamp: "2026-06-03T10:02:00.000Z",
      velocidade: 6,
      estado_operacional: "PARADO",
      codigo_parada: "P01",
      descricao_parada: "Parada para abastecimento",
    },
  ]);

  assert.equal(trail.points.length, 3);
  assert.equal(trail.segments.length, 2);
  assert.equal(trail.jumpCount, 1);
  assert.equal(trail.segments[0].jump, false);
  assert.equal(trail.segments[1].jump, true);
  assert.match(mod.buildPointTooltip(trail.points[0]), /Horário/);
  assert.match(mod.buildPointTooltip(trail.points[0]), /Velocidade/);
  assert.match(mod.buildPointTooltip(trail.points[0]), /Estado operacional/);
  assert.match(mod.buildJumpTooltip(trail.segments[1]), /Salto GPS/);
  assert.match(mod.buildJumpTooltip(trail.segments[1]), /Distância/);
});

