# API Eventos

## Objetivo
Documentar o comportamento real de `/api/eventos` e `/api/eventos/recentes`.

## Arquivos envolvidos
- `src/app/api/eventos/route.ts`
- `src/app/api/eventos/recentes/route.ts`
- `src/lib/auth.ts`
- `tests/api-endpoints.test.mjs`

## Contrato tecnico
- Ambas as rotas exigem `sil_session`.
- Sem cookie valido, respondem `401` JSON `{ "error": "unauthorized" }`.
- Com cookie valido, mantem o contrato atual de resposta.
- `ADMIN_GLOBAL` ve tudo; roles menores passam por filtro de tenant.
- `GET /api/eventos` chama o upstream em `/api/eventos`.
- `GET /api/eventos/recentes` tenta upstream em `/api/eventos` e `/api/eventos/recentes`.
- Os payloads sao normalizados e os campos de tenant recebem defaults legados quando faltam:
  - `empresa_id = "SILOOPS"`
  - `usina_id = "USINA_PADRAO"`
  - `unidade_id = "UNIDADE_PADRAO"`

## Validacao curl
```bash
curl -i http://localhost:3000/api/eventos
```

```bash
curl -i -c cookies.txt \
  -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"sonieloficial@gmail.com","password":"SiloOps@2026","returnTo":"/"}'
```

```bash
curl -i -b cookies.txt http://localhost:3000/api/eventos
curl -i -b cookies.txt http://localhost:3000/api/eventos/recentes
```

## Riscos conhecidos
- Se o upstream falhar, a rota pode retornar payload tecnico vazio em vez de dados reais.
- A normalizacao de tenant existe para compatibilidade legada, nao para modelar multi-tenant completo.

## Status
`implementado`
