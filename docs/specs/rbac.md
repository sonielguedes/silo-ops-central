# RBAC

## Objetivo
Documentar o modelo de autorização por papel e por módulo atualmente implementado na Central SILO OPS.

## Arquivos envolvidos
- `src/lib/auth.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/eventos/route.ts`
- `src/app/api/eventos/recentes/route.ts`
- `src/app/api/equipamentos/status/route.ts`
- `src/app/api/operacoes/route.ts`
- `src/app/api/operacoes/ativas/route.ts`

## Contrato técnico
- `Role` inclui `ADMIN_GLOBAL`, `ADMIN_EMPRESA`, `GESTOR_USINA`, `GESTOR_UNIDADE`, `COA`, `VIEWER` e `OPERADOR_APK`.
- `USER_SEEDS` define os dois usuários oficiais com `role: "ADMIN_GLOBAL"`.
- `isAdminGlobal()` faz bypass do RBAC para `ADMIN_GLOBAL`.
- `canAccessModule()` avalia permissão por módulo.
- `getScopeFilter()` retorna `null` para `ADMIN_GLOBAL`; para os demais, retorna `empresa_id`, `usina_ids` e `unidade_ids`.
- `normalizeRole()` converte aliases legados (`admin`, `ADMIN`) para `ADMIN_GLOBAL`.

## Regras de segurança
- A saída da autenticação não deve usar `admin` minúsculo.
- O bypass administrativo existe apenas para `ADMIN_GLOBAL`.
- Usuários fora de `ADMIN_GLOBAL` dependem de scope e filtros de item.
- O RBAC é aplicado em rotas que leem dados operacionais; ele não é uma política global automática em todas as rotas.

## Exemplos de curl
```bash
curl -i -c cookies.txt \
  -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"soniel2013@gmail.com","password":"SiloOps@2026","returnTo":"/"}'
```

```bash
curl -i -b cookies.txt http://localhost:3000/api/eventos/recentes
```

## Status
`implementado`
