# Cadastros Operacionais

Status: implementado em base híbrida

## Objetivo
Reorganizar a navegação do SILO OPS para concentrar cadastros agrícolas e operacionais em um grupo único, sem quebrar rotas antigas, mapa, rastro, drawer, collector ou APIs existentes.

## Estrutura
- Monitoramento
- Cadastros Operacionais
- Telemetria & Eventos
- Sistema & Relatórios

## Regras de acesso
- `VIEWER` navega em páginas de leitura.
- `ADMIN_GLOBAL` e `ADMIN_EMPRESA` mantêm acesso administrativo onde já existia.
- Rotas antigas continuam válidas.
- Rotas novas entram como placeholders funcionais até a implementação real.

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
- O menu antigo foi reagrupado, não eliminado.
- O módulo de operadores continua disponível com leitura para perfis permitidos e edição restrita a perfis administrativos.
- `admin/empresas`, `admin/usinas`, `admin/unidades` e `admin/usuarios` seguem protegidos pelo controle de tenant.

## Implementação visual
- Shell SILO OPS dark industrial.
- Cards de preparação.
- Layout responsivo.
- Sem alteração de contratos de API existentes.

## Observação
Este documento registra a estrutura operacional atual e serve como base para os próximos cadastros reais em JSON server-side e futura migração para banco.
