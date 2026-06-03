# Deploy da Central Web SILO OPS

## Pré-requisitos
- Node.js 20+
- Docker e Docker Compose
- `.env.production` preenchido a partir de `.env.production.example`

## Comandos
```bash
cd /opt/silo-ops-central
chmod +x deploy.sh
./deploy.sh
```

## Fluxo recomendado
1. Copie `.env.production.example` para `.env.production`
2. Ajuste URL da API, MQTT e `NEXT_PUBLIC_SITE_URL`
3. Rode `./deploy.sh`
4. Aponte o Nginx do arquivo `nginx.app.siloops.com.br.conf.example` para `silo-ops-central_central-web_1:3000`

## Checklist antes de publicar
- `node --test tests/api-endpoints.test.mjs` passou
- `npm run build` passou
- `docker compose up -d --build` sem erro
- `.env.local` não está versionado
- modo demo está ativo quando necessário
- ações críticas continuam bloqueadas em demo
- status da API e MQTT aparecem no topo do dashboard
- hostname do Nginx aponta para `app.siloops.com.br`
