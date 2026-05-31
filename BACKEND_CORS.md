# CORS — Configuração no Backend (VPS)

O erro `Failed to fetch` no browser é causado por ausência do header `Access-Control-Allow-Origin`.
O frontend já usa rotas proxy (Next.js → VPS server-side), então **CORS não é mais obrigatório para funcionar**.
Mas se precisar acessar a API diretamente de outros clientes, adicione isto no Express:

---

## Express + pacote `cors` (recomendado)

```bash
npm install cors
```

```js
// server.js / app.js
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    // adicione o domínio de produção quando tiver
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## Alternativa: headers manuais (sem pacote)

```js
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
```

---

## Garantir JSON e tabela vazia

Certifique-se que os endpoints sempre retornam array (nunca `null`):

```js
// /api/equipamentos/status
app.get('/api/equipamentos/status', async (req, res) => {
  try {
    const rows = await db.query('SELECT ...');
    res.json(rows ?? []); // nunca null
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// /api/operacoes/ativas
app.get('/api/operacoes/ativas', async (req, res) => {
  try {
    const rows = await db.query('SELECT ...');
    res.json(rows ?? []); // retorna [] se tabela vazia
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

## Nota

Com o proxy Next.js em uso, o browser nunca chama a VPS diretamente.
O CORS só seria necessário se outro cliente (app mobile, outro site) chamasse a API diretamente.
