# API Security

## Objetivo
Documentar o padrao real de seguranca para APIs protegidas e publicas da Central SILO OPS.

## Arquivos envolvidos
- `src/middleware.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/eventos/route.ts`
- `src/app/api/eventos/recentes/route.ts`
- `src/app/api/equipamentos/status/route.ts`
- `src/app/api/operacoes/route.ts`
- `src/app/api/operacoes/ativas/route.ts`
- `tests/api-endpoints.test.mjs`

## Contrato tecnico
- APIs protegidas retornam `401` JSON `{ "error": "unauthorized" }` quando `sil_session` nao existe ou e invalida.
- APIs protegidas nao redirecionam para HTML.
- `/api/eventos`, `/api/eventos/recentes`, `/api/equipamentos/status`, `/api/operacoes` e `/api/operacoes/ativas` ja estao validadas com esse padrao.
- O middleware redireciona paginas privadas para `/login`, mas nao interfere em `/api/`.

## Rotas publicas
- `/api/health`
- `/api/auth/login`
- `/api/auth/logout`
- Rotas publicas continuam publicas por design.

## Validacao curl
```bash
curl -i http://localhost:3000/api/eventos
```

```bash
curl -i http://localhost:3000/api/equipamentos/status
```

```bash
curl -i -c cookies.txt \
  -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"sonieloficial@gmail.com","password":"SiloOps@2026","returnTo":"/"}'
```

## Riscos conhecidos
- Se uma nova rota protegida for criada sem o guard, ela vira inconsistente com o padrao aprovado.
- Rotas publicas e protegidas coexistem; isso e intencional no estado atual.

## Status
`implementado`
