# Tenant Scope

## Objetivo
Documentar o tenant scope real usado nas rotas operacionais da Central SILO OPS.

## Arquivos envolvidos
- `src/lib/auth.ts`
- `src/app/api/eventos/route.ts`
- `src/app/api/eventos/recentes/route.ts`
- `src/app/api/equipamentos/status/route.ts`
- `src/app/api/operacoes/route.ts`
- `src/app/api/operacoes/ativas/route.ts`

## Contrato tecnico
- `getScopeFilter(profile)` retorna `null` para `ADMIN_GLOBAL`.
- Para perfis menores, retorna `empresa_id`, `usina_ids` e `unidade_ids`.
- `applyScopeToUrl(url, profile)` injeta `empresa_id`, `usina_id` e `unidade_id` na URL upstream.
- `normalizeScopeFields()` aplica defaults legados quando o payload vem sem escopo:
  - `SILOOPS`
  - `USINA_PADRAO`
  - `UNIDADE_PADRAO`
- `canAccessEmpresa()`, `canAccessUsina()` e `canAccessUnidade()` validam o item contra a sessao.
- `isAdminGlobal()` desliga o filtro.

## Regras de seguranca
- `ADMIN_GLOBAL` acessa tudo.
- O filtro real para roles menores existe em rotas validas, mas nao e universal em toda a base ainda.
- A normalizacao de defaults e uma compatibilidade legada, nao uma modelagem multi-tenant completa.

## Validacao curl
```bash
curl -i -c cookies.txt \
  -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"sonieloficial@gmail.com","password":"SiloOps@2026","returnTo":"/"}'
```

```bash
curl -i -b cookies.txt http://localhost:3000/api/eventos
```

## Riscos conhecidos
- Novas rotas podem esquecer de aplicar o scope do servidor.
- Query string manual nao deve ser tratada como autorizacao.

## Status
`parcial`
