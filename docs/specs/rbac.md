# RBAC

## Objetivo
Documentar o modelo real de papeis e permissao usado pela Central SILO OPS.

## Arquivos envolvidos
- `src/lib/auth.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/eventos/route.ts`
- `src/app/api/eventos/recentes/route.ts`
- `src/app/api/equipamentos/status/route.ts`
- `src/app/api/operacoes/route.ts`
- `src/app/api/operacoes/ativas/route.ts`

## Contrato tecnico
- `Role` inclui `ADMIN_GLOBAL`, `ADMIN_EMPRESA`, `GESTOR_USINA`, `GESTOR_UNIDADE`, `COA`, `VIEWER` e `OPERADOR_APK`.
- `USER_SEEDS` define os usuarios oficiais com `role: "ADMIN_GLOBAL"`.
- `isAdminGlobal()` faz bypass total do RBAC.
- `canAccessModule()` avalia acesso por modulo.
- `getScopeFilter()` retorna `null` para `ADMIN_GLOBAL` e retorna `empresa_id`, `usina_ids` e `unidade_ids` para os demais perfis.
- `SessionPayload` inclui `email`, `name`, `role`, `empresa_id`, `usinas`, `unidades`, `permissions`, `expiry` e `mode`.
- `normalizeRole()` converte aliases legados para `ADMIN_GLOBAL`.

## Regras de seguranca
- `ADMIN_GLOBAL` e o unico bypass completo.
- Nao existe saida de autenticacao com `admin` minusculo.
- Perfis menores dependem de scope e filtros de item nas rotas que ja aplicam esse padrao.
- Roles futuras ainda nao estao implementadas como politica de acesso real; devem ser tratadas como pendentes ate haver codigo.

## Validacao curl
```bash
curl -i -c cookies.txt \
  -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"soniel2013@gmail.com","password":"SiloOps@2026","returnTo":"/"}'
```

```bash
curl -i -b cookies.txt http://localhost:3000/api/eventos/recentes
```

## Riscos conhecidos
- Se um novo papel entrar sem update em `ROLE_MODULE_ACCESS`, o comportamento vira `VIEWER`/fallback funcional.
- O RBAC nao e uma camada unica e global; parte da autorizacao ainda esta distribuida nas rotas.

## Status
`parcial`
