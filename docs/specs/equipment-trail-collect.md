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
- Autenticacao por `sil_session` com `ADMIN_GLOBAL` ou `X-SILO-MOBILE-TOKEN`.
- `x-collector-token` segue aceito por compatibilidade com cron legado.
- `X-SILO-MOBILE-TOKEN` usa `MOBILE_INGEST_TOKEN`.
- `VIEWER` continua bloqueado com `403`.
- O APK envia o trail diretamente com `trator_id`, `frota`, `status_operacional`, tenant e coordenadas.
- A rota valida `trator_id + frota` contra o master e usa `empresa_id/usina_id/unidade_id` do master.
- Sucesso responde `{ collected, source_points, upstream_status, auth }`.
- Em falha real, a rota retorna `400`, `401`, `403` ou `500` conforme o erro.

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
  -H "X-SILO-MOBILE-TOKEN: $MOBILE_INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"trator_id":"T01","frota":"14002","status_operacional":"TRABALHANDO","latitude":-20.123,"longitude":-47.123,"timestamp":"2026-06-03T12:00:00Z"}'
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
