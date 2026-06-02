# Tenant Scope

## Objetivo
Explicar o modelo de tenant scope usado para limitar leitura de dados operacionais por empresa, usina e unidade.

## Arquivos envolvidos
- `src/lib/auth.ts`
- `src/app/api/eventos/route.ts`
- `src/app/api/eventos/recentes/route.ts`
- `src/app/api/equipamentos/status/route.ts`
- `src/app/api/operacoes/route.ts`
- `src/app/api/operacoes/ativas/route.ts`

## Contrato técnico
- `getScopeFilter(profile)`:
  - retorna `null` para `ADMIN_GLOBAL`
  - retorna `{ empresa_id, usina_ids, unidade_ids }` para os demais perfis
- `applyScopeToUrl(url, profile)`:
  - adiciona `empresa_id`, `usina_id` e `unidade_id` na URL upstream
  - usa parâmetros repetidos para listas
- `normalizeScopeFields()`:
  - preenche `empresa_id`, `usina_id` e `unidade_id` com defaults técnicos quando faltam
- `canAccessEmpresa()`, `canAccessUsina()`, `canAccessUnidade()`:
  - validam se um item pertence ao tenant da sessão
- `isAdminGlobal()`:
  - desabilita o filtro para `ADMIN_GLOBAL`

## Regras de segurança
- O tenant scope é aplicado no servidor, não no cliente.
- `ADMIN_GLOBAL` é o único bypass completo.
- Perfis não-admin não podem ultrapassar tenant via query string manual.
- Defaults técnicos evitam `undefined` em payloads normalizados.

## Exemplos de curl
```bash
curl -i -c cookies.txt \
  -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"sonieloficial@gmail.com","password":"SiloOps@2026","returnTo":"/"}'
```

```bash
curl -i -b cookies.txt http://localhost:3000/api/eventos
```

## Status
`implementado`
