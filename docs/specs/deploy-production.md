# Deploy Production

## Objetivo
Documentar o fluxo seguro de deploy de producao da Central SILO OPS.

## Arquivos envolvidos
- `deploy.sh`
- `DEPLOY.md`
- `next.config.ts`
- `nginx.app.siloops.com.br.conf.example`

## Contrato tecnico
- O build deve estar verde antes de promover container.
- `deploy.sh` constroi a imagem com `docker build -t silo-ops-central_central-web:latest .`.
- O container candidato sobe antes da promocao da versao antiga.
- Se o candidato nao responder, o deploy aborta.
- O container atual so e removido depois que o candidato passa na validacao.
- `next.config.ts` fixa `experimental.cpus: 1` para reduzir concorrencia do build.

## Regras de seguranca
- Nunca derrubar o container atual se o build falhar.
- Nunca promover imagem sem validar o candidato primeiro.
- O rollback real ainda depende de controle externo; nao existe fluxo de rollback automatizado completo no script atual.
- A tag por fase nao esta implementada como geracao automatica de tags semanticas.

## Validacao curl
```bash
curl -I https://app.siloops.com.br
```

```bash
curl -i http://127.0.0.1:3000
```

## Riscos conhecidos
- O script atual trabalha com `latest` e container candidato; rollback completo por ultima imagem boa ainda e parcial.
- Se o build travar antes da validacao, o deploy nao deve substituir o container atual.

## Status
`parcial`
