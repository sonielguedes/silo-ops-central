# Auth Session

## Objetivo
Padronizar o contrato de autenticação por sessão da Central SILO OPS. O sistema usa cookie `sil_session`, sessão serializada em JSON e resposta de login com `session` + `profile` + `returnTo`.

## Arquivos envolvidos
- `src/lib/auth.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/lib/auth-context.tsx`
- `src/middleware.ts`

## Contrato técnico
- `POST /api/auth/login` aceita `email`, `password` e `returnTo`.
- Em sucesso, responde `200` com `{ ok: true, session, profile, returnTo }`.
- O cookie `sil_session` é gravado com `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=8h` e `Secure` em produção.
- `decodeSessionCookie()` valida `email`, `expiry` e `mode`, rejeitando payload inválido ou expirado.
- `buildSession()` monta a sessão a partir dos seeds de usuário.
- `buildVisualProfile()` gera o perfil visual usado no frontend.
- `normalizeRole()` converte aliases legados como `admin`/`ADMIN` para `ADMIN_GLOBAL`.

## Regras de segurança
- O cookie não é acessível por JavaScript porque é `HttpOnly`.
- Sessão expirada ou corrompida é tratada como inexistente.
- O middleware usa `decodeSessionCookie()` apenas para liberar páginas privadas; rotas `/api/` continuam fora do redirect HTML.
- Usuários oficiais `sonieloficial@gmail.com` e `soniel2013@gmail.com` resolvem para `ADMIN_GLOBAL`.

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
