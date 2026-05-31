# SILO OPS Brand Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the official SILO OPS logo concept to public assets and app-facing branding without changing routes, logic, data contracts, or structural layout.

**Architecture:** Keep runtime code generic and limit brand/domain changes to metadata, docs, examples, and public assets. Generate optimized app icons and social images from the selected logo concept, then point Next metadata to those assets. Update only user-visible text that belongs to the product identity.

**Tech Stack:** Next.js App Router, TypeScript, Node.js, `sharp` for image generation, static assets in `public/`.

---

### Task 1: Inventory brand touchpoints

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `DEPLOY.md`
- Modify: `README_WEB.md`
- Modify: `src/app/configuracoes/page.tsx`
- Modify: `src/app/power-bi/page.tsx`
- Modify: `src/app/sincronizacao/page.tsx`

- [ ] **Step 1: Inspect existing metadata, visible titles, and docs**
- [ ] **Step 2: Replace public-facing old brand strings with SILO OPS equivalents**
- [ ] **Step 3: Keep technical/module names intact where they are not product branding**

### Task 2: Generate public assets

**Files:**
- Create/replace: `public/favicon.ico`
- Create/replace: `public/icon.png`
- Create/replace: `public/apple-icon.png`
- Create/replace: `public/og-image.png`
- Modify: `public/logo-silo.png` if needed for the login/sidebar visual

- [ ] **Step 1: Produce optimized images from the selected logo concept**
- [ ] **Step 2: Ensure the favicon is crisp at 16/32/48px**
- [ ] **Step 3: Ensure app/social images stay legible on dark UI**

### Task 3: Update Next.js metadata

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add `applicationName`, `creator`, `publisher`, Open Graph, and Twitter metadata**
- [ ] **Step 2: Make `metadataBase` configurable via `NEXT_PUBLIC_SITE_URL` with localhost fallback**
- [ ] **Step 3: Point icons to `/favicon.ico`, `/icon.png`, `/apple-icon.png`, and `/og-image.png`**

### Task 4: Rename deploy example assets

**Files:**
- Rename: `nginx.app.siloops.com.br.conf.example`
- Modify: `DEPLOY.md`
- Modify: `.env.production.example`

- [ ] **Step 1: Keep domain references only in docs and example files**
- [ ] **Step 2: Remove stale product-domain references from public text**
- [ ] **Step 3: Preserve runtime config as environment-driven**

### Task 5: Validate

**Files:**
- Test: `tests/api-endpoints.test.mjs`

- [ ] **Step 1: Run lint**
- [ ] **Step 2: Run tests**
- [ ] **Step 3: Run production build**
- [ ] **Step 4: Verify generated assets exist in `public/`**

