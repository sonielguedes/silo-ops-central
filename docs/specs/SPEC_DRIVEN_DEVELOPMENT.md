# SPEC DRIVEN DEVELOPMENT - SILO OPS CENTRAL

## 1. Identidade do projeto

- **Produto:** SILO OPS Central
- **Nome do sistema:** SILO OPS - Sistema de Inteligencia Logistica Operacional
- **Dominios:** `app.siloops.com.br`, `api.siloops.com.br`, `mqtt.siloops.com.br`
- **Objetivo:** central agricola operacional para monitoramento, telemetria, rastro, apontamentos, cadastros e relatorios.

## 2. Arquitetura atual

- **Frontend:** Next.js App Router
- **Deploy:** Docker + Nginx
- **Persistencia local:** JSON server-side em `/app/data`
- **Seguranca:** tenant-aware
- **Perfis principais:** `ADMIN_GLOBAL`, `ADMIN_EMPRESA`, `VIEWER`
- **Integração interna:** usar helpers locais antes de fetch HTTP interno quando possivel
- **Collector:** por cron com `COLLECTOR_TOKEN`
- **Rastro:** persistido em `equipment-trail.json`

## 3. Fases concluidas

### 3.1 Autenticacao e tenant guard

- **Objetivo:** impedir acesso sem sessao e isolar escopos por tenant.
- **Arquivos principais:** `src/lib/auth.ts`, `src/lib/auth-context.tsx`, `src/app/api/auth/*`, `src/middleware.ts`
- **Rotas/API:** login, logout, guards de leitura/escrita, session cookie
- **Aceite:** `401` sem sessao; `VIEWER` apenas leitura; admin respeita escopo
- **Hash conhecido:** base consolidada no estado atual do branch

### 3.2 Admin tenants

- **Objetivo:** permitir CRUD tenant-aware para empresas, usinas e unidades.
- **Arquivos principais:** `src/app/admin/empresas/*`, `src/app/admin/usinas/*`, `src/app/admin/unidades/*`, `src/lib/admin-tenant-*`
- **Rotas/API:** `/api/admin/empresas`, `/api/admin/usinas`, `/api/admin/unidades`
- **Aceite:** tenant isolado, roles administrativas com escrita, viewer sem escrita
- **Hash conhecido:** base consolidada no estado atual do branch

### 3.3 Viewer tenant

- **Objetivo:** habilitar leitura controlada para `VIEWER` sem liberar escrita.
- **Arquivos principais:** `src/lib/auth.ts`, `src/middleware.ts`, `src/components/Sidebar.tsx`
- **Rotas/API:** menu e rotas de leitura do tenant
- **Aceite:** viewer navega e lê, mas nao cria/edita
- **Hash conhecido:** base consolidada no estado atual do branch

### 3.4 Equipamentos/status

- **Objetivo:** expor a frota operacional em tempo real via `/api/equipamentos/status` e wrappers de consumo.
- **Arquivos principais:** `src/lib/api.ts`, `src/app/api/equipamentos/status/route.ts`, `src/app/api/equipamentos/route.ts`
- **Rotas/API:** `/api/equipamentos/status`, `/api/equipamentos`
- **Aceite:** status funcional, tenant-aware, consumo do cliente alinhado
- **Hash conhecido:** base consolidada no estado atual do branch

### 3.5 Operacoes ativas

- **Objetivo:** listar operacoes atuais com contexto operacional util para painel, rastro e drawer.
- **Arquivos principais:** `src/app/api/operacoes/ativas/route.ts`, `src/app/operacoes/page.tsx`, `src/lib/api.ts`
- **Rotas/API:** `/api/operacoes/ativas`, `/operacoes`
- **Aceite:** leitura segura, sem quebrar campos nulos
- **Hash conhecido:** base consolidada no estado atual do branch

### 3.6 Rastro por equipamento

- **Objetivo:** abrir historico por `tratorId` e desenhar linha temporal navegavel.
- **Arquivos principais:** `src/app/equipamentos/[tratorId]/rastro/page.tsx`, `src/components/TrailMap.tsx`, `src/lib/trail-map.ts`, `src/lib/equipment-trail-store.ts`
- **Rotas/API:** `/equipamentos/[tratorId]/rastro`, `/api/equipamentos/[tratorId]/rastro`
- **Aceite:** rastro com tooltip, setas, salto GPS, fallback visual e sem indexacao vazia
- **Hash conhecido:** `8c1ab00` como marco de enriquecimento com estado operacional

### 3.7 Collector admin

- **Objetivo:** manter a coleta de telemetria via admin/cron com persistencia confiavel.
- **Arquivos principais:** `src/app/api/equipamentos/trail/collect/route.ts`, `src/lib/equipment-trail-store.ts`, docs de collector
- **Rotas/API:** `/api/equipamentos/trail/collect`
- **Aceite:** admin protegido, persistencia incremental, sem mexer no cron fora de fase propria
- **Hash conhecido:** base consolidada no estado atual do branch

### 3.8 Collector token auth

- **Objetivo:** autenticar a coleta com `COLLECTOR_TOKEN`.
- **Arquivos principais:** `src/app/api/equipamentos/trail/collect/route.ts`, docs do collector
- **Rotas/API:** token header para coleta
- **Aceite:** sem token, 401/403; com token, coleta controlada
- **Hash conhecido:** base consolidada no estado atual do branch

### 3.9 Filtro de GPS jitter

- **Objetivo:** eliminar ruido de pontos quase identicos e manter trajetoria real.
- **Arquivos principais:** `src/lib/equipment-trail-store.ts`, `src/lib/trail-map.ts`
- **Rotas/API:** leitura do rastro e persistencia dos pontos
- **Aceite:** elimina jitter sem apagar movimento real
- **Hash conhecido:** base consolidada no estado atual do branch

### 3.10 Mapa com camada satelite

- **Objetivo:** deixar o mapa mais legivel em operacao real.
- **Arquivos principais:** `src/components/TrailMap.tsx`, `src/components/MapComponent.tsx`
- **Rotas/API:** mapa operacional e rastro
- **Aceite:** satelite como padrao, fallback para mapa
- **Hash conhecido:** `72d29f4`

### 3.11 Navegacao de rastro

- **Objetivo:** navegar o rastro dos equipamentos com continuidade operacional.
- **Arquivos principais:** `src/app/equipamentos/rastro/page.tsx`, `src/components/TrailMap.tsx`
- **Rotas/API:** `/equipamentos/rastro`, `/api/equipamentos/[tratorId]/rastro`
- **Aceite:** troca de equipamento, tooltip rico, leitura visual confiavel
- **Hash conhecido:** `fddc81c`

### 3.12 Drawer de detalhes do equipamento

- **Objetivo:** abrir painel lateral com dados operacionais completos ao clicar em um equipamento.
- **Arquivos principais:** `src/components/EquipmentDetailsDrawer.tsx`, `src/lib/equipment-details.ts`, `src/app/api/equipamentos/[tratorId]/detalhes/route.ts`
- **Rotas/API:** `/api/equipamentos/[tratorId]/detalhes`, `/mapa`, `/equipamentos`
- **Aceite:** drawer reutilizavel, loading/empty/error, acoes para rastro/eventos/operacao
- **Hash conhecido:** `1074a3f`

### 3.13 Normalizacao de presenca tecnica x estado operacional

- **Objetivo:** separar presenca tecnica, estado operacional e ultima operacao conhecida.
- **Arquivos principais:** `src/lib/equipment-state.ts`, `src/lib/equipment-details.ts`, `src/lib/api.ts`, `src/components/EquipmentDetailsDrawer.tsx`
- **Rotas/API:** `/api/equipamentos/status`, `/api/equipamentos/[tratorId]/detalhes`, `/mapa`, `/equipamentos`
- **Aceite:** `OFFLINE` nao vira "trabalhando"; `status_resumo` e campos normalizados sempre coerentes
- **Hash conhecido:** `ccf7bae`

### 3.14 Reorganizacao da Sidebar e cadastros operacionais placeholders

- **Objetivo:** agrupar o menu em blocos operacionais e preparar o terreno para cadastros reais.
- **Arquivos principais:** `src/components/Sidebar.tsx`, `src/components/OperationalRegistryShell.tsx`, `src/app/cadastros/*`, `src/app/telemetria/conectividade/page.tsx`, `src/app/comando-online/page.tsx`
- **Rotas/API:** `/cadastros/*`, `/telemetria/conectividade`, `/comando-online`
- **Aceite:** menu reorganizado, rotas antigas preservadas, viewer em leitura, admin com escrita onde ja existia
- **Hash conhecido:** `a50852c`

## 4. Fases em andamento

### 4.1 Cadastro mestre real de equipamentos

- **Objetivo:** transformar `/equipamentos` em cadastro mestre consolidado sem quebrar monitoramento.
- **Arquivos previstos:** `src/lib/equipment-master-store.ts`, `src/app/api/admin/equipamentos/*`, `src/app/equipamentos/page.tsx`, `src/lib/equipment-details.ts`, `src/components/EquipmentDetailsDrawer.tsx`
- **Rotas/API:** `/api/admin/equipamentos`, `/api/admin/equipamentos/[id]`
- **Regra-chave:** master + status = visão consolidada; master sem status = `Sem telemetria`; status sem master = `Não cadastrado`

## 5. Proximas fases planejadas

- **3.5B** Tipos, modelos, grupos, perfis e estados operacionais reais
- **3.5C** Operadores, cargos e equipes reais
- **3.5D** Operacoes e codigos de parada reais
- **3.6** Conectividade operacional
- **3.6A** Relatorios operacionais
- **3.7** Integracao APK -> Central
- **3.8** Integracao MQTT
- **3.9** Banco SQL/Postgres
- **4.0** Piloto com cliente
- **4.1** Hardening producao
- **4.2** Multiempresa comercial

## 6. Regras tecnicas obrigatorias

- Nao quebrar rotas antigas.
- Nao remover fallback.
- Nao fazer fetch HTTP interno quando helper local resolver.
- Sempre respeitar tenant.
- `VIEWER` nunca escreve.
- `ADMIN` escreve conforme escopo.
- JSON em `/app/data` deve ser compativel com migracao futura.
- Collector/cron nao deve ser alterado sem fase propria.
- Toda fase deve atualizar `docs/specs/roadmap.md`.
- Toda fase deve ter teste e build antes do commit.

## 7. Padrao de validacao

Executar sempre:

```bash
node --test tests/api-endpoints.test.mjs tests/admin-tenant-store.test.mjs tests/equipment-trail-store.test.mjs
npm run build
```

Quando houver novo store/API, criar teste especifico antes do merge.

## 8. Padrao de commit

- `docs: add/update spec ...`
- `feat: ...`
- `fix: ...`
- `chore: ...`

## 9. Criterios para cliente testar

- Login admin/viewer funciona.
- Mapa abre.
- Equipamentos aparecem.
- Drawer abre.
- Rastro abre.
- Cadastros placeholders abrem.
- Status nao confunde offline com trabalhando.
- Coleta por token funciona.
- Logs nao exibem erro critico.

## 10. Riscos conhecidos

- API inativa no header.
- Dados JSON ainda nao sao banco.
- Sem CRUD real completo nos cadastros auxiliares.
- Status geral pode nao ter a mesma riqueza do detalhe.
- Dependencia de cron/collector.
- Falta integracao real com APK/MQTT.

