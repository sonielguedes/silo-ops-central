# API Eventos

## Objetivo
Documentar o contrato real das rotas de eventos operacionais: `/api/eventos` e `/api/eventos/recentes`.

## Arquivos envolvidos
- `src/app/api/eventos/route.ts`
- `src/app/api/eventos/recentes/route.ts`
- `src/lib/auth.ts`
- `tests/api-endpoints.test.mjs`

## Contrato técnico
- `GET /api/eventos`
  - exige `sil_session`
  - sem cookie válido retorna `401` JSON `{ "error": "unauthorized" }`
  - com sessão válida chama o backend upstream em `/api/eventos`
  - em `ADMIN_GLOBAL`, não aplica filtro de tenant
  - em outros perfis, filtra por `empresa_id`, `usina_id` e `unidade_id`
  - resposta de sucesso mantém `{ eventos, status_tecnico: "ok", upstream_status }`
  - fallback técnico usa `status_tecnico`, `upstream_status` e `reason`

- `GET /api/eventos/recentes`
  - exige `sil_session`
  - sem cookie válido retorna `401` JSON `{ "error": "unauthorized" }`
  - com sessão válida tenta upstream em `/api/eventos` e `/api/eventos/recentes`
  - resposta de sucesso mantém `{ eventos, status_tecnico, upstream_status }`

## Regras de segurança
- Nenhuma das duas rotas pode redirecionar HTML.
- A ausência de cookie é tratada como negação explícita, não como fallback silencioso.
- `ADMIN_GLOBAL` vê tudo; demais perfis passam por filtro de tenant.
- Eventos upstream são normalizados antes da resposta.

## Exemplos de curl
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

## Status
`implementado`
