# Fichas & Relatórios Integracao Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the "Integrar Selecionados" flow to Fichas & Relatórios with controlled demo behavior, integration/export endpoints, and summary feedback.

**Architecture:** Keep the current `/relatorios` page as the single UI surface, extracting only the integration modal and shared ficha utilities. Server routes stay thin and deterministic: `/integrar` handles database integration summaries, `/exportar` emits CSV/TXT, and `/historico` provides a controlled technical history response. Demo/local behavior persists in `localStorage`; production favors real backend calls and degrades to empty technical states, never raw errors.

**Tech Stack:** Next.js App Router, React client components, TypeScript, localStorage demo state, JSON and text responses, existing SILO dark UI.

---

### Task 1: Expand ficha utilities and selection rules

**Files:**
- Modified: `src/lib/fichas-operacionais.ts`
- Test: `tests/api-endpoints.test.mjs`

- [x] **Step 1: Write the failing test**

```js
assert.match(libSource, /gerarCSV/);
assert.match(libSource, /gerarTXT/);
assert.match(libSource, /canIntegrateFicha/);
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests\\api-endpoints.test.mjs`
Expected during development: fail until helpers exist.

- [x] **Step 3: Write minimal implementation**

```ts
export const gerarCSV = fichasToCsv;
export const gerarTXT = fichasToTxt;
export function canIntegrateFicha(...) { ... }
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests\\api-endpoints.test.mjs`
Expected: pass after helpers are implemented.

### Task 2: Add integration API routes

**Files:**
- Created: `src/app/api/fichas-operacionais/integrar/route.ts`
- Modified: `src/app/api/fichas-operacionais/exportar/route.ts`
- Created: `src/app/api/fichas-operacionais/historico/route.ts`

- [x] **Step 1: Write the failing test**

```js
assert.equal(existsSync(new URL("../src/app/api/fichas-operacionais/integrar/route.ts", import.meta.url)), true);
assert.equal(existsSync(new URL("../src/app/api/fichas-operacionais/historico/route.ts", import.meta.url)), true);
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests\\api-endpoints.test.mjs`
Expected during development: fail until routes exist.

- [x] **Step 3: Write minimal implementation**

```ts
export async function POST(req: NextRequest) {
  return NextResponse.json({ total: 0, incluidos: 0, alterados: 0, erros: 0, linhasComErro: [] }, { status: 200 });
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests\\api-endpoints.test.mjs`
Expected: pass with controlled JSON payloads.

### Task 3: Add integration modal and wire the page

**Files:**
- Created: `src/components/relatorios/TipoIntegracaoModal.tsx`
- Modified: `src/app/relatorios/page.tsx`

- [x] **Step 1: Write the failing test**

```js
assert.match(relatoriosSource, /Integrar Selecionados/);
assert.match(modalSource, /Tipo de Integração/);
assert.match(modalSource, /Banco de Dados/);
assert.match(modalSource, /Arquivo de Texto/);
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests\\api-endpoints.test.mjs`
Expected during development: fail until UI exists.

- [x] **Step 3: Write minimal implementation**

```tsx
<TipoIntegracaoModal open={...} />
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests\\api-endpoints.test.mjs`
Expected: pass for UI assertions.

### Task 4: Verify production safety and build

**Files:**
- Modified: `tests/api-endpoints.test.mjs`

- [x] **Step 1: Run lint**

Run: `npm.cmd run lint`
Expected: PASS.

- [x] **Step 2: Run API tests**

Run: `node --test tests\\api-endpoints.test.mjs`
Expected: PASS.

- [x] **Step 3: Run build**

Run: `npm.cmd run build`
Expected: PASS.

---

## Delivery Notes

- The module ships with controlled demo/local persistence via `localStorage`.
- Production paths avoid raw HTML/JSON parse failures by guarding response content types.
- The integration modal supports both database integration and text export flows while preserving the dark SILO UI.
- Validation completed successfully after implementation.
