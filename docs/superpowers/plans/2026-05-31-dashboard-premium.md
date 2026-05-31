# Dashboard Premium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the existing S.I.L dashboard to a premium, client-ready operational surface without changing the system shape or removing existing modules.

**Architecture:** Keep the current shell, sidebar, and API contracts, but extract dashboard-specific presentation into small reusable components and shared status helpers. Normalize copy, loading, empty, and error states so the dashboard reads as an industrial control surface instead of a demo page. Use controlled polling and derived view models to avoid render churn.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Leaflet, native fetch, existing local API proxies.

---

### Task 1: Add shared dashboard view-model helpers

**Files:**
- Create: `src/lib/dashboard-types.ts`
- Modify: `src/lib/api.ts`
- Test: `tests/api-endpoints.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../src/lib/dashboard-types.ts", import.meta.url), "utf8");
assert.match(source, /export type StatusSistema/);
assert.match(source, /export type EventoOperacional/);
assert.match(source, /export type AlertaOperacional/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/api-endpoints.test.mjs`
Expected: FAIL because the new module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export type AmbienteSistema = "LOCAL" | "DEMO" | "PRODUCAO";
export type StatusSistema = { api: "online" | "offline" | "degraded"; mqtt: "online" | "offline" | "unknown"; ambiente: AmbienteSistema; lastCheck: string; versao: string; };
export type EventoOperacional = { horario: string; equipamento: string; tipo_evento: string; status: string; origem: "APK" | "API" | "MQTT" | "OfflineSync"; };
export type AlertaOperacional = { id: string; equipamento: string; titulo: string; severidade: "info" | "warning" | "critical"; atualizado_em: string; };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api-endpoints.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard-types.ts src/lib/api.ts tests/api-endpoints.test.mjs
git commit -m "feat: add dashboard status types"
```

### Task 2: Extract reusable dashboard states and metrics

**Files:**
- Create: `src/components/dashboard/SectionHeader.tsx`
- Create: `src/components/dashboard/EmptyState.tsx`
- Create: `src/components/dashboard/ErrorState.tsx`
- Create: `src/components/dashboard/StatusRow.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write the failing test**

```js
const dashboard = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
assert.match(dashboard, /Últimos eventos recebidos/);
assert.match(dashboard, /Nenhum evento real recebido ainda/);
assert.match(dashboard, /Nenhuma operação ativa no momento/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/api-endpoints.test.mjs`
Expected: FAIL until the new sections exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
export default function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#1f334d] bg-[#0d1420] p-6 text-center">
      <p className="text-[#c8d8e8] font-semibold">{title}</p>
      <p className="text-[#4a6a8a] text-sm mt-1">{sub}</p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api-endpoints.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard src/app/page.tsx
git commit -m "feat: extract dashboard state components"
```

### Task 3: Rebuild the dashboard layout and copy

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/StatCard.tsx`
- Test: `tests/api-endpoints.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
const header = readFileSync(new URL("../src/components/Header.tsx", import.meta.url), "utf8");
assert.match(header, /AMBIENTE/);
assert.match(header, /Último check/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/api-endpoints.test.mjs`
Expected: FAIL because the environment/status bar is not yet present.

- [ ] **Step 3: Write minimal implementation**

```tsx
const env = (process.env.NEXT_PUBLIC_SIL_ENV ?? "LOCAL") as "LOCAL" | "DEMO" | "PRODUCAO";
const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "v0.1.3-enterprise";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api-endpoints.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/Header.tsx src/components/Sidebar.tsx src/components/StatCard.tsx
git commit -m "feat: polish dashboard presentation"
```

### Task 4: Harden loading, empty, and error flows

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/lib/api.ts`
- Test: `tests/api-endpoints.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
const api = readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8");
assert.match(api, /Tempo esgotado \(10s\)/);
assert.match(api, /Conexão indisponível/);
assert.match(api, /Servidor retornou erro \(HTML\)/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/api-endpoints.test.mjs`
Expected: FAIL if any wording/state mapping is missing.

- [ ] **Step 3: Write minimal implementation**

```ts
const statusLabel = s.healthErr ? "API offline" : s.health ? "Online" : "Carregando";
const mqttLabel = s.healthErr ? "MQTT desconhecido" : "MQTT online";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api-endpoints.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/lib/api.ts
git commit -m "feat: harden dashboard states"
```

### Task 5: Control polling and render churn

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/StatCard.tsx`
- Test: `tests/api-endpoints.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
const dashboard = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
assert.match(dashboard, /useRef<\(\(\) => Promise<void>\)\|null>/);
assert.match(dashboard, /setInterval\(\(\)=>ref\.current\?\.\(\),10000\)/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/api-endpoints.test.mjs`
Expected: FAIL until polling is centralized and not recreated by unrelated renders.

- [ ] **Step 3: Write minimal implementation**

```tsx
const pollRef = useRef<(() => Promise<void>) | null>(null);
useEffect(() => { pollRef.current = poll; }, [poll]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/api-endpoints.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/Header.tsx src/components/StatCard.tsx
git commit -m "perf: stabilize dashboard polling"
```

### Task 6: Verify production build and visual integrity

**Files:**
- Test: `tests/api-endpoints.test.mjs`
- Verify: `npm.cmd run build`

- [ ] **Step 1: Run the test suite**

Run: `node --test tests/api-endpoints.test.mjs`
Expected: PASS.

- [ ] **Step 2: Run the production build**

Run: `npm.cmd run build`
Expected: PASS with the dashboard route and shared components compiled.

- [ ] **Step 3: Manual browser check**

Open `http://localhost:3000/` and verify:
- KPI cards read cleanly on notebook and desktop
- table row height is readable
- empty states do not collapse the layout
- error states are visible without breaking the page
- header shows environment, version, API, MQTT, and last check

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/components src/lib tests
git commit -m "chore: verify dashboard premium release"
```
