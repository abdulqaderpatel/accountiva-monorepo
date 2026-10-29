Failed to create stream fd: Operation not permitted
Failed to create stream fd: Operation not permitted
Failed to create stream fd: Operation not permitted
# Explicit Environment Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all production/UAT inference and make explicit environment variables the only source of deployment configuration across Accountiva frontend and backend.

**Architecture:** A small backend configuration module validates `APP_ENV`, `CLIENT_URL`, and `BETTER_AUTH_URL`, while `DATABASE_URL` remains the sole database selector. Each frontend Netlify proxy requires `APP_ENV` and `API_PROXY_TARGET` and refuses to route when either is absent or invalid; hosted browser traffic remains same-origin through `/api`.

**Tech Stack:** TypeScript, Node.js test runner, Vite/Vitest, Netlify Functions, dotenv, Express, Better Auth, Prisma.

**Spec:** `docs/superpowers/specs/2026-10-29-explicit-environment-configuration-design.md`

## Global Constraints

- `APP_ENV` accepts exactly `development`, `uat`, or `production`.
- UAT and production receive no implicit endpoint defaults.
- Localhost defaults are allowed only when `APP_ENV=development`.
- Do not add dependencies or print secrets.
- Preserve same-origin browser API calls, auth behavior, invoice-only feature gating, and `DATABASE_URL`-based database selection.
- Update all three deployable Netlify proxy copies together.

## Review Focus

- Missing `APP_ENV` must fail clearly instead of defaulting to production or development; covered in Task 1 tests.
- Malformed or unsupported URLs must be rejected before requests are served; covered in Tasks 1 and 3 tests.
- An UAT-looking hostname with no proxy target must not route to UAT; covered in Task 3 tests.
- Production/UAT backend startup must not accept missing client or auth URLs; covered in Task 1 tests.
- Development must retain deliberate localhost behavior without weakening hosted validation; covered in Task 1 tests.

---

### Task 1: Backend environment configuration contract

**Files:**
- Create: `/home/aq/Programming/Projects/accountiva-backend/src/config/environment.ts`
- Create: `/home/aq/Programming/Projects/accountiva-backend/tests/environment.test.ts`

**Interfaces:**
- Produces: `type AppEnvironment = "development" | "uat" | "production"`
- Produces: `type EnvironmentConfig = { appEnv: AppEnvironment; isHosted: boolean; clientUrl: string; authUrl: string }`
- Produces: `resolveEnvironmentConfig(env: NodeJS.ProcessEnv): EnvironmentConfig`
- Produces: `environmentConfig: EnvironmentConfig`

- [ ] **Step 1: Write failing tests for explicit parsing**

Add tests asserting that missing/unknown `APP_ENV` throws, hosted environments require `CLIENT_URL` and `BETTER_AUTH_URL`, malformed URLs throw, trailing slashes normalize, and explicit development returns `http://localhost:5151` plus `http://localhost:5000` when those two URLs are omitted.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `APP_ENV=development node --test --experimental-strip-types tests/environment.test.ts`

Expected: FAIL because `src/config/environment.ts` does not exist.

- [ ] **Step 3: Implement the minimal parser**

Implement the four exported interfaces above using standard `URL` validation. Require `https:` for UAT/production URLs and permit `http:` only for development.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `APP_ENV=development node --test --experimental-strip-types tests/environment.test.ts`

Expected: all environment tests PASS.

### Task 2: Replace backend inference and fallbacks

**Files:**
- Modify: `/home/aq/Programming/Projects/accountiva-backend/src/config/origins.ts`
- Modify: `/home/aq/Programming/Projects/accountiva-backend/src/lib/auth.ts`
- Modify: `/home/aq/Programming/Projects/accountiva-backend/src/lib/prisma.ts`
- Modify: `/home/aq/Programming/Projects/accountiva-backend/index.ts`
- Modify: `/home/aq/Programming/Projects/accountiva-backend/env.d.ts`
- Modify: `/home/aq/Programming/Projects/accountiva-backend/package.json`
- Modify: `/home/aq/Programming/Projects/accountiva-backend/.env.example`
- Modify locally without exposing values: `/home/aq/Programming/Projects/accountiva-backend/.env`, `/home/aq/Programming/Projects/accountiva-backend/.env.uat`

**Interfaces:**
- Consumes: `environmentConfig` from Task 1.
- Produces: backend callers use `environmentConfig.clientUrl`, `.authUrl`, and `.isHosted` without UAT inference.

- [ ] **Step 1: Add failing source-contract assertions**

Extend `tests/environment.test.ts` to assert the environment-selection source files contain no `isUatEnvironment`, `includes("uat")`, hostname-to-environment fallback, or `CLIENT_URL ||` / `BETTER_AUTH_URL ||` deployment fallback.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `APP_ENV=development node --test --experimental-strip-types tests/environment.test.ts`

Expected: FAIL on the current inference/fallback source.

- [ ] **Step 3: Update backend callers**

Import `environmentConfig` in origins, auth, Prisma, and the server entrypoint. Remove `isUatEnvironment`, inferred hosted checks, and production/UAT default URLs. Keep configured/static trusted origins for security compatibility, not selection.

- [ ] **Step 4: Declare and document the variables**

Add `APP_ENV` typing, set `APP_ENV=development` in the test script and `.env.example`, and add `APP_ENV` to the existing ignored local `.env`/`.env.uat` files without changing or displaying their secrets.

- [ ] **Step 5: Verify backend tests and build**

Run: `npm test`

Expected: all backend tests PASS.

Run: `npm run build`

Expected: TypeScript build exits 0.

### Task 3: Strict frontend proxy configuration

**Files:**
- Create: `/home/aq/Programming/Projects/accountiva/netlify/functions/api.test.ts`
- Modify: `/home/aq/Programming/Projects/accountiva/netlify/functions/api.mjs`
- Modify: `/home/aq/Programming/Projects/accountiva/apps/web/netlify/functions/api.mjs`
- Modify: `/home/aq/Programming/Projects/accountiva/apps/web-react/netlify/functions/api.mjs`

**Interfaces:**
- Consumes: `process.env.APP_ENV`, `process.env.API_PROXY_TARGET`.
- Produces: each handler returns `502 API_PROXY_UNAVAILABLE` without an upstream fetch for missing/invalid configuration, otherwise proxies only to the explicit target.

- [ ] **Step 1: Write failing parameterized proxy tests**

For all three handlers, assert an UAT-looking request hostname does not select a backend when variables are absent, missing/unknown `APP_ENV` fails, missing/malformed/unapproved `API_PROXY_TARGET` fails without calling `fetch`, and a valid explicit target is used regardless of request hostname.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm vitest run netlify/functions/api.test.ts`

Expected: FAIL because current handlers infer the upstream from the request hostname.

- [ ] **Step 3: Remove inference from all proxy copies**

Validate the explicit environment enum and `API_PROXY_TARGET`; delete production/UAT fallback constants used for selection and all hostname checks. Retain the approved Accountiva API-origin allowlist as a trust-boundary validation.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `pnpm vitest run netlify/functions/api.test.ts`

Expected: all proxy tests PASS.

### Task 4: Explicit modes and deployment documentation

**Files:**
- Modify: `/home/aq/Programming/Projects/accountiva/package.json`
- Modify: `/home/aq/Programming/Projects/accountiva/apps/web/package.json`
- Modify: `/home/aq/Programming/Projects/accountiva/apps/web-react/package.json`
- Modify: `/home/aq/Programming/Projects/accountiva/apps/web/.env.example`
- Create: `/home/aq/Programming/Projects/accountiva/apps/web-react/.env.example`
- Modify locally without exposing values: `/home/aq/Programming/Projects/accountiva/apps/web/.env`, `/home/aq/Programming/Projects/accountiva/apps/web/.env.uat`, `/home/aq/Programming/Projects/accountiva/apps/web-react/.env`
- Modify: `/home/aq/Programming/Projects/accountiva/apps/web/UAT_WORKFLOW.md`
- Modify: `/home/aq/Programming/Projects/accountiva-backend/UAT_WORKFLOW.md`

**Interfaces:**
- Produces: `dev:uat` / `build:uat` commands that intentionally use Vite mode `uat`.
- Produces: deployment docs listing required frontend/backend variables.

- [ ] **Step 1: Add explicit Vite mode commands**

Add the smallest root/app scripts needed to invoke Vue or React with `--mode uat`; keep existing default development/build commands unchanged.

- [ ] **Step 2: Update example and ignored local env files**

Document `APP_ENV` and `API_PROXY_TARGET` without secrets. Add explicit environment labels to ignored local files without printing or replacing their existing values.

- [ ] **Step 3: Update UAT workflows**

Document the strict required Netlify values and state that missing values now fail rather than falling back.

- [ ] **Step 4: Run complete frontend verification**

Run: `pnpm test`

Expected: all frontend/monorepo tests PASS.

Run: `pnpm --filter web-react build`

Expected: active React frontend build exits 0.

Run: `pnpm --filter web build`

Expected: Vue frontend build exits 0.

### Task 5: Cross-repository audit

**Files:**
- Review all files changed by Tasks 1-4.

- [ ] **Step 1: Search for remaining environment guesses**

Run focused `rg` searches for `isUatEnvironment`, `includes("uat")`, `isUatHostname`, and hardcoded production/UAT fallback selection in runtime configuration code.

Expected: no environment-selection guesses remain.

- [ ] **Step 2: Check diffs and worktree ownership**

Run `git diff --check`, `git diff --stat`, and `git status --short` in both repositories. Confirm no unrelated user changes were overwritten and ignored env files contain only the intended added labels.

- [ ] **Step 3: Report deployment prerequisite**

Before deploying strict code, verify or tell the user to set `APP_ENV` and all required direct variables on each Netlify site. Do not expose secret values.

