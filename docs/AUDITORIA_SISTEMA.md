# Auditoria de Validação de Tenant e Frota

## Objetivo
Garantir que o acesso mobile utilize o `tenantId` operacional correto e não o ID interno da empresa.

## Regras de Validação
- **Tenant ID**: Deve ser sempre recuperado de `company.tenantId` após validação do `x-company-token`.
- **Prevenção**: `company.id` nunca deve ser usado como `tenantId` em rotas operacionais.
- **Lookup de Frota**: Realizado combinando `tenantId` + `fleetCode` (ou `frota`).
- **Persistência**: Ao cadastrar equipamentos via mobile, o `tenantId` deve ser herdado da sessão autenticada.

## Histórico de Correções
- [2026-06-05] Implementada separação entre `auth` e `auth-server` para evitar erros de build.
- [2026-06-05] Corrigido lookup de frota para usar explicitamente `session.tenant_id`.
- [2026-06-05] Adicionado logging mandatório para rastreabilidade de falhas de tenant.
- [2026-06-05] Migração de `mobile-storage` para `server-storage` para padronização.

## Logs de Depuração (Exemplo)
```json
{
  "companyId": "dngloblum",
  "companyTenantId": "silo-ops-001",
  "lookupTenantId": "silo-ops-001",
  "fleetCode": "1000",
  "mobileEnabled": true,
  "status": "ATIVO"
}
```
