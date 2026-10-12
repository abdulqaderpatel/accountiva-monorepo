# Accountiva Frontend - Agent Guidelines

You are working on the frontend of **Accountiva**, a modern accounting and financial web application.

---

## 1. Tech Stack
- **Framework**: Vue 3 (`<script setup lang="ts">`, Composition API)
- **Tooling**: Vite, TypeScript
- **Styling & UI**: Tailwind CSS v4, shadcn-vue patterns, Reka UI, Lucide Vue Next
- **State & Routing**: Pinia, Vue Router
- **Forms & Validation**: Vee-Validate, Zod
- **API & Auth**: Axios (`@/lib/api`), Better Auth client
- **Notifications**: `vue-sonner` (toasts for all async operations)

---

## 2. Development Commands
- `npm run dev` — Start local Vite development server
- `npm run build` — Typecheck (`vue-tsc`) and bundle to `dist/` (must pass with 0 errors)

---

## 3. UI & Design Standards
- **shadcn Alignment**: Strictly adhere to shadcn component patterns, color tokens, typography, spacing, border radii, and dark/light themes.
- **Responsiveness**: Mobile-first design; ensure touch targets and layouts work seamlessly across mobile, tablet, and desktop.
- **Accounting Standards**: Maintain standard Indian GST treatments, compliant invoicing/expense flows, and format currency in INR (`₹`).
- **Inspiration, Not Copying**: When given reference screenshots or flows, adopt the core UX intent and functionality while matching Accountiva's native design system.

---

## 4. State & Persistence
- **Client/Local**: Use `localStorage` or persistent Pinia stores solely for client preferences, UI view modes, or draft filters.
- **Database/Server**: Persist business data and shared state via backend API endpoints.
- **Real-Time Sync**: Re-fetch or update relevant Pinia stores immediately after data mutations (e.g. modal submissions, quick-creates, AI actions).

---

## 5. Git & Deployment Workflow
- **Task Branches**: Always create a new branch from latest `main` for each task.
- **Never Push to Main**: Under no circumstances push or commit directly to `main`.
- **UAT Publishing**: Follow `UAT_WORKFLOW.md`. Merge into `uat` and push to `origin uat`.

---

## 6. Communication Style
- **Non-Technical Tone**: Assume the user is non-technical. Keep updates simple, friendly, and focused on visual and functional outcomes (what changed on screen, how it works) rather than low-level code mechanics.

---

## 7. Feature Flags & Staged Modules (Invoice-Only Release)
- **Single Source of Truth (`src/config/features.ts`)**: Accountiva is launched as an **Invoice-Only MVP**.
  - **Active Modules**: `dashboard`, `items`, `customers`, `estimates`, `invoices`, `creditNotes`.
  - **Staged / Inactive Modules**: `vendors`, `bills`, `expenses`, `banking`, `transactions`, `journals`, `reports`.
- **Feature Flag Checks**: Always check `isFeatureEnabled('featureName')` before rendering navigation items, registering protected routes, including entities in global search, adding options in custom fields, showing permissions in member modals, or firing background store refetches.
- **Backend API Gating Awareness**: The backend blocks disabled routes (`/api/bills`, `/api/expenses`, `/api/vendors`, `/api/banking`, `/api/journals`, `/api/transactions`) with `403 Forbidden`. Do NOT trigger calls to these endpoints from stores or views while their feature flag is disabled.
- **Gradual Feature Re-enablement**: Do NOT delete code or components for disabled features. As features are completed for later releases, they will be enabled by flipping their flag in `src/config/features.ts` or setting env variables (e.g. `VITE_FEATURE_EXPENSES=true`).

