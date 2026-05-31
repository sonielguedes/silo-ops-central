import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const apiSource = readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8");

test("equipment status calls keep /api/equipamentos/status on the client", () => {
  assert.match(apiSource, /equipamentos:\s*\(\)\s*=>\s*fetchResult<Equipamento\[\]>\("\/api\/equipamentos\/status"\)/);
  assert.doesNotMatch(apiSource, /finalPath\s*=\s*"\/api\/equipamentos"/);
});

test("local proxy route exists for /api/equipamentos/status", () => {
  assert.equal(existsSync(new URL("../src/app/api/equipamentos/status/route.ts", import.meta.url)), true);
});

test("health proxy reports degraded/down instead of throwing raw upstream failures", () => {
  const healthSource = readFileSync(new URL("../src/app/api/health/route.ts", import.meta.url), "utf8");

  assert.match(healthSource, /status:\s*r\.ok\s*\?\s*"ok"\s*:\s*"degraded"/);
  assert.match(healthSource, /status:\s*"down"/);
  assert.match(healthSource, /upstream_status:\s*r\.status/);
  assert.match(healthSource, /console\.error\("\[SIL\] endpoint failed"/);
});

test("map uses configurable equipment icons and menu exposes icon configuration", () => {
  const mapSource = readFileSync(new URL("../src/components/MapComponent.tsx", import.meta.url), "utf8");
  const sidebarSource = readFileSync(new URL("../src/components/Sidebar.tsx", import.meta.url), "utf8");

  assert.match(mapSource, /getIconForModel/);
  assert.match(mapSource, /renderEquipmentIconSvg/);
  assert.match(mapSource, /iconAnchor:\s*\[38,\s*95\]/);
  assert.match(mapSource, /border-top:\s*12px solid \${statusColor}/);
  assert.match(sidebarSource, /\/equipamentos\/icones/);
  assert.equal(existsSync(new URL("../src/app/equipamentos/icones/page.tsx", import.meta.url)), true);
});

test("operations page does not slice nullable API fields directly", () => {
  const source = readFileSync(new URL("../src/app/operacoes/page.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /op\.operacao_id\.slice/);
  assert.doesNotMatch(source, /ev\.timestamp\.slice/);
  assert.match(source, /Aguardando sincronização dos APKs/);
  assert.match(source, /Status operacional/);
});

test("sidebar exposes Power BI report page", () => {
  const sidebarSource = readFileSync(new URL("../src/components/Sidebar.tsx", import.meta.url), "utf8");

  assert.match(sidebarSource, /\/power-bi/);
  assert.match(sidebarSource, /Power BI/);
  assert.equal(existsSync(new URL("../src/app/power-bi/page.tsx", import.meta.url)), true);
});

test("sidebar only exposes production-ready routes", () => {
  const sidebarSource = readFileSync(new URL("../src/components/Sidebar.tsx", import.meta.url), "utf8");
  const routes = ["/", "/mapa", "/operacoes", "/equipamentos", "/equipamentos/icones", "/operadores", "/fazendas", "/telemetria", "/eventos", "/alertas", "/sincronizacao", "/configuracoes-op", "/relatorios", "/power-bi", "/auditoria", "/configuracoes"];

  routes.forEach(route => assert.match(sidebarSource, new RegExp(route.replace(/\//g, "\\/"))));

  assert.doesNotMatch(sidebarSource, /\/sgpa\//);
  const sgpaPageUrl = new URL("../src/app/sgpa/[slug]/page.tsx", import.meta.url);
  assert.equal(existsSync(sgpaPageUrl), true);

  routes.filter(r => r !== "/").forEach(route => {
    const pagePath = route === "/power-bi"
      ? "../src/app/power-bi/page.tsx"
      : route === "/configuracoes-op"
        ? "../src/app/configuracoes-op/page.tsx"
        : route === "/equipamentos/icones"
          ? "../src/app/equipamentos/icones/page.tsx"
          : route === "/relatorios"
            ? "../src/app/relatorios/page.tsx"
            : route === "/sincronizacao"
              ? "../src/app/sincronizacao/page.tsx"
              : route === "/configuracoes"
                ? "../src/app/configuracoes/page.tsx"
                : `../src/app${route}/page.tsx`;
    assert.equal(existsSync(new URL(pagePath, import.meta.url)), true, route);
  });
});

test("demo safety files exist and hide local env", () => {
  assert.equal(existsSync(new URL("../.env.example", import.meta.url)), true);
  const gitignore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");
  assert.match(gitignore, /\.env\.local/);
  assert.match(gitignore, /\.next/);
  const wrapper = readFileSync(new URL("../src/components/SidebarWrapper.tsx", import.meta.url), "utf8");
  assert.match(wrapper, /DemoBanner/);
});

test("dashboard premium exposes technical status, events and operations blocks", () => {
  const dashboardSource = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
  const typesSource = readFileSync(new URL("../src/lib/dashboard-types.ts", import.meta.url), "utf8");

  assert.match(dashboardSource, /Últimos eventos recebidos/);
  assert.match(dashboardSource, /Nenhuma operação ativa no momento/);
  assert.match(dashboardSource, /Aguardando sincronização dos APKs/);
  assert.match(dashboardSource, /Ambiente/);
  assert.match(dashboardSource, /MQTT/);
  assert.match(typesSource, /export type StatusSistema/);
  assert.match(typesSource, /export type EventoOperacional/);
});

test("operations page exposes premium filters, status badges and detail drawer", () => {
  const source = readFileSync(new URL("../src/app/operacoes/page.tsx", import.meta.url), "utf8");

  assert.match(source, /Operações Ativas/);
  assert.match(source, /Máquinas operando/);
  assert.match(source, /SEM_HEARTBEAT/);
  assert.match(source, /SEM_OPERADOR/);
  assert.match(source, /Nenhuma operação ativa no momento/);
  assert.match(source, /Linha do tempo resumida/);
  assert.match(source, /Status sincronização/);
});
