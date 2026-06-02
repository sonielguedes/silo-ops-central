# Auth Session

## Objetivo
Documentar o contrato real de autenticacao por sessao da Central SILO OPS.

## Arquivos envolvidos
- `src/lib/auth.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/lib/auth-context.tsx`
- `src/middleware.ts`

## Contrato tecnico
- Login usa `POST /api/auth/login` com `email`, `password` e `returnTo`.
- Sucesso responde `200` com `{ ok: true, session, profile, returnTo }`.
- O cookie `sil_session` e gravado com `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=8h` e `Secure` em producao.
- Logout usa `POST /api/auth/logout` e limpa `sil_session`.
- `decodeSessionCookie()` valida `email`, `expiry` e `mode`, rejeitando payload invalido ou expirado.
- `buildSession()` monta a sessao e `buildVisualProfile()` monta o perfil visual.
- `normalizeRole()` converte `admin` e `ADMIN` para `ADMIN_GLOBAL`.
- O middleware libera rotas publicas e redireciona paginas privadas sem sessao para `/login?returnTo=...`.

## Rotas publicas e protegidas
- Publicas: `/login`, `/api/auth/login`, `/api/auth/logout`, `/api/health`
- Protegidas por middleware: paginas internas sem cookie valido
- APIs protegidas usam 401 JSON e nao redirect HTML

## Validacao curl
```bash
curl -i -c cookies.txt \
  -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"sonieloficial@gmail.com","password":"SiloOps@2026","returnTo":"/"}'
```

```bash
curl -i -b cookies.txt -X POST http://localhost:3000/api/auth/logout
```

```bash
curl -i -b cookies.txt http://localhost:3000/api/eventos
```

## Riscos conhecidos
- Cookie expirado ou corrompido cai como sessao inexistente.
- O perfil visual e derivado da sessao; nao e uma fonte separada de verdade.
- Alias legados de role ainda precisam ser mantidos como compatibilidade ate os consumidores migrarem.

## Status
`implementado`
