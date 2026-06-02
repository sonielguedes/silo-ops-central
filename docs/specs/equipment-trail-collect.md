# Equipment Trail Collect

## Objetivo
Coletar pontos GPS a partir de `/api/equipamentos/status` e persistir no histórico local de rastro.

## Arquivos envolvidos
- `src/app/api/equipamentos/trail/collect/route.ts`
- `src/app/api/equipamentos/status/route.ts`
- `src/lib/equipment-trail-store.ts`

## Contrato técnico
- `POST /api/equipamentos/trail/collect`
- Requer cookie `sil_session`
- Requer `ADMIN_GLOBAL`
- Busca o status internamente
- Persiste os pontos válidos no store JSON
- Responde com a quantidade coletada
- Em falha real do upstream, retorna `500`

## Segurança
- Sem cookie: `401 { "error": "unauthorized" }`
- Não admin: `403 { "error": "forbidden" }`
- Erro de upstream: `500 { "error": "upstream_status_failed" }`
- Sem dependência de navegador aberto
- Dedupe ativo no store

## Uso
```bash
curl -b admin.cookie -X POST /api/equipamentos/trail/collect
```

## Status
implementado

## Riscos conhecidos
- Se `status` vier sem coordenadas válidas, nada é persistido
- A coleta depende da disponibilidade do proxy de status
- Store JSON não substitui um datastore transacional
