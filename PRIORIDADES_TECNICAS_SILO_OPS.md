# Prioridades Técnicas — SILO OPS

Status técnico resumido das frentes já estabilizadas.

## 1. API Online e Estável
- [x] Endpoint `/health` operacional.
- [x] Endpoint `/api/equipamentos/status` com baixo overhead.
- [!] Endpoints legados fora da VPS devem ser tratados como dívida técnica.

## 2. Web sem Erro Visual
- [x] Correção de Syntax Errors em rotas críticas.
- [x] Skeletons para evitar tela preta.
- [x] Tela de login e proteção de rotas.

## 3. Mapa Operacional
- [x] Integração Leaflet.
- [x] Ícones padronizados SILO OPS.
- [x] Centralização inteligente da frota.

## 4. Equipamentos em Tempo Real
- [x] Polling otimizado.
- [x] Badges de presença.
- [ ] Futuro: WebSockets para push.

## 5. Operadores
- [x] CRUD funcional.
- [x] Validação de matrículas.

## 6. Fichas Operacionais
- [x] Visualização consolidada.
- [x] Exportação CSV.

## 7. Rastro GPS
- [x] Visualização de polylines.
- [ ] Otimização para rastros longos.
