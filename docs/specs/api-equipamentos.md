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

## Campos normalizados (3.4M)

A partir da fase 3.4M, cada item retornado por `/api/equipamentos/status` e `/api/equipamentos/[tratorId]/detalhes` inclui campos normalizados adicionais:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `presence` | `"ONLINE" \| "INSTAVEL" \| "OFFLINE"` | Presenca tecnica derivada de heartbeat/last_seen/updated_at |
| `estado_operacional` | `"TRABALHANDO" \| "PARADO" \| "PAUSADO" \| "EM_MOVIMENTO" \| "SEM_OPERACAO" \| "DESCONHECIDO"` | Estado operacional derivado de operacao/parada/velocidade |
| `operacao_atual` | `string \| null` | Operacao ativa — somente se jornada/operacao valida e equipamento online/instavel |
| `ultima_operacao_conhecida` | `string \| null` | Ultima operacao/evento conhecido, mesmo se equipamento offline |
| `status_resumo` | `string \| null` | Texto curto para UI: "Online trabalhando", "Offline — ultima operacao: X" |

O normalizador central esta em `src/lib/equipment-state.ts`.

### Regras de normalizacao
1. `presence` vem exclusivamente de heartbeat/updated_at/last_seen.
2. `estado_operacional` vem de operacao/parada/evento/velocidade.
3. Se `presence=OFFLINE`, nunca mostra "trabalhando" no `status_resumo`.
4. Se offline e houver operacao anterior, mostra como `ultima_operacao_conhecida`.
5. Se ha parada ativa, `estado_operacional=PARADO`.
6. Se velocidade > 5 e online/instavel, `estado_operacional=EM_MOVIMENTO`.
7. Se operacao ativa valida e sem parada, `estado_operacional=TRABALHANDO`.
8. Se nao houver operacao ativa, `estado_operacional=SEM_OPERACAO`.
9. Valores legados `UNKNOWN` sao convertidos para `DESCONHECIDO`.

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
