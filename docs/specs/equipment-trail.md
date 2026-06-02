# Equipment Trail

## Objetivo
Documentar o contrato real do rastro de equipamento, da API ate a interface.

## Arquivos envolvidos
- `src/app/api/equipamentos/[tratorId]/rastro/route.ts`
- `src/app/equipamentos/[tratorId]/rastro/page.tsx`
- `src/components/TrailMap.tsx`
- `src/lib/equipment-trail-store.ts`
- `src/lib/equipment-status-trail.ts`
- `tests/api-endpoints.test.mjs`

## Contrato tecnico
- `GET /api/equipamentos/[tratorId]/rastro`
- `GET /equipamentos/[tratorId]/rastro`
- Historico GPS persistido em `/app/data/equipment-trail.json`.
- O path pode ser sobrescrito por `EQUIPMENT_TRAIL_STORE_PATH`.
- A rota prioriza o historico persistido e usa fallback tecnico apenas quando o store esta vazio.
- O payload suporta 0, 1 ou varios pontos.
- `TrailMap` e client-only; o SSR foi corrigido com `dynamic(..., { ssr: false })`.
- O mapa suporta marcador unico e polyline.
- O fluxo aplica filtro por tenant.

## Campos novos
- `estado_operacional`
- `codigo_parada`
- `descricao_parada`
- `operacao_id`
- `operacao_nome`
- `evento_status`
- `motivo_status`

## Seguranca
- A rota exige cookie valido.
- `ADMIN_GLOBAL` ve tudo.
- `VIEWER` ve apenas o escopo proprio.
- Sem cookie, a API retorna `401` JSON e nunca HTML.

## Validacao curl
```bash
curl -i http://localhost:3000/api/equipamentos/T01/rastro
```

```bash
curl -i -c cookies.txt \
  -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"viewer@siloops.com.br","password":"Viewer@2026","returnTo":"/"}'
```

```bash
curl -i -b cookies.txt http://localhost:3000/api/equipamentos/T01/rastro
```

## Status
parcial

## Pendente
- Ligar eventos reais de operacao/parada ao rastro com contrato definitivo.

## Riscos conhecidos
- Se nao houver GPS real, a pagina precisa continuar renderizando vazio sem quebrar.
- O fallback tecnico nao deve ser tratado como fonte primaria de verdade.
