# Sales Document Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make invoice, estimate, credit-note, conversion, credit-application, and native-session workflows operate correctly against the unchanged backend while bringing scoped React web screens to Vue parity and preserving existing native mobile patterns.

**Architecture:** Put financial-document types and pure conversion/validation logic in `@accountiva/shared`, and put every HTTP operation and multi-request conversion workflow in `@accountiva/api`. React web and mobile own presentation and form state, but consume the same typed operations so methods, endpoints, statuses, numbering, and partial-failure semantics cannot diverge.

**Tech Stack:** TypeScript, React 19, TanStack Query, Axios, Vite 6, Vitest, Expo SDK 57, React Native 0.86, AsyncStorage, Better Auth bearer sessions.

**Spec:** `docs/superpowers/specs/2026-10-22-sales-document-parity-design.md`

## Global Constraints

- Do not modify `accountiva-backend`; it may be started and inspected for verification.
- Do not modify the legacy `accountiva-frontend` Vue repository.
- Do not change feature-flag definitions, values, or release gating.
- Work only on invoices, estimates, credit notes, and native session transport in this cycle.
- Preserve existing React theme tokens and Tailwind color configuration.
- Preserve current mobile navigation and existing native UI conventions.
- Add no database migrations and depend on no new backend endpoints.
- Before touching Expo or React Native APIs, read the Expo SDK 57 documentation and the relevant installed-package documentation.

## Review Focus

- Concurrent next-number use: a `409` must keep entered form data, fetch a fresh number, and avoid claiming success (Tasks 4, 5, and 6).
- Partial estimate conversion: invoice creation followed by status-update failure must report the created invoice and never show full success (Task 2).
- Stale credit balances: a `409` while applying credit must keep the dialog open, refresh balances, and explain the conflict (Tasks 2, 6, and 9).
- Native session variants: header casing, response-body fallback, absent tokens, and sign-out failure must all leave deterministic stored state (Task 3).
- Invalid financial input: empty items, blank names, non-positive quantities, negative/non-finite rates, and reversed dates must block submission (Tasks 1, 4, 5, 6, 7, 8, and 9).

---

### Task 1: Financial Document Domain Contract and Test Harness

**Files:**
- Create: `vitest.config.ts`
- Create: `packages/shared/src/financialDocuments.ts`
- Create: `packages/shared/src/financialDocuments.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/package.json`

**Interfaces:**
- Produces: `INVOICE_STATUSES`, `ESTIMATE_STATUSES`, `CREDIT_NOTE_STATUSES` plus their derived `InvoiceStatus`, `EstimateStatus`, and `CreditNoteStatus` unions.
- Produces: `FinancialLineItemInput`, `InvoicePayload`, `EstimatePayload`, `CreditNotePayload`, and `EstimateConversionSource`.
- Produces: `validateFinancialLineItems(items: FinancialLineItemInput[]): string | null`.
- Produces: `validateFinancialDocumentDates(date: string, endDate?: string, endDateLabel?: string): string | null`.
- Produces: `buildInvoiceFromEstimate(source: EstimateConversionSource, options: { invoiceNumber: string; date: string; dueDate: string }): InvoicePayload`.
- Produces: `isDuplicateDocumentNumberError(error: unknown): boolean`.

- [ ] **Step 1: Add the smallest repository test setup**

Add Vitest to the root development dependencies, a root `test` script running `vitest run`, and a config that includes `packages/**/*.test.ts` and `apps/**/*.test.ts` in a Node environment.

- [ ] **Step 2: Write failing domain tests**

Cover exact status constant values; valid line items; empty items; blank item name; zero quantity; negative and `NaN` rate; invalid/reversed dates; conversion preserving `customerId`, item IDs, totals, tax, notes, and custom fields; missing customer rejection; and `409` conflict recognition without treating other statuses as number conflicts.

- [ ] **Step 3: Run the domain test and verify failure**

Run: `pnpm exec vitest run packages/shared/src/financialDocuments.test.ts`

Expected: FAIL because `financialDocuments.ts` and its exports do not exist.

- [ ] **Step 4: Implement the domain contract**

Use the backend's exact status values. Date validation rejects invalid issue dates and end dates before issue dates. Conversion must output a complete draft invoice, prepend `Converted from Estimate <number>.` to notes, preserve valid line items, and throw a user-safe error when required identifiers or line items are missing.

- [ ] **Step 5: Run tests and type-check shared code**

Run: `pnpm exec vitest run packages/shared/src/financialDocuments.test.ts`

Run: `./node_modules/.bin/tsc -p packages/shared/tsconfig.json --noEmit`

Expected: both commands PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts packages/shared
git commit -m "test: define financial document contracts"
```

### Task 2: Shared HTTP Operations and Estimate Conversion Workflow

**Files:**
- Create: `packages/api/src/queries/financialDocuments.test.ts`
- Create: `packages/api/src/workflows/estimateConversion.ts`
- Create: `packages/api/src/workflows/estimateConversion.test.ts`
- Modify: `packages/api/src/queries/invoices.ts`
- Modify: `packages/api/src/queries/estimates.ts`
- Modify: `packages/api/src/queries/creditNotes.ts`
- Modify: `packages/api/src/index.ts`

**Interfaces:**
- Produces: `fetchNextInvoiceNumber`, `fetchNextEstimateNumber`, and `fetchNextCreditNoteNumber`, each returning `Promise<string>` and rejecting blank/malformed responses.
- Produces: typed `create*` and `update*` request functions plus their existing hooks; full updates use `PATCH`.
- Produces: `useUpdateInvoiceStatus`, `useBulkUpdateInvoiceStatus`, `useUpdateEstimateStatus`, `useUpdateCreditNoteStatus`, and `useApplyCreditNote`.
- Produces: `convertEstimateToInvoice(input: EstimateConversionInput, deps?: EstimateConversionDependencies): Promise<EstimateConversionResult>` with outcomes `complete` and `invoice-created-status-pending`.

- [ ] **Step 1: Write failing request-contract tests**

Mock `packages/api/src/client.ts` and assert exact methods and URLs: next-number uses `GET`; create uses `POST`; full update uses `PATCH /:id`; status uses `PATCH /:id/status`; invoice bulk status sends `{ ids, status }` to `PATCH /invoices/bulk-status`; credit application sends `{ invoiceId, amountApplied }` to `POST /credit-notes/:id/apply`. Assert malformed next-number responses reject.

- [ ] **Step 2: Write failing conversion-workflow tests**

With injected dependencies, assert order `fetch number → create invoice → mark estimate Invoiced`; creation failure skips the status request; status failure returns `invoice-created-status-pending` containing the created invoice number; complete conversion returns `complete`.

- [ ] **Step 3: Run the focused tests and verify failure**

Run: `pnpm exec vitest run packages/api/src/queries/financialDocuments.test.ts packages/api/src/workflows/estimateConversion.test.ts`

Expected: FAIL because the request functions, mutations, and workflow do not exist.

- [ ] **Step 4: Implement typed request functions and hooks**

Keep query keys compatible with existing consumers. Every successful mutation invalidates the collection and affected record; credit application also invalidates invoices. Propagate Axios errors unchanged so views can distinguish `409`, `403`, and validation responses.

- [ ] **Step 5: Implement the conversion workflow**

Use `buildInvoiceFromEstimate`; catch only the second-step status failure and return the partial-success result. Do not swallow number-fetch or invoice-creation failures.

- [ ] **Step 6: Run tests and API type-check**

Run: `pnpm exec vitest run packages/api/src/queries/financialDocuments.test.ts packages/api/src/workflows/estimateConversion.test.ts`

Run: `./node_modules/.bin/tsc -p packages/api/tsconfig.json --noEmit`

Expected: both commands PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/api
git commit -m "fix: align sales document API contracts"
```

### Task 3: Native Better Auth Session Transport

**Files:**
- Create: `apps/mobile/src/auth/session.ts`
- Create: `apps/mobile/src/auth/session.test.ts`
- Modify: `apps/mobile/src/context/AuthContext.tsx`

**Interfaces:**
- Produces: `extractAuthToken(response: Pick<AxiosResponse, "headers" | "data">): string | null`.
- Consumes: existing configured `@accountiva/api` Axios client and AsyncStorage keys.

- [ ] **Step 1: Verify SDK-compatible guidance before coding**

Read `https://docs.expo.dev/versions/v57.0.0/`, `https://docs.expo.dev/llms.txt`, and the installed AsyncStorage/Google Sign-In documentation relevant to persistence and sign-out. Record no dependency changes unless the installed API is incompatible.

- [ ] **Step 2: Write failing token-extraction tests**

Assert extraction from lowercase `set-auth-token`, mixed-case header objects, AxiosHeaders `.get()`, `data.token`, and `data.session.token`; assert blank or absent values return `null`.

- [ ] **Step 3: Run the test and verify failure**

Run: `pnpm exec vitest run apps/mobile/src/auth/session.test.ts`

Expected: FAIL because `extractAuthToken` does not exist.

- [ ] **Step 4: Implement extraction and integrate both sign-in paths**

Keep the complete Axios response, require a real token before persisting authentication, remove fabricated fallback user IDs, and share one persistence path between email and Google sign-in.

- [ ] **Step 5: Make logout server-aware and locally deterministic**

Call `POST /auth/sign-out` before clearing the bearer token. In `finally`, sign out Google and remove token, user, current organization, organization ID, and cached organizations even when the server request fails.

- [ ] **Step 6: Run test and mobile type-check**

Run: `pnpm exec vitest run apps/mobile/src/auth/session.test.ts`

Run: `./node_modules/.bin/tsc -p apps/mobile/tsconfig.json --noEmit`

Expected: both commands PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/auth apps/mobile/src/context/AuthContext.tsx
git commit -m "fix(mobile): persist bearer sessions correctly"
```

### Task 4: React Web Invoice Workflow Parity

**Files:**
- Modify: `apps/web-react/src/components/invoices/CreateInvoiceModal.tsx`
- Modify: `apps/web-react/src/components/invoices/InvoiceDetailModal.tsx`
- Modify: `apps/web-react/src/views/Invoices.tsx`

**Interfaces:**
- Consumes: Task 1 invoice payload/status types and validation.
- Consumes: Task 2 next-number, full-update, status, and bulk-status hooks.

- [ ] **Step 1: Add regression assertions before rewiring**

Extend the Task 2 request test with the exact invoice payload produced by the current form and a `409` rejection followed by a successful replacement-number request. Assert the request layer propagates the conflict and returns the replacement number without retrying creation automatically.

- [ ] **Step 2: Run the focused test and verify the new assertion fails**

Run: `pnpm exec vitest run packages/api/src/queries/financialDocuments.test.ts`

Expected: FAIL on the newly added conflict/replacement-number sequence.

- [ ] **Step 3: Make create/edit numbering and submission functional**

On a new modal open, fetch and display the backend number; disable save while unresolved; preserve the existing number during edit. On a duplicate `409`, keep all fields, fetch a fresh number, and show the backend conflict. Submit complete validated payloads only.

- [ ] **Step 4: Replace status and bulk-status misuse**

Use `useUpdateInvoiceStatus` for row/detail actions and `useBulkUpdateInvoiceStatus` once per selection. Expose only `Draft`, `Outstanding`, and `Paid`; remove `Sent`/`Void` affordances and match Vue's Finalize/Mark Paid wording.

- [ ] **Step 5: Match the scoped Vue invoice UI**

Compare against `accountiva-frontend/src/views/Invoices.vue` at the same desktop and responsive viewport sizes. Align field order, modal sections, filters, actions, permission-aware visibility when membership data explicitly denies an action, validation, loading, disabled, empty, and error states while retaining React theme colors.

- [ ] **Step 6: Verify**

Run: `pnpm exec vitest run packages/api/src/queries/financialDocuments.test.ts`

Run: `pnpm --filter web-react build`

Expected: tests and build PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/queries/financialDocuments.test.ts apps/web-react/src/components/invoices apps/web-react/src/views/Invoices.tsx
git commit -m "fix(web): complete invoice workflow parity"
```

### Task 5: React Web Estimate and Conversion Parity

**Files:**
- Modify: `apps/web-react/src/components/estimates/CreateEstimateModal.tsx`
- Modify: `apps/web-react/src/views/Estimates.tsx`

**Interfaces:**
- Consumes: Task 2 next-number, full-update, status, and `convertEstimateToInvoice` operations.

- [ ] **Step 1: Extend conversion tests for UI-required outcomes**

Assert the complete result includes the backend invoice number and the partial result includes a user-displayable invoice number plus the original status error. Add reversed-date and invalid-item cases through the Task 1 builder.

- [ ] **Step 2: Run tests and verify the added assertions fail**

Run: `pnpm exec vitest run packages/shared/src/financialDocuments.test.ts packages/api/src/workflows/estimateConversion.test.ts`

Expected: FAIL on the newly specified result/error fields.

- [ ] **Step 3: Use backend numbering and dedicated status operations**

Fetch `EST-` numbers when opening a new form, preserve edit numbers, recover from duplicate `409` without clearing fields, and replace all partial full-update calls with `useUpdateEstimateStatus`.

- [ ] **Step 4: Replace ad hoc conversion with the shared workflow**

Pass the estimate's customer ID, dates, items, totals, tax, notes, and custom fields. Show full success only for `complete`; for `invoice-created-status-pending`, name the created invoice and explain that the estimate still needs status recovery.

- [ ] **Step 5: Match the scoped Vue estimate UI and verify**

Align filters, statistics, create/edit modal, conversion confirmation, action visibility, loading, and errors with `accountiva-frontend/src/views/Estimates.vue`.

Run: `pnpm exec vitest run packages/shared/src/financialDocuments.test.ts packages/api/src/workflows/estimateConversion.test.ts`

Run: `pnpm --filter web-react build`

Expected: tests and build PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/financialDocuments.test.ts packages/api/src/workflows apps/web-react/src/components/estimates apps/web-react/src/views/Estimates.tsx
git commit -m "fix(web): complete estimate conversion parity"
```

### Task 6: React Web Credit-Note and Application Parity

**Files:**
- Create: `apps/web-react/src/components/credit-notes/ApplyCreditNoteModal.tsx`
- Modify: `apps/web-react/src/components/credit-notes/CreateCreditNoteModal.tsx`
- Modify: `apps/web-react/src/views/CreditNotes.tsx`

**Interfaces:**
- Consumes: Task 1 credit-note types and item validation.
- Consumes: Task 2 numbering, update, status, application, invoice-query, and credit-note detail operations.

- [ ] **Step 1: Add failing credit-note request tests**

Assert create/update payloads include date and non-empty items; direct actions use only `Open` and `Void`; application propagates a mocked `409` unchanged so the UI can refresh and retain input.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `pnpm exec vitest run packages/api/src/queries/financialDocuments.test.ts`

Expected: FAIL on the new credit-note assertions.

- [ ] **Step 3: Complete create/edit and status behavior**

Use `/next-number`, support Vue's Save Draft and Issue/Open behavior, preserve edit numbers, send date plus line items, and use the dedicated status hook for voiding untouched open credit. Keep server-derived `Closed` read-only.

- [ ] **Step 4: Implement Apply to Invoice**

For open credit with remaining balance, show only same-customer unpaid invoices; cap input by both balances; call `useApplyCreditNote`; on success refresh invoice and credit-note data. On `409`, keep the modal open, refresh data, and display the balance-change message.

- [ ] **Step 5: Match Vue credit-note presentation and verify**

Match `accountiva-frontend/src/views/CreditNotes.vue` for filters, totals, preview details, line items, application history, edit/apply/void/delete action visibility, and confirmation/error states.

Run: `pnpm exec vitest run packages/api/src/queries/financialDocuments.test.ts`

Run: `pnpm --filter web-react build`

Expected: tests and build PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/queries/financialDocuments.test.ts apps/web-react/src/components/credit-notes apps/web-react/src/views/CreditNotes.tsx
git commit -m "feat(web): complete credit note parity"
```

### Task 7: Mobile Invoice Workflow

**Files:**
- Create: `apps/mobile/src/documents/payloads.ts`
- Create: `apps/mobile/src/documents/payloads.test.ts`
- Modify: `apps/mobile/src/screens/CreateInvoiceScreen.tsx`
- Modify: `apps/mobile/src/components/InvoiceDetailModal.tsx`
- Modify: `apps/mobile/src/screens/InvoicesScreen.tsx`

**Interfaces:**
- Consumes: Tasks 1 and 2 invoice validation, numbering, update, and status operations.
- Produces: `buildMobileInvoicePayload(values: MobileInvoiceFormValues): InvoicePayload`.

- [ ] **Step 1: Add mobile invoice payload cases to a pure payload test**

Assert the native form's mapped payload retains item IDs, descriptions, custom fields, and numeric totals; reject reversed dates and invalid items.

- [ ] **Step 2: Run the domain test and verify failure**

Run: `pnpm exec vitest run apps/mobile/src/documents/payloads.test.ts`

Expected: FAIL on the new native-shaped input cases.

- [ ] **Step 3: Replace random numbering and invalid statuses**

Implement `buildMobileInvoicePayload`, fetch the next invoice number for creates, preserve edit numbers, keep entered data on `409`, and use the status hook. Replace `Sent` and `Void` actions with Vue-consistent `Outstanding`/Finalize and `Paid` actions presented through existing native controls.

- [ ] **Step 4: Preserve mobile interaction consistency**

Keep current full-screen form, cards, sheets, touch targets, feedback context, typography, colors, and safe-area behavior. Add loading/retry states without introducing web-style tables or dropdown menus.

- [ ] **Step 5: Verify and commit**

Run: `pnpm exec vitest run apps/mobile/src/documents/payloads.test.ts`

Run: `./node_modules/.bin/tsc -p apps/mobile/tsconfig.json --noEmit`

Expected: tests and type-check PASS.

```bash
git add apps/mobile/src/documents apps/mobile/src/screens/CreateInvoiceScreen.tsx apps/mobile/src/screens/InvoicesScreen.tsx apps/mobile/src/components/InvoiceDetailModal.tsx
git commit -m "fix(mobile): complete invoice workflow"
```

### Task 8: Mobile Estimate and Conversion Workflow

**Files:**
- Modify: `apps/mobile/src/documents/payloads.ts`
- Modify: `apps/mobile/src/documents/payloads.test.ts`
- Modify: `apps/mobile/src/components/CreateEstimateModal.tsx`
- Modify: `apps/mobile/src/components/EstimateDetailModal.tsx`
- Modify: `apps/mobile/src/screens/EstimatesScreen.tsx`

**Interfaces:**
- Consumes: Task 2 estimate numbering/status and shared conversion workflow.
- Produces: `buildMobileEstimatePayload(values: MobileEstimateFormValues): EstimatePayload`.

- [ ] **Step 1: Add mobile estimate payload and conversion regression cases**

Extend the mobile payload test for estimate dates, items, totals, status, notes, and custom fields. Extend the conversion test with a mobile-shaped estimate containing nested customer and item fields; assert the resulting invoice has `customerId`, backend number, valid dates, items, totals, and `Draft` status.

- [ ] **Step 2: Run the conversion test and verify failure**

Run: `pnpm exec vitest run apps/mobile/src/documents/payloads.test.ts packages/api/src/workflows/estimateConversion.test.ts`

Expected: FAIL on the mobile-shaped normalization case.

- [ ] **Step 3: Use backend numbering and status hooks**

Implement `buildMobileEstimatePayload`, remove random estimate numbers, preserve edit numbers, retain fields on duplicate conflicts, and route Accepted/Declined changes through `useUpdateEstimateStatus`.

- [ ] **Step 4: Use the shared conversion workflow**

Remove the incomplete mobile invoice payload and silent status catch. Present full and partial outcomes accurately through existing confirmation and toast patterns.

- [ ] **Step 5: Verify and commit**

Run: `pnpm exec vitest run apps/mobile/src/documents/payloads.test.ts packages/api/src/workflows/estimateConversion.test.ts`

Run: `./node_modules/.bin/tsc -p apps/mobile/tsconfig.json --noEmit`

Expected: tests and type-check PASS.

```bash
git add packages/api/src/workflows/estimateConversion.test.ts apps/mobile/src/documents apps/mobile/src/components/CreateEstimateModal.tsx apps/mobile/src/components/EstimateDetailModal.tsx apps/mobile/src/screens/EstimatesScreen.tsx
git commit -m "fix(mobile): complete estimate conversion"
```

### Task 9: Mobile Credit-Note and Application Workflow

**Files:**
- Modify: `apps/mobile/src/documents/payloads.ts`
- Modify: `apps/mobile/src/documents/payloads.test.ts`
- Create: `apps/mobile/src/components/ApplyCreditNoteModal.tsx`
- Modify: `apps/mobile/src/components/CreateCreditNoteModal.tsx`
- Modify: `apps/mobile/src/components/CreditNoteDetailModal.tsx`
- Modify: `apps/mobile/src/screens/CreditNotesScreen.tsx`

**Interfaces:**
- Consumes: Task 2 credit-note numbering, status, application, invoice-query, and detail operations.
- Produces: `buildMobileCreditNotePayload(values: MobileCreditNoteFormValues): CreditNotePayload`.

- [ ] **Step 1: Add mobile credit-note payload and stale-balance tests**

Assert mobile-shaped values produce date, customer ID, at least one valid line item, totals, notes, reference invoice, and custom fields. Assert a mocked application `409` remains distinguishable from validation and network failures.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm exec vitest run apps/mobile/src/documents/payloads.test.ts packages/api/src/queries/financialDocuments.test.ts`

Expected: FAIL on the new payload/application cases.

- [ ] **Step 3: Replace amount-only credit-note creation**

Implement `buildMobileCreditNotePayload`, fetch the backend credit-note number, add issue date and a native line-item editor using current form styling, validate items and totals, support Draft/Open submission, and preserve edit/conflict state.

- [ ] **Step 4: Correct detail actions and add credit application**

Remove the unsupported manual `Closed` action. Allow voiding only untouched open credit. Add a native application sheet/modal limited to same-customer unpaid invoices and available balances; keep it open and refresh on `409`.

- [ ] **Step 5: Verify and commit**

Run: `pnpm exec vitest run apps/mobile/src/documents/payloads.test.ts packages/api/src/queries/financialDocuments.test.ts`

Run: `./node_modules/.bin/tsc -p apps/mobile/tsconfig.json --noEmit`

Expected: tests and type-check PASS.

```bash
git add packages/api/src/queries/financialDocuments.test.ts apps/mobile/src/documents apps/mobile/src/components/CreateCreditNoteModal.tsx apps/mobile/src/components/CreditNoteDetailModal.tsx apps/mobile/src/components/ApplyCreditNoteModal.tsx apps/mobile/src/screens/CreditNotesScreen.tsx
git commit -m "feat(mobile): complete credit note workflows"
```

### Task 10: Integrated Verification and Visual Parity Gate

**Files:**
- Modify only files from Tasks 1–9 when verification exposes a scoped defect.

**Interfaces:**
- Consumes: all previous task deliverables.
- Produces: verified sales-document cycle with no backend, Vue, or feature-flag changes.

- [ ] **Step 1: Run the complete automated suite**

Run: `pnpm exec vitest run`

Run: `./node_modules/.bin/tsc -p packages/shared/tsconfig.json --noEmit`

Run: `./node_modules/.bin/tsc -p packages/api/tsconfig.json --noEmit`

Run: `pnpm --filter web-react build`

Run: `./node_modules/.bin/tsc -p apps/mobile/tsconfig.json --noEmit`

Expected: every command exits `0`.

- [ ] **Step 2: Run Expo validation**

Run from `apps/mobile`: `npx expo-doctor`

Run: `pnpm --filter mobile exec expo export --platform web --output-dir /tmp/accountiva-mobile-sales-parity`

Expected: no newly introduced dependency/config errors and export exits `0`.

- [ ] **Step 3: Run safe integration smoke tests**

Start the unchanged backend plus Vue, React, and mobile-web development servers. Against non-production test data only, verify create, edit, duplicate-number recovery, all supported status changes, bulk invoice status, complete conversion, simulated partial conversion, credit application, stale-balance handling, native login persistence, and logout cleanup.

- [ ] **Step 4: Perform matched-viewport web comparison**

Capture Vue and React invoices, estimates, and credit-note list/form/detail states at identical desktop and responsive viewports. Correct scoped spacing, typography, hierarchy, field order, labels, actions, loading, empty, and error-state differences without changing theme-token colors.

- [ ] **Step 5: Perform native consistency review**

Check compact-phone and larger-phone viewports for safe-area use, keyboard reachability, scrollability, touch targets, modal dismissal, destructive confirmations, and consistent feedback.

- [ ] **Step 6: Prove protected repositories and flags are unchanged**

Run: `git -C /home/aq/Programming/Projects/accountiva-backend status --short`

Run: `git -C /home/aq/Programming/Projects/accountiva-frontend status --short`

Run: `git diff d502eb1 -- packages/shared/src/features.ts`

Expected: both protected repositories are clean and the feature-flag diff is empty.

- [ ] **Step 7: Commit verification-only fixes, if any**

```bash
git add <only-scoped-files-fixed-during-verification>
git commit -m "fix: resolve sales parity verification findings"
```

Skip this commit when verification required no changes.
