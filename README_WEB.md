# SILO OPS Central — Web MVP

Interface web de monitoramento em tempo real para o Sistema de Inteligência de Lavoura (SILO OPS).

---

## Pré-requisitos

- Node.js 18+
- npm 9+

---

## Instalação

```bash
cd web-central
npm install
```

---

## Desenvolvimento

```bash
npm run dev
```

Acesse em: [http://localhost:3000](http://localhost:3000)

---

## Build de produção

```bash
npm run build
npm run start
```

---

## Variáveis de ambiente

O arquivo `.env.local` já está configurado com a URL da VPS:

```env
NEXT_PUBLIC_SITE_URL=https://app.siloops.com.br
NEXT_PUBLIC_API_BASE_URL=https://api.siloops.com.br
```

Para apontar para outro backend, edite essa variável.

---

## Endpoints consumidos

| Método | Endpoint                    | Uso                        |
|--------|-----------------------------|----------------------------|
| GET    | `/health`                   | Status da API              |
| GET    | `/api/equipamentos/status`  | Lista de tratores e status |
| GET    | `/api/operacoes/ativas`     | Operações em andamento     |

Polling automático a cada **10 segundos** em todas as telas.

---

## Telas

| Rota            | Descrição                              |
|-----------------|----------------------------------------|
| `/`             | Dashboard — resumo geral do sistema    |
| `/equipamentos` | Tabela detalhada de todos os tratores  |
| `/operacoes`    | Tabela de operações ativas com timer   |

---

## Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS 3**
- Layout dark industrial SILO OPS

---

## Estrutura do projeto

```
web-central/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Layout global + Navbar
│   │   ├── page.tsx             # Dashboard
│   │   ├── globals.css          # Estilos globais SILO OPS
│   │   ├── equipamentos/
│   │   │   └── page.tsx         # Página Equipamentos
│   │   └── operacoes/
│   │       └── page.tsx         # Página Operações
│   ├── components/
│   │   ├── Navbar.tsx           # Barra de navegação
│   │   ├── StatCard.tsx         # Card de métrica
│   │   ├── StatusBadge.tsx      # Badge ONLINE/INSTÁVEL/OFFLINE
│   │   ├── ApiError.tsx         # Banner de erro de API
│   │   └── PollingWrapper.tsx   # Hook de polling por intervalo
│   └── lib/
│       └── api.ts               # Funções de fetch + tipos TypeScript
├── .env.local                   # Configuração da API
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README_WEB.md
```
