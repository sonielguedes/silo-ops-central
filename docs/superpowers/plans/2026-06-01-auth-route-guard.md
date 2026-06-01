# Auth Route Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect all internal Central SILO OPS routes behind an HttpOnly session cookie, preserving `/login` as public and keeping `/api/*` JSON-only.

**Architecture:** The Next middleware becomes the source of truth for route protection using the `sil_session` cookie. Login/logout move to JSON API routes that set/clear the cookie server-side, while the client provider only mirrors session state in `localStorage` for UI/profile display. Internal redirects preserve `returnTo`, and API routes remain untouched by HTML redirects.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Next middleware, Route Handlers, native `Request/Response` cookies.

---

### Task 1: Add session cookie contract and JSON auth routes

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Modify: `tests/api-endpoints.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
it("sets HttpOnly session cookie on login and returns JSON", async () => {
  const res = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "demo@siloops.com.br", password: "SiloOps@2026" }),
  });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("set-cookie") || "", /sil_session=/);
  assert.equal((await res.json()).ok, true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/api-endpoints.test.mjs`
Expected: fail because `/api/auth/login` and `/api/auth/logout` do not exist yet.

- [ ] **Step 3: Implement minimal route handlers**

```ts
// login route: validate demo/prod creds, set HttpOnly cookie, return JSON
// logout route: clear cookie, return JSON
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/api-endpoints.test.mjs`
Expected: pass with JSON responses only.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/login/route.ts src/app/api/auth/logout/route.ts tests/api-endpoints.test.mjs
git commit -m "feat: add auth session routes"
```

### Task 2: Enforce route protection in middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Write the failing route-guard expectation**

```ts
// pseudocode-level expectation:
// GET /mapa without cookie -> 307 redirect to /login?returnTo=%2Fmapa
// GET /api/health without cookie -> JSON response untouched
```

- [ ] **Step 2: Implement middleware matcher and redirect logic**

```ts
export const config = {
  matcher: ["/((?!api|_next|favicon.ico|assets|robots.txt|manifest.json|logo-silo.png).*)"],
};
```

- [ ] **Step 3: Run build-time validation**

Run: `npm run build`
Expected: build succeeds and internal routes are redirected server-side.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: guard internal routes with auth cookie"
```

### Task 3: Sync client auth state and preserve returnTo

**Files:**
- Modify: `src/lib/auth-context.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/layout.tsx` only if import paths need cleanup

- [ ] **Step 1: Write the failing UI flow test**

```js
// manual acceptance:
// unauthenticated /eventos -> middleware redirects to /login?returnTo=%2Feventos
// successful login -> client stores visual session in localStorage and redirects back to returnTo
// logout -> clears cookie and localStorage, then goes to /login
```

- [ ] **Step 2: Update login/logout to call JSON routes**

```ts
// login(): POST /api/auth/login, then localStorage.setItem("sil_session", ...)
// logout(): POST /api/auth/logout, then localStorage.removeItem("sil_session")
// login page reads returnTo from query string and uses it after success
```

- [ ] **Step 3: Remove client-side route blocking from provider**

```ts
// keep provider for state/actions only; middleware owns access control
```

- [ ] **Step 4: Run a full build**

Run: `npm run build`
Expected: no hydration or redirect loop regressions.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-context.tsx src/app/login/page.tsx src/app/layout.tsx
git commit -m "feat: sync auth client flow with route guard"
```

### Task 4: Final validation

**Files:**
- Modify: `tests/api-endpoints.test.mjs`

- [ ] **Step 1: Cover JSON-only API behavior**

```js
it("does not redirect /api routes to HTML", async () => {
  const res = await fetch("http://localhost:3000/api/health");
  assert.equal(res.headers.get("content-type")?.includes("application/json"), true);
});
```

- [ ] **Step 2: Run the final checks**

Run:
```bash
npm run build
node --test tests/api-endpoints.test.mjs
```
Expected: both pass.

- [ ] **Step 3: Verify redirect behavior manually**

Open `/mapa` without session and confirm redirect to `/login?returnTo=%2Fmapa`; then login and confirm return to the original route.

