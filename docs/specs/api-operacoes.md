# API Operacoes

## Objetivo
Documentar o comportamento real de `/api/operacoes` e `/api/operacoes/ativas`.

## Arquivos envolvidos
- `src/app/api/operacoes/route.ts`
- `src/app/api/operacoes/ativas/route.ts`
- `src/lib/auth.ts`
- `tests/api-endpoints.test.mjs`

## Contrato tecnico
- Ambas as rotas exigem `sil_session`.
- Sem cookie valido, respondem `401` JSON `{ "error": "unauthorized" }`.
- Com cookie valido, mantem o contrato atual da rota.
- `ADMIN_GLOBAL` ve tudo.
- Os campos de saida sao normalizados com defaults legados quando o item nao traz escopo:
  - `empresa_id = "SILOOPS"`
  - `usina_id = "USINA_PADRAO"`
  - `unidade_id = "UNIDADE_PADRAO"`
- `GET /api/operacoes` faz proxy para `/api/operacoes/ativas` no backend.
- `GET /api/operacoes/ativas` faz proxy direto para o backend em `/api/operacoes/ativas`.

## Validacao curl
```bash
curl -i http://localhost:3000/api/operacoes
```

```bash
curl -i -c cookies.txt \
  -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"sonieloficial@gmail.com","password":"SiloOps@2026","returnTo":"/"}'
```

```bash
curl -i -b cookies.txt http://localhost:3000/api/operacoes
curl -i -b cookies.txt http://localhost:3000/api/operacoes/ativas
```

## Riscos conhecidos
- `GET /api/operacoes` pode devolver `502` quando o backend cair no catch.
- O status do backend pode variar entre `200` tecnico e erro upstream dependendo da rota.

## Status
`implementado`
