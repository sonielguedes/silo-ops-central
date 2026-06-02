# Deploy Flow

## Objetivo
Documentar o fluxo seguro de deploy da Central SILO OPS, com build verde antes da promocao do container e sem remover a instancia antiga antes da validacao do candidato.

## Arquivos envolvidos
- `deploy.sh`
- `DEPLOY.md`
- `nginx.app.siloops.com.br.conf.example`

## Contrato tecnico
- O deploy inicia com `docker build -t silo-ops-central_central-web:latest .`.
- O container candidato sobe com nome temporario `silo-ops-central_central-web_1_candidate_*`.
- O candidato e validado por uma requisicao local `fetch('http://127.0.0.1:3000')`.
- Se a validacao falhar, o deploy aborta e remove o candidato.
- A antiga versao so e removida depois que o candidato passa na checagem.
- A promocao final e feita com `docker rename` do candidato para o container oficial.
- O Nginx continua apontando para `silo-ops-central_central-web_1:3000`.

## Regras de seguranca
- Nao existe `docker rm` do container antigo antes do build e da validacao do candidato.
- O deploy falha fechado: se o app nao responder, nada e promovido.
- O script nao depende de estado visual nem de intervencao manual entre build e promocao.
- O checklist de `DEPLOY.md` exige `node --test tests/api-endpoints.test.mjs` e `npm run build` verdes antes da publicacao.

## Exemplos de curl
```bash
curl -I https://app.siloops.com.br
```

```bash
curl -i http://127.0.0.1:3000
```

## Status
`implementado`
