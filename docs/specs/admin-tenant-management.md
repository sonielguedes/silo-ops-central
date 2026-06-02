# Admin Tenant Management

Status: parcial

## Objetivo
Criar uma base administrativa para cadastro de `empresa`, `usina` e `unidade` antes do tenant real em banco.

## Arquivos envolvidos
- `src/lib/admin-tenant-store.ts`
- `src/app/api/admin/_helpers.ts`
- `src/app/api/admin/empresas/route.ts`
- `src/app/api/admin/usinas/route.ts`
- `src/app/api/admin/unidades/route.ts`
- `tests/api-endpoints.test.mjs`
- `tests/admin-tenant-store.test.mjs`

## Contrato tecnico
- `GET /api/admin/empresas`
- `POST /api/admin/empresas`
- `GET /api/admin/usinas`
- `POST /api/admin/usinas`
- `GET /api/admin/unidades`
- `POST /api/admin/unidades`
- Persistencia inicial em JSON via `TENANT_STORE_PATH` ou fallback `/app/data/admin-tenants.json`.
- Modelo:
  - Empresa: `empresa_id`, `nome_empresa`, `status`, `created_at`, `updated_at`
  - Usina: `usina_id`, `empresa_id`, `nome_usina`, `status`, `created_at`, `updated_at`
  - Unidade: `unidade_id`, `usina_id`, `nome_unidade`, `status`, `created_at`, `updated_at`

## Regras de seguranca
- Sem cookie: `401 { "error": "unauthorized" }`
- Nao `ADMIN_GLOBAL`: `403 { "error": "forbidden" }` para escrita
- `VIEWER` e `COA` nao gravam escopo
- Usina exige `empresa_id` existente
- Unidade exige `usina_id` existente
- `ADMIN_EMPRESA` ve apenas sua empresa
- `GESTOR_USINA` ve apenas sua usina
- `GESTOR_UNIDADE` ve apenas sua unidade

## Exemplos curl
```bash
curl -i http://localhost:3000/api/admin/empresas
```
```bash
curl -i -X POST http://localhost:3000/api/admin/empresas \
  -H "content-type: application/json" \
  -d '{"empresa_id":"SILOOPS","nome_empresa":"SILO OPS","status":"ATIVO"}'
```
```bash
curl -i -X POST http://localhost:3000/api/admin/usinas \
  -H "content-type: application/json" \
  -d '{"usina_id":"USINA_PADRAO","empresa_id":"SILOOPS","nome_usina":"Usina Padrão","status":"ATIVO"}'
```
```bash
curl -i -X POST http://localhost:3000/api/admin/unidades \
  -H "content-type: application/json" \
  -d '{"unidade_id":"UNIDADE_PADRAO","usina_id":"USINA_PADRAO","nome_unidade":"Unidade Padrão","status":"ATIVO"}'
```

## Riscos conhecidos
- Persistencia depende de volume no container; nao substitui banco.
- Falha de filesystem derruba o cadastro.
- Nao ha UI administrativa ainda.

