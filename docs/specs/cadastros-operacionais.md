# Cadastros Operacionais

Status: implementado em base hibrida

## Objetivo
Reorganizar a navegacao do SILO OPS para concentrar cadastros agricolas e operacionais em um grupo unico, sem quebrar rotas antigas, mapa, rastro, drawer, collector ou APIs existentes. Essa fase tambem serve como base do cadastro mestre de equipamentos.

## Estrutura
- Monitoramento
- Cadastros Operacionais
- Telemetria & Eventos
- Sistema & Relatorios

## Regras de acesso
- `VIEWER` navega em paginas de leitura.
- `ADMIN_GLOBAL` e `ADMIN_EMPRESA` mantem acesso administrativo onde ja existia.
- Rotas antigas continuam validas.
- Rotas novas entram como placeholders funcionais ate a implementacao real.

## Rotas novas
- `/cadastros/equipamentos/tipos`
- `/cadastros/equipamentos/modelos`
- `/cadastros/equipamentos/grupos`
- `/cadastros/equipamentos/perfis`
- `/cadastros/equipamentos/estados`
- `/cadastros/implementos`
- `/cadastros/implementos/medidas`
- `/cadastros/cargos`
- `/cadastros/equipes`
- `/cadastros/operacoes`
- `/cadastros/codigos-parada`
- `/cadastros/safras`
- `/cadastros/combustivel`
- `/telemetria/conectividade`
- `/comando-online`

## Compatibilidade
- O menu antigo foi reagrupado, nao eliminado.
- O modulo de operadores continua disponivel com leitura para perfis permitidos e edicao restrita a perfis administrativos.
- `admin/empresas`, `admin/usinas`, `admin/unidades` e `admin/usuarios` seguem protegidos pelo controle de tenant.
- O CRUD administrativo de equipamentos entra como dominio paralelo ao menu, com store JSON server-side e integracao futura com `/equipamentos`.
- A visao operacional de `/equipamentos` continua sendo a camada de telemetria, mas vai combinar cadastro mestre + status quando o registry estiver ativo.

## Implementacao visual
- Shell SILO OPS dark industrial.
- Cards de preparacao.
- Layout responsivo.
- Sem alteracao de contratos de API existentes.

## Observacao
Este documento registra a estrutura operacional atual e serve como base para os proximos cadastros reais em JSON server-side e futura migracao para banco. O cadastro mestre de equipamentos fica nessa trilha e nao substitui os placeholders ja publicados.
