import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const apiSource = readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8");
const fichasSource = readFileSync(new URL("../src/lib/fichas-operacionais.ts", import.meta.url), "utf8");
const authSource = readFileSync(new URL("../src/lib/auth.ts", import.meta.url), "utf8");

test("equipment status calls keep /api/equipamentos/status on the client", () => {
  assert.match(apiSource, /equipamentos:\s*\(\)\s*=>\s*fetchResult<Equipamento\[\]>\("\/api\/equipamentos\/status"\)/);
  assert.doesNotMatch(apiSource, /finalPath\s*=\s*"\/api\/equipamentos"/);
});

test("equipment coordinates are normalized from all accepted shapes", () => {
  assert.match(apiSource, /resolveEquipmentCoordinates/);
  assert.match(apiSource, /gps\.lat\/gps\.lng/);
  assert.match(apiSource, /location\.lat\/location\.lng/);
  assert.match(apiSource, /inLatitudeRange/);
  assert.match(apiSource, /inLongitudeRange/);
});

test("ficha utilities expose integration helpers and generators", () => {
  assert.match(fichasSource, /gerarCSV/);
  assert.match(fichasSource, /gerarTXT/);
  assert.match(fichasSource, /canIntegrateFicha/);
  assert.match(fichasSource, /buildIntegracaoResumo/);
});

test("local proxy route exists for /api/equipamentos/status", () => {
  assert.equal(existsSync(new URL("../src/app/api/equipamentos/status/route.ts", import.meta.url)), true);
});

test("equipment trail page and proxy route exist with cookie guard and tenant-safe rendering", () => {
  const pageSource = readFileSync(new URL("../src/app/equipamentos/[tratorId]/rastro/page.tsx", import.meta.url), "utf8");
  const routeSource = readFileSync(new URL("../src/app/api/equipamentos/[tratorId]/rastro/route.ts", import.meta.url), "utf8");

  assert.match(pageSource, /TrailMap/);
  assert.match(pageSource, /Km estimado/);
  assert.match(pageSource, /Tempo total/);
  assert.match(pageSource, /Primeira posição/);
  assert.match(pageSource, /Última posição/);
  assert.match(pageSource, /Período/);
  assert.match(pageSource, /Voltar para Equipamentos/);
  assert.match(routeSource, /getSessionFromRequest/);
  assert.match(routeSource, /error:\s*"unauthorized"/);
  assert.match(routeSource, /getScopeFilter/);
  assert.match(routeSource, /isAdminGlobal/);
  assert.match(routeSource, /from/);
  assert.match(routeSource, /to/);
  assert.match(routeSource, /limit/);
  assert.match(routeSource, /telemetria/);
  assert.match(routeSource, /api\/equipamentos\/status/);
  assert.match(routeSource, /enrichTrailPointWithOperationalContext/);
  assert.equal(existsSync(new URL("../src/app/equipamentos/[tratorId]/rastro/page.tsx", import.meta.url)), true);
});

test("equipment trail page handles empty API payload without indexing points", () => {
  const pageSource = readFileSync(new URL("../src/app/equipamentos/[tratorId]/rastro/page.tsx", import.meta.url), "utf8");
  const trailMapSource = readFileSync(new URL("../src/components/TrailMap.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /Nenhum ponto de rastro encontrado para este equipamento no período\./);
  assert.match(pageSource, /stats\.km === null/);
  assert.match(pageSource, /stats\.duration === null/);
  assert.match(pageSource, /filteredPoints\.length === 0/);
  assert.match(pageSource, /emptyMessage=/);
  assert.match(pageSource, /dynamic\(\(\) => import\("@\/components\/TrailMap"\), \{\s*ssr:\s*false,\s*loading:/s);
  assert.match(trailMapSource, /points\.length === 0/);
  assert.match(trailMapSource, /emptyMessage/);
  assert.match(trailMapSource, /Posi.*atual/);
  assert.match(pageSource, /Estado operacional/);
  assert.match(pageSource, /Código de parada/);
  assert.match(pageSource, /Descrição da parada/);
  assert.match(pageSource, /Operação/);
  assert.match(pageSource, /Evento \/ motivo/);
});

test("trail map defaults to satellite and offers map fallback toggle", () => {
  const trailMapSource = readFileSync(new URL("../src/components/TrailMap.tsx", import.meta.url), "utf8");
  const trailPageSource = readFileSync(new URL("../src/app/equipamentos/[tratorId]/rastro/page.tsx", import.meta.url), "utf8");

  assert.match(trailMapSource, /World_Imagery/);
  assert.match(trailMapSource, /Satélite/);
  assert.match(trailMapSource, /Mapa/);
  assert.match(trailMapSource, /satellite/i);
  assert.match(trailPageSource, /TrailMap/);
});

test("/api/equipamentos/status requires session and returns unauthorized JSON", () => {
  const routeSource = readFileSync(new URL("../src/app/api/equipamentos/status/route.ts", import.meta.url), "utf8");

  assert.match(routeSource, /getSessionFromRequest/);
  assert.match(routeSource, /error:\s*"unauthorized"/);
  assert.doesNotMatch(routeSource, /message:\s*"Sessão inválida ou ausente\."|message:\s*"SessÃ£o invÃ¡lida ou ausente\."/);
});

test("/api/operacoes/ativas requires session and returns unauthorized JSON", () => {
  const routeSource = readFileSync(new URL("../src/app/api/operacoes/ativas/route.ts", import.meta.url), "utf8");

  assert.match(routeSource, /getSessionFromRequest/);
  assert.match(routeSource, /error:\s*"unauthorized"/);
  assert.doesNotMatch(routeSource, /message:\s*"Sessão inválida ou ausente\."|message:\s*"SessÃ£o invÃ¡lida ou ausente\."/);
});

test("/api/equipamentos/trail/collect is admin protected and persists trail points", () => {
  const routePath = new URL("../src/app/api/equipamentos/trail/collect/route.ts", import.meta.url);
  const routeSource = readFileSync(routePath, "utf8");
  const docSource = readFileSync(new URL("../docs/specs/equipment-trail-collect.md", import.meta.url), "utf8");

  assert.match(routeSource, /POST/);
  assert.match(routeSource, /getSessionFromRequest/);
  assert.match(routeSource, /isAdminGlobal/);
  assert.match(routeSource, /x-collector-token/);
  assert.match(routeSource, /COLLECTOR_TOKEN/);
  assert.match(routeSource, /fetchEquipmentStatusSnapshot/);
  assert.match(routeSource, /persistTrailPointsFromEquipmentStatus/);
  assert.match(routeSource, /readEquipmentTrailStore/);
  assert.match(routeSource, /collected/);
  assert.match(routeSource, /collector_failed/);
  assert.match(routeSource, /401/);
  assert.match(routeSource, /403/);
  assert.match(routeSource, /500/);
  assert.match(docSource, /x-collector-token/);
  assert.match(docSource, /curl -b admin\.cookie -X POST \/api\/equipamentos\/trail\/collect/);
  assert.equal(existsSync(routePath), true);
});

test("health proxy reports degraded/down instead of throwing raw upstream failures", () => {
  const healthSource = readFileSync(new URL("../src/app/api/health/route.ts", import.meta.url), "utf8");

  assert.match(healthSource, /IS_DEMO/);
  assert.match(healthSource, /ambiente:\s*"demo"/);
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
  assert.match(mapSource, /resolveEquipmentCoordinates/);
  assert.match(mapSource, /coords\.hasCoordinates/);
  assert.match(mapSource, /iconAnchor:\s*\[38,\s*95\]/);
  assert.match(mapSource, /border-top:\s*12px solid \${statusColor}/);
  assert.match(sidebarSource, /\/equipamentos\/icones/);
  assert.match(sidebarSource, /\/equipamentos\/rastro/);
  assert.equal(existsSync(new URL("../src/app/equipamentos/icones/page.tsx", import.meta.url)), true);
  assert.equal(existsSync(new URL("../src/app/equipamentos/rastro/page.tsx", import.meta.url)), true);
});

test("map page only renders markers for valid coordinates and lists the reason for missing GPS", () => {
  const mapaSource = readFileSync(new URL("../src/app/mapa/MapaClient.tsx", import.meta.url), "utf8");

  assert.match(mapaSource, /resolveEquipmentCoordinates/);
  assert.match(mapaSource, /coord\.hasCoordinates/);
  assert.match(mapaSource, /coord\.reason/);
});

test("equipment list exposes direct trail navigation on each row", () => {
  const equipmentsSource = readFileSync(new URL("../src/app/equipamentos/page.tsx", import.meta.url), "utf8");
  const trailIndexSource = readFileSync(new URL("../src/app/equipamentos/rastro/page.tsx", import.meta.url), "utf8");

  assert.match(equipmentsSource, /Ver Rastro/);
  assert.match(equipmentsSource, /\/equipamentos\/\$\{eq\.trator_id\}\/rastro/);
  assert.match(equipmentsSource, /Estado operacional/);
  assert.match(trailIndexSource, /Rastro dos Equipamentos/);
  assert.match(trailIndexSource, /Ver rastro/);
  assert.match(trailIndexSource, /Último sinal/);
  assert.match(trailIndexSource, /GPS/);
});

test("operations page does not slice nullable API fields directly", () => {
  const source = readFileSync(new URL("../src/app/operacoes/page.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /op\.operacao_id\.slice/);
  assert.doesNotMatch(source, /ev\.timestamp\.slice/);
  assert.match(source, /Aguardando sincronização dos APKs/);
  assert.match(source, /Status operacional/);
});

test("operators page blocks demo writes and supports localStorage CRUD", () => {
  const source = readFileSync(new URL("../src/app/operadores/page.tsx", import.meta.url), "utf8");

  assert.match(source, /CAN_LOCAL_OPERADORES_CRUD/);
  assert.match(source, /readLocalOps/);
  assert.match(source, /writeLocalOps/);
  assert.match(source, /Ambiente demonstrativo: cadastro real desativado\./);
  assert.match(source, /Cadastro salvo somente em localStorage para demonstração\./);
  assert.match(source, /Falha técnica ao salvar operador\./);
});

test("api/eventos route returns controlled technical empty payload", () => {
  const routeSource = readFileSync(new URL("../src/app/api/eventos/route.ts", import.meta.url), "utf8");

  assert.match(routeSource, /getSessionFromRequest/);
  assert.match(routeSource, /error:\s*"unauthorized"/);
  assert.match(routeSource, /IS_DEMO/);
  assert.match(routeSource, /status_tecnico/);
  assert.match(routeSource, /Nenhum evento real recebido ainda/);
  assert.equal(existsSync(new URL("../src/app/api/eventos/route.ts", import.meta.url)), true);
});

test("/api/operacoes requires session and returns unauthorized JSON", () => {
  const routeSource = readFileSync(new URL("../src/app/api/operacoes/route.ts", import.meta.url), "utf8");

  assert.match(routeSource, /getSessionFromRequest/);
  assert.match(routeSource, /error:\s*"unauthorized"/);
  assert.doesNotMatch(routeSource, /message:\s*"Sessão inválida ou ausente\."|message:\s*"SessÃ£o invÃ¡lida ou ausente\."/);
});

test("recent events route exists and returns empty array when backend is unavailable", () => {
  const routeSource = readFileSync(new URL("../src/app/api/eventos/recentes/route.ts", import.meta.url), "utf8");

  assert.match(routeSource, /IS_DEMO/);
  assert.match(routeSource, /status_tecnico/);
  assert.match(routeSource, /eventos:\s*\[\]/);
  assert.equal(existsSync(new URL("../src/app/api/eventos/recentes/route.ts", import.meta.url)), true);
});

test("health, equipment and operations routes short-circuit in demo mode", () => {
  const healthSource = readFileSync(new URL("../src/app/api/health/route.ts", import.meta.url), "utf8");
  const equipmentSource = readFileSync(new URL("../src/app/api/equipamentos/status/route.ts", import.meta.url), "utf8");
  const opsSource = readFileSync(new URL("../src/app/api/operacoes/ativas/route.ts", import.meta.url), "utf8");
  const eventsSource = readFileSync(new URL("../src/app/api/eventos/route.ts", import.meta.url), "utf8");

  assert.match(healthSource, /IS_DEMO/);
  assert.match(healthSource, /SITE_URL/);
  assert.match(healthSource, /ambiente:\s*"demo"/);
  assert.match(equipmentSource, /IS_DEMO/);
  assert.match(equipmentSource, /SITE_URL/);
  assert.match(opsSource, /IS_DEMO/);
  assert.match(opsSource, /SITE_URL/);
  assert.match(eventsSource, /IS_DEMO/);
  assert.match(eventsSource, /SITE_URL/);
});

test("operators api route keeps demo and local writes controlled", () => {
  const routeSource = readFileSync(new URL("../src/app/api/operadores/route.ts", import.meta.url), "utf8");

  assert.match(routeSource, /IS_DEMO/);
  assert.match(routeSource, /CAN_LOCAL_OPERADORES_CRUD/);
  assert.match(routeSource, /status_tecnico/);
  assert.match(routeSource, /Serviço de operadores temporariamente indisponível/);
});

test("ficha relatorios page exposes integration and export controls", () => {
  const relatoriosSource = readFileSync(new URL("../src/app/relatorios/page.tsx", import.meta.url), "utf8");
  const modalSource = readFileSync(new URL("../src/components/relatorios/TipoIntegracaoModal.tsx", import.meta.url), "utf8");

  assert.match(relatoriosSource, /Fichas & Relatórios/);
  assert.match(relatoriosSource, /Pendentes/);
  assert.match(relatoriosSource, /Exportadas/);
  assert.match(relatoriosSource, /Inconsistentes/);
  assert.match(relatoriosSource, /Horas totais/);
  assert.match(relatoriosSource, /Indeterminado %/);
  assert.match(relatoriosSource, /Exportar CSV/);
  assert.match(relatoriosSource, /Exportar TXT/);
  assert.match(relatoriosSource, /Integrar Selecionados/);
  assert.match(relatoriosSource, /Selecionar visíveis/);
  assert.match(relatoriosSource, /Fichas Operacionais/);
  assert.match(relatoriosSource, /Histórico/);
  assert.match(relatoriosSource, /Alterar inconsistência/);
  assert.match(modalSource, /Tipo de Integração/);
  assert.match(modalSource, /Banco de Dados/);
  assert.match(modalSource, /Arquivo de Texto/);
});

test("ficha operacionais api routes exist including export and integration", () => {
  assert.equal(existsSync(new URL("../src/app/api/fichas-operacionais/route.ts", import.meta.url)), true);
  assert.equal(existsSync(new URL("../src/app/api/fichas-operacionais/[idLocal]/route.ts", import.meta.url)), true);
  assert.equal(existsSync(new URL("../src/app/api/fichas-operacionais/exportar/route.ts", import.meta.url)), true);
  assert.equal(existsSync(new URL("../src/app/api/fichas-operacionais/integrar/route.ts", import.meta.url)), true);
  assert.equal(existsSync(new URL("../src/app/api/fichas-operacionais/historico/route.ts", import.meta.url)), true);
  assert.equal(existsSync(new URL("../src/app/relatorios/fichas-operador/page.tsx", import.meta.url)), true);
});

test("sidebar exposes Power BI report page", () => {
  const sidebarSource = readFileSync(new URL("../src/components/Sidebar.tsx", import.meta.url), "utf8");

  assert.match(sidebarSource, /\/power-bi/);
  assert.match(sidebarSource, /Power BI/);
  assert.equal(existsSync(new URL("../src/app/power-bi/page.tsx", import.meta.url)), true);
});

test("sidebar only exposes production-ready routes", () => {
  const sidebarSource = readFileSync(new URL("../src/components/Sidebar.tsx", import.meta.url), "utf8");
  const routes = ["/", "/mapa", "/operacoes", "/equipamentos", "/equipamentos/icones", "/operadores", "/fazendas", "/telemetria", "/eventos", "/alertas", "/sincronizacao", "/configuracoes-op", "/relatorios", "/power-bi", "/auditoria", "/configuracoes", "/admin/empresas", "/admin/usinas", "/admin/unidades", "/admin/usuarios"];

  routes.forEach(route => assert.match(sidebarSource, new RegExp(route.replace(/\//g, "\\/"))));
  assert.match(sidebarSource, /ADMINISTRAÇÃO/);
  assert.match(sidebarSource, /Usuários e Permissões/);

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
                : route.startsWith("/admin/")
                  ? `../src/app${route}/page.tsx`
                : `../src/app${route}/page.tsx`;
    assert.equal(existsSync(new URL(pagePath, import.meta.url)), true, route);
  });
});

test("admin tenant pages expose premium CRUD layout and tenant-aware loading", () => {
  const empresasPage = readFileSync(new URL("../src/app/admin/empresas/page.tsx", import.meta.url), "utf8");
  const usinasPage = readFileSync(new URL("../src/app/admin/usinas/page.tsx", import.meta.url), "utf8");
  const unidadesPage = readFileSync(new URL("../src/app/admin/unidades/page.tsx", import.meta.url), "utf8");
  const helperSource = readFileSync(new URL("../src/lib/admin-tenant-client.ts", import.meta.url), "utf8");

  [empresasPage, usinasPage, unidadesPage].forEach((source) => {
    assert.match(source, /Header/);
    assert.match(source, /SectionHeader/);
    assert.match(source, /StatCard/);
    assert.match(source, /Atualizar/);
    assert.match(source, /Acesso restrito/);
    assert.match(source, /fetchJson/);
  });

  assert.match(empresasPage, /\/api\/admin\/empresas/);
  assert.match(usinasPage, /\/api\/admin\/usinas/);
  assert.match(usinasPage, /\/api\/admin\/empresas/);
  assert.match(unidadesPage, /\/api\/admin\/unidades/);
  assert.match(unidadesPage, /\/api\/admin\/usinas/);
  assert.match(helperSource, /isTenantAdmin/);
  assert.match(helperSource, /fetchJson/);
});

test("demo safety files exist and hide local env", () => {
  assert.equal(existsSync(new URL("../.env.example", import.meta.url)), true);
  const gitignore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");
  assert.match(gitignore, /\.env\.local/);
  assert.match(gitignore, /\.next/);
  const wrapper = readFileSync(new URL("../src/components/SidebarWrapper.tsx", import.meta.url), "utf8");
  assert.match(wrapper, /DemoBanner/);
});

test("demo login credentials are centralized and gated by demo environment", () => {
  const loginContext = readFileSync(new URL("../src/lib/auth-context.tsx", import.meta.url), "utf8");
  const loginPage = readFileSync(new URL("../src/app/login/page.tsx", import.meta.url), "utf8");
  const loginRoute = readFileSync(new URL("../src/app/api/auth/login/route.ts", import.meta.url), "utf8");
  const logoutRoute = readFileSync(new URL("../src/app/api/auth/logout/route.ts", import.meta.url), "utf8");

  assert.match(authSource, /demo@siloops\.com\.br/);
  assert.match(authSource, /SiloOps@2026/);
  assert.match(authSource, /Viewer@2026/);
  assert.match(authSource, /IS_DEMO/);
  assert.match(authSource, /canUseDemoLogin/);
  assert.match(authSource, /canUseProdLogin/);
  assert.match(authSource, /SESSION_COOKIE_NAME/);
  assert.match(authSource, /OFFICIAL_PROD_AUTH/);
  assert.match(authSource, /normalizeRole/);
  assert.match(authSource, /admin:\s*"ADMIN_GLOBAL"/);
  assert.match(authSource, /isAdminGlobal/);
  assert.match(authSource, /canAccessModule/);
  assert.match(authSource, /getSessionFromRequest/);
  assert.match(authSource, /getScopeFilter/);
  assert.match(authSource, /normalizeScopeFields/);
  assert.match(loginContext, /fetch\("\/api\/auth\/login"/);
  assert.match(loginContext, /fetch\("\/api\/auth\/logout"/);
  assert.match(loginContext, /mirrorSession/);
  assert.match(loginContext, /sil_session_visual/);
  assert.match(loginPage, /returnTo/);
  assert.match(loginPage, /Ambiente demonstrativo ativo/);
  assert.match(loginRoute, /httpOnly/);
  assert.match(loginRoute, /returnTo/);
  assert.match(loginRoute, /profile:/);
  assert.match(logoutRoute, /SESSION_COOKIE_NAME/);
  assert.doesNotMatch(authSource, /role:\s*"admin"/);
});

test("middleware guards internal pages and preserves returnTo while leaving api routes public", () => {
  const middlewareSource = readFileSync(new URL("../src/middleware.ts", import.meta.url), "utf8");

  assert.match(middlewareSource, /\/login/);
  assert.match(middlewareSource, /\/api\//);
  assert.match(middlewareSource, /returnTo/);
  assert.match(middlewareSource, /decodeSessionCookie/);
  assert.match(middlewareSource, /SESSION_COOKIE_NAME/);
});

test("recent events route requires session cookie directly in the route", () => {
  const routeSource = readFileSync(new URL("../src/app/api/eventos/recentes/route.ts", import.meta.url), "utf8");

  assert.match(routeSource, /SESSION_COOKIE_NAME/);
  assert.match(routeSource, /decodeSessionCookie/);
  assert.match(routeSource, /error:\s*"unauthorized"/);
  assert.doesNotMatch(routeSource, /getSessionFromRequest/);
});

test("soniel seeds remain ADMIN_GLOBAL", () => {
  const source = readFileSync(new URL("../src/lib/auth.ts", import.meta.url), "utf8");
  assert.match(source, /sonieloficial@gmail\.com[\s\S]*role:\s*"ADMIN_GLOBAL"/);
  assert.match(source, /soniel2013@gmail\.com[\s\S]*role:\s*"ADMIN_GLOBAL"/);
  assert.doesNotMatch(source, /role:\s*"admin"/);
});

test("viewer seed exists with tenant scope and read-only permissions", () => {
  const source = readFileSync(new URL("../src/lib/auth.ts", import.meta.url), "utf8");

  assert.match(source, /viewer@siloops\.com\.br[\s\S]*role:\s*"VIEWER"/);
  assert.match(source, /viewer@siloops\.com\.br[\s\S]*Viewer@2026/);
  assert.match(source, /viewer@siloops\.com\.br[\s\S]*usinas:\s*\["USINA_PADRAO"\]/);
  assert.match(source, /viewer@siloops\.com\.br[\s\S]*unidades:\s*\["UNIDADE_PADRAO"\]/);
  assert.match(source, /viewer@siloops\.com\.br[\s\S]*read:dashboard/);
  assert.match(source, /viewer@siloops\.com\.br[\s\S]*read:eventos/);
  assert.match(source, /viewer@siloops\.com\.br[\s\S]*read:operacoes/);
  assert.match(source, /viewer@siloops\.com\.br[\s\S]*read:equipamentos/);
  assert.match(source, /viewer@siloops\.com\.br/);
});

test("tenant isolation keeps ADMIN_GLOBAL broad and VIEWER constrained to default scope", () => {
  const authSource = readFileSync(new URL("../src/lib/auth.ts", import.meta.url), "utf8");
  const eventsSource = readFileSync(new URL("../src/app/api/eventos/route.ts", import.meta.url), "utf8");
  const operacoesSource = readFileSync(new URL("../src/app/api/operacoes/route.ts", import.meta.url), "utf8");
  const ativasSource = readFileSync(new URL("../src/app/api/operacoes/ativas/route.ts", import.meta.url), "utf8");
  const equipamentosSource = readFileSync(new URL("../src/app/api/equipamentos/status/route.ts", import.meta.url), "utf8");

  assert.match(authSource, /export function filterItemsBySessionScope/);
  assert.match(eventsSource, /filterItemsBySessionScope/);
  assert.match(operacoesSource, /filterItemsBySessionScope/);
  assert.match(ativasSource, /filterItemsBySessionScope/);
  assert.match(equipamentosSource, /filterItemsBySessionScope/);

  const items = [
    { id: "default", empresa_id: "SILOOPS", usina_id: "USINA_PADRAO", unidade_id: "UNIDADE_PADRAO" },
    { id: "blocked", empresa_id: "SILOOPS", usina_id: "USINA_TESTE_BLOQUEADA", unidade_id: "UNIDADE_TESTE_BLOQUEADA" },
    { id: "legacy" },
  ];
  const viewer = {
    role: "VIEWER",
    empresa_id: "SILOOPS",
    usinas: ["USINA_PADRAO"],
    unidades: ["UNIDADE_PADRAO"],
  };
  const admin = { role: "ADMIN_GLOBAL" };

  const scopeLike = (rows, profile) => {
    if (!profile || profile.role === "ADMIN_GLOBAL") return rows;
    return rows.filter((item) => {
      const empresa_id = item.empresa_id || "SILOOPS";
      const usina_id = item.usina_id || "USINA_PADRAO";
      const unidade_id = item.unidade_id || "UNIDADE_PADRAO";
      return empresa_id === profile.empresa_id
        && (profile.usinas.includes("*") || profile.usinas.includes(usina_id))
        && (profile.unidades.includes("*") || profile.unidades.includes(unidade_id));
    });
  };

  assert.deepEqual(scopeLike(items, admin).map((item) => item.id), ["default", "blocked", "legacy"]);
  assert.deepEqual(scopeLike(items, viewer).map((item) => item.id), ["default", "legacy"]);
  assert.doesNotMatch(JSON.stringify(scopeLike(items, viewer)), /USINA_TESTE_BLOQUEADA|UNIDADE_TESTE_BLOQUEADA/);
});

test("admin tenant routes exist and are protected with 401 and 403 guards", () => {
  const empresasRoute = readFileSync(new URL("../src/app/api/admin/empresas/route.ts", import.meta.url), "utf8");
  const usinasRoute = readFileSync(new URL("../src/app/api/admin/usinas/route.ts", import.meta.url), "utf8");
  const unidadesRoute = readFileSync(new URL("../src/app/api/admin/unidades/route.ts", import.meta.url), "utf8");
  const helpersSource = readFileSync(new URL("../src/app/api/admin/_helpers.ts", import.meta.url), "utf8");
  const storeSource = readFileSync(new URL("../src/lib/admin-tenant-store.ts", import.meta.url), "utf8");

  [empresasRoute, usinasRoute, unidadesRoute].forEach((source) => {
    assert.match(source, /unauthorized/);
    assert.match(source, /forbidden/);
    assert.match(source, /GET/);
    assert.match(source, /POST/);
  });

  assert.match(helpersSource, /canReadAdminTenant/);
  assert.match(helpersSource, /canWriteAdminTenant/);
  assert.match(storeSource, /TENANT_STORE_PATH/);
  assert.match(storeSource, /upsertEmpresa/);
  assert.match(storeSource, /upsertUsina/);
  assert.match(storeSource, /upsertUnidade/);
  assert.match(storeSource, /getAccessibleEmpresaIds/);
  assert.match(storeSource, /getAccessibleUsinaIds/);
  assert.match(storeSource, /getAccessibleUnidadeIds/);
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
