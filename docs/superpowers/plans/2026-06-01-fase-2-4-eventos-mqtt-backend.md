# Fase 2.4 - Eventos MQTT Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalizar a ingestão real de eventos operacionais no backend Express da SIL API, com POST manual, persistência em Postgres e eventos automáticos via MQTT sem derrubar o processo.

**Architecture:** O backend segue Express + `pg` direto, sem camada extra. Vamos manter `src/index.js` como ponto de entrada e concentrar a lógica de eventos em helpers internos exportáveis: validação do body do POST, normalização de tipo/origem/severidade, throttle por trator e ingestão MQTT resiliente. A tabela `eventos` já existe; o plano adiciona apenas os caminhos de escrita e leitura necessários para fechar o contrato da timeline operacional.

**Tech Stack:** Node.js, Express, `pg`, PostgreSQL, MQTT broker já existente na infraestrutura.

---

### Task 1: Fechar o contrato de POST /api/eventos

**Files:**
- Modify: `/opt/sil/api/src/index.js`

- [ ] **Step 1: Write the failing validation case manually**

```js
const body = { tipo_evento: "TESTE_TIMELINE" };
// deve falhar porque trator_id é obrigatório
```

- [ ] **Step 2: Implement body validation and 201 response**

```js
function validateEventoBody(body = {}) {
  const tratorId = safeText(body.trator_id ?? body.tratorId, null);
  const tipoEvento = safeText(body.tipo_evento ?? body.tipoEvento, null);
  const errors = [];
  if (!tratorId) errors.push("trator_id é obrigatório");
  if (!tipoEvento) errors.push("tipo_evento é obrigatório");
  return { valid: errors.length === 0, errors, tratorId, tipoEvento };
}

app.post("/api/eventos", async (req, res) => {
  const validation = validateEventoBody(req.body || {});
  if (!validation.valid) return res.status(400).json({ error: validation.errors[0] });

  const result = await persistIncomingEvent(req.body || {}, {
    trator_id: validation.tratorId,
    tipo_evento: validation.tipoEvento,
    descricao: req.body?.descricao ?? null,
    severidade: req.body?.severidade || "INFO",
    origem: req.body?.origem || "API",
    timestamp: req.body?.timestamp || new Date().toISOString(),
  });

  if (result.ok) return res.status(201).json(normalizeEventoRow(result.evento));
  return res.status(503).json({ error: "Evento recebido, mas não persistido" });
});
```

- [ ] **Step 3: Verify the endpoint shape**

Run:
```bash
node --check /opt/sil/api/src/index.js
```
Expected: no syntax errors.

- [ ] **Step 4: Commit**

```bash
git add /opt/sil/api/src/index.js
git commit -m "fix: add manual event ingestion endpoint"
```

### Task 2: Persist and throttle automatic MQTT events

**Files:**
- Modify: `/opt/sil/api/src/index.js`

- [ ] **Step 1: Add MQTT ingestion helper with throttle**

```js
const EVENT_THROTTLE_MS = 60000;
const recentEventThrottle = new Map();

function shouldThrottleEvent(tratorId, tipoEvento, timestamp = Date.now()) {
  const key = `${safeText(tratorId, "UNKNOWN")}::${safeText(tipoEvento, "ERRO_INGESTAO")}`;
  const lastAt = recentEventThrottle.get(key) || 0;
  if (timestamp - lastAt < EVENT_THROTTLE_MS) return true;
  recentEventThrottle.set(key, timestamp);
  return false;
}

async function ingestMqttMessage(topic, rawMessage) {
  try {
    const text = typeof rawMessage === "string" ? rawMessage : Buffer.isBuffer(rawMessage) ? rawMessage.toString("utf8") : String(rawMessage ?? "");
    const payload = text ? JSON.parse(text) : {};
    const tratorId = safeText(payload.trator_id ?? payload.tratorId ?? payload.device_id, "UNKNOWN");
    const tipoEvento = normalizeTipoEventoFromTopic(topic, payload);

    if ((tipoEvento === "HEARTBEAT_RECEBIDO" || tipoEvento === "TELEMETRIA_RECEBIDA" || tipoEvento === "GPS_ATUALIZADO") && shouldThrottleEvent(tratorId, tipoEvento)) {
      return { ok: true, throttled: true };
    }

    return await persistIncomingEvent(payload, {
      trator_id: tratorId,
      tipo_evento: tipoEvento,
      descricao:
        tipoEvento === "HEARTBEAT_RECEBIDO" ? "Heartbeat recebido" :
        tipoEvento === "TELEMETRIA_RECEBIDA" ? "Telemetria recebida" :
        tipoEvento === "GPS_ATUALIZADO" ? "GPS atualizado" :
        tipoEvento === "STATUS_ALTERADO" ? "Status alterado" :
        tipoEvento === "ALERTA_RECEBIDO" ? "Alerta recebido" :
        tipoEvento === "PARADA_INICIADA" ? "Parada iniciada" :
        tipoEvento === "OPERACAO_INICIADA" ? "Operação iniciada" :
        "Evento MQTT recebido",
      severidade: payload.severidade || "INFO",
      origem: "MQTT",
      timestamp: payload.timestamp || new Date().toISOString(),
    });
  } catch (err) {
    await persistIncomingEvent(
      { raw: String(rawMessage ?? ""), topic, error: err?.message || String(err) },
      { trator_id: "UNKNOWN", tipo_evento: "JSON_INVALIDO", descricao: "Payload JSON inválido", severidade: "WARN", origem: "MQTT" }
    );
    return { ok: false, error: err?.message || String(err) };
  }
}
```

- [ ] **Step 2: Map topic names to official event types**

```js
function normalizeTipoEventoFromTopic(topic, payload = {}) {
  const t = safeText(topic, "").toLowerCase();
  if (t.includes("heartbeat")) return "HEARTBEAT_RECEBIDO";
  if (t.includes("telemetria")) return hasValidCoordinates(payload) ? "GPS_ATUALIZADO" : "TELEMETRIA_RECEBIDA";
  if (t.includes("status")) return "STATUS_ALTERADO";
  if (t.includes("alert")) return "ALERTA_RECEBIDO";
  if (t.includes("parada")) return "PARADA_INICIADA";
  if (t.includes("operacao") || t.includes("operação")) return "OPERACAO_INICIADA";
  return "ERRO_INGESTAO";
}
```

- [ ] **Step 3: Ensure payload errors never crash the process**

```js
try {
  await pool.query("INSERT INTO eventos (...) VALUES (...)");
} catch (err) {
  if (process.env.NODE_ENV !== "production") console.error("[SIL] Falha ao persistir evento", err?.message || err);
  return { ok: false, error: err?.message || String(err) };
}
```

- [ ] **Step 4: Verify helper exports remain intact**

Run:
```bash
node --check /opt/sil/api/src/index.js
```
Expected: no syntax errors.

- [ ] **Step 5: Commit**

```bash
git add /opt/sil/api/src/index.js
git commit -m "fix: throttle mqtt event ingestion"
```

### Task 3: Rebuild and validate on production endpoint

**Files:**
- None

- [ ] **Step 1: Rebuild the API image**

Run:
```bash
cd /opt/sil/api
docker build -t sil-api:latest .
```

- [ ] **Step 2: Promote the new container**

Run:
```bash
docker rm -f sil-api
docker run -d --name sil-api --network sil_default --network-alias api --env-file /opt/sil/.env --restart unless-stopped sil-api:latest
```

- [ ] **Step 3: Validate POST /api/eventos**

Run:
```bash
curl -i -X POST https://api.siloops.com.br/api/eventos \
  -H "Content-Type: application/json" \
  -d '{"trator_id":"T02","tipo_evento":"TESTE_TIMELINE","descricao":"Evento manual","severidade":"INFO","origem":"MANUAL"}'
```
Expected: `201 Created` and JSON do evento criado.

- [ ] **Step 4: Validate the timeline**

Run:
```bash
curl -s https://api.siloops.com.br/api/eventos/recentes
```
Expected: array JSON containing the posted `TESTE_TIMELINE` event near the top.

- [ ] **Step 5: Final sanity check**

Run:
```bash
curl -s https://api.siloops.com.br/api/eventos/recentes | grep TESTE_TIMELINE
```
Expected: the string appears in the response body.
