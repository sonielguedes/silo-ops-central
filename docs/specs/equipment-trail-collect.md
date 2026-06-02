# Equipment Trail Collect

## Objetivo
Coletar pontos GPS do status operacional e persistir no historico local de rastro.

## Arquivos envolvidos
- `src/app/api/equipamentos/trail/collect/route.ts`
- `src/app/api/equipamentos/status/route.ts`
- `src/lib/equipment-status-trail.ts`
- `src/lib/equipment-trail-store.ts`

## Contrato tecnico
- `POST /api/equipamentos/trail/collect`
- Autenticacao por `x-collector-token` quando o header existe.
- Fallback por `sil_session` com `ADMIN_GLOBAL` quando o header nao existe.
- `VIEWER` continua bloqueado com `403`.
- O coletor busca o status internamente, persiste os pontos validos e retorna o delta coletado.
- Sucesso responde `{ collected, source_points, upstream_status }`.
- Em falha real, a rota retorna `500` com `collector_failed`.

## Seguranca
- Sem cookie e sem token: `401 { "error": "unauthorized" }`
- Token invalido: `401 { "error": "unauthorized" }`
- Nao admin: `403 { "error": "forbidden" }`
- O fluxo roda sem navegador aberto, via cron ou chamada server-to-server.

## Uso
```bash
curl -b admin.cookie -X POST /api/equipamentos/trail/collect
curl -b admin.cookie -X POST http://localhost:3000/api/equipamentos/trail/collect
```

```bash
curl -X POST http://localhost:3000/api/equipamentos/trail/collect \
  -H "x-collector-token: $COLLECTOR_TOKEN"
```

```cron
* * * * * curl -sS -X POST http://127.0.0.1:3000/api/equipamentos/trail/collect \
  -H "x-collector-token: $COLLECTOR_TOKEN" >/tmp/silo-trail-collect.log 2>&1
```

## Status
implementado

## Riscos conhecidos
- O COLLECTOR_TOKEN foi exposto em terminal/chat e precisa rotacao imediata.
- Se o status vier sem coordenadas validas, nada e persistido.
- Store JSON ainda nao substitui um datastore transacional.
