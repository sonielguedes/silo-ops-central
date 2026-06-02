# API Equipamentos

## Objetivo
Documentar o comportamento real de `/api/equipamentos/status` e do wrapper `/api/equipamentos`.

## Arquivos envolvidos
- `src/app/api/equipamentos/status/route.ts`
- `src/app/api/equipamentos/route.ts`
- `src/lib/auth.ts`
- `src/lib/api.ts`
- `tests/api-endpoints.test.mjs`

## Contrato tecnico
- `GET /api/equipamentos/status` exige `sil_session`.
- Sem cookie valido, responde `401` JSON `{ "error": "unauthorized" }`.
- Com cookie valido, mantem o contrato atual da resposta.
- `ADMIN_GLOBAL` ve tudo.
- Registros sem tenant recebem defaults legados:
  - `empresa_id = "SILOOPS"`
  - `usina_id = "USINA_PADRAO"`
  - `unidade_id = "UNIDADE_PADRAO"`
- `GET /api/equipamentos` apenas repassa `req` para `./status/route`.
- A normalizacao de GPS dos dados de equipamento acontece no consumo do cliente via `src/lib/api.ts` e helpers da interface, nao neste route handler.

## Validacao curl
```bash
curl -i http://localhost:3000/api/equipamentos/status
```

```bash
curl -i -c cookies.txt \
  -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"sonieloficial@gmail.com","password":"SiloOps@2026","returnTo":"/"}'
```

```bash
curl -i -b cookies.txt http://localhost:3000/api/equipamentos/status
curl -i -b cookies.txt http://localhost:3000/api/equipamentos
```

## Riscos conhecidos
- O wrapper `/api/equipamentos` depende do contrato de `status/route.ts`; quebrar um quebra o outro.
- A normalizacao de GPS nao esta no backend da rota, entao o contrato do cliente precisa permanecer alinhado.

## Status
`implementado`
