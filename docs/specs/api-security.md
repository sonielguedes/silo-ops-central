# API Security

## Objetivo
Descrever o padrao de seguranca HTTP das rotas da API da Central SILO OPS: autenticacao explicita, resposta JSON e ausencia de redirect HTML para rotas `/api/`.

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
- O middleware redireciona paginas privadas para `/login`, mas ignora paths com prefixo `/api/`.
- `/api/auth/login` emite cookie `sil_session` com `HttpOnly`.
- `/api/eventos` e `/api/eventos/recentes` retornam `401` JSON `{ "error": "unauthorized" }` quando nao ha cookie valido.
- As rotas operacionais protegidas seguem o mesmo padrao de `401` JSON quando a sessao e ausente ou invalida.
- Rotas publicas continuam publicas por design, por exemplo health e auth.

## Rotas protegidas ja validadas
- `GET /api/eventos`
- `GET /api/eventos/recentes`
- `GET /api/equipamentos/status`
- `GET /api/operacoes`
- `GET /api/operacoes/ativas`
- Todas retornam `401` JSON com `{"error":"unauthorized"}` sem cookie valido.
- Todas mantem o contrato de resposta atual quando a sessao existe.

## Regras de seguranca
- API nao pode responder com HTML redirect.
- O contrato de erro de autenticacao e JSON, nao pagina.
- Cookie de sessao nao deve ser lido pelo cliente.
- A politica e hibrida: algumas rotas sao publicas, outras exigem sessao. Isso e intencional no estado atual.

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
```

## Status
`parcial`
