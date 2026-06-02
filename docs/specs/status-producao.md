# Status Producao

## Objetivo
Registrar o snapshot real da producao atual do SILO OPS Central.

## Estado atual
- Commit em producao: `8c1ab00 Enrich trail with operational state`
- Container atual: `silo-ops-central_central-web:trail-operational-state`
- Collector token ativo
- Cron rodando a cada 1 minuto com `x-collector-token`
- Disco VPS saudavel: `9%` usado / `48GB` livre
- Rastro `T01` com multiplos pontos GPS
- `estado_operacional` ja retornando `SEM_OPERACAO`, `TRABALHANDO`, `PARADO`, `EM_MOVIMENTO` e `UNKNOWN` conforme regra

## Arquivos envolvidos
- `src/app/api/equipamentos/trail/collect/route.ts`
- `src/app/api/equipamentos/[tratorId]/rastro/route.ts`
- `src/lib/equipment-status-trail.ts`
- `src/lib/equipment-trail-store.ts`

## Contrato tecnico
- O snapshot acima e descritivo do que esta publicado em producao.
- Nao e roadmap.
- Serve para diferenciar estado real de estado planejado.

## Status
implementado

## Riscos conhecidos
- O token do coletor foi exposto e deve ser rotacionado.
- Este documento precisa ser revisto apos novos deploys relevantes.
