# Roadmap

## Objetivo
Registrar a trilha da Fase 3.x com o que ja foi concluido e o que ainda falta.

## Regra de documentacao
- Nao usar SPEC grande.
- Usar mini-spec por fase, no maximo 20 linhas.
- Cada fase registra somente: objetivo, arquivos principais, regras criticas, validacao e hash final.
- Este roadmap e o resumo operacional; nao existe documento mestre longo.

## Concluido
- 3.4A SSR mapa
- 3.4B fontes reais
- 3.4C historico GPS
- 3.4D coletor automatico
- 3.4E collector token
- 3.4F estado operacional no rastro
- 3.4G navegacao do rastro dos equipamentos
- 3.4M normalizar presenca tecnica vs estado operacional
- 3.5 reorganizacao da sidebar e cadastros operacionais

## Em andamento
- cadastro mestre real de equipamentos
- store JSON server-side em `/app/data/equipment-master.json`
- APIs admin `/api/admin/equipamentos` e `/api/admin/equipamentos/[id]`
- consolidacao de `/equipamentos` como visao master + telemetria
- estados de merge `Sem telemetria` e `Nao cadastrado`

## Proximas
- 3.4H unificar estado operacional Dashboard/Equipamentos/Rastro
- 3.4I ligar eventos reais de operacao/parada ao rastro
- 3.4J rotacionar token
- 3.5 usuarios/permissoes reais

## Status
implementado

## Riscos conhecidos
- O roadmap muda conforme a producao real; nao e contrato funcional final.
