# Accountiva Sales Document Parity Design

**Date:** 2026-10-22  
**Status:** Approved direction; written specification pending final review  
**Implementation repository:** `accountiva` monorepo

## Intent

Accountiva is replacing its legacy Vue web application with the React application in `apps/web-react`, while `apps/mobile` remains the official React Native application. The React web application must reproduce the Vue application's visible behavior and layout as closely as the framework permits. The mobile application must provide the same business capabilities through its established native cards, sheets, modals, safe-area handling, and feedback patterns.

This first implementation cycle makes the active sales-document workflows reliable end to end. It covers invoices, estimates, and credit notes because they share numbering, line-item validation, status transitions, and estimate-to-invoice conversion. It also fixes the native session-token transport needed to exercise those workflows on mobile.

Success means these workflows use the existing backend contract correctly, present accurate success and failure states, and do not merely look functional.

## Constraints

- Do not modify `accountiva-backend`. It may be started and inspected for verification.
- Do not modify the legacy `accountiva-frontend` Vue repository. It is the web visual and behavioral reference.
- Do not change feature-flag definitions, values, or release gating.
- Work only on currently active invoice-release modules. Bills, expenses, vendors, banking, journals, and transactions remain staged.
- Preserve the existing React theme tokens and Tailwind color configuration.
- Do not migrate the mobile application to a different navigation system during this cycle.
- Do not add database migrations or depend on new backend endpoints.

## Program Decomposition

The complete migration is too large for one safe implementation plan. It will proceed through independently verifiable cycles:

1. **Sales documents and contract foundation — this specification.** Shared API corrections, mobile session transport, invoices, estimates, credit notes, and conversion.
2. **Catalog and reporting.** Customers, items, dashboard reports, notifications, search/filter behavior, exports, and active-module bulk operations.
3. **Identity and workspace administration.** Authentication screens, onboarding, public/invitation flows, profile, settings, organization profile, members, permissions, custom fields, branding, trash, and billing surfaces.
4. **Final parity sweep.** Cross-screen visual comparison, responsive states, accessibility, empty/loading/error states, and removal or completion of misleading placeholder controls.

Each later cycle receives its own written specification and implementation plan. Findings that affect a later cycle are recorded but not opportunistically implemented in this cycle.

## Current Contract Failures Addressed Here

| Area | Current behavior | Required behavior |
| --- | --- | --- |
| Full document update | Shared hooks send `PUT` | Send `PATCH` to the existing update endpoints |
| Status change | Screens send a partial object through the full-update hook | Use each document's dedicated `PATCH /:id/status` endpoint |
| Invoice bulk status | Repeated or incorrect single-record mutation | Use `PATCH /invoices/bulk-status` with the backend payload |
| Document numbering | Missing or randomly generated numbers | Request `nextNumber` from each document's `/next-number` endpoint |
| Invoice creation | Auto-number mode can submit no number | Resolve a backend number before submission and always send it |
| Estimate conversion | Incomplete invoice payload and invalid follow-up update | Create a valid invoice, then mark the estimate `Invoiced` through its status endpoint |
| Mobile credit note creation | Omits required date and line items | Submit a complete validated financial-document payload |
| Invoice statuses | React/mobile expose unsupported `Sent` or `Void` states | Use only `Draft`, `Outstanding`, and `Paid` |
| Mobile session persistence | Looks only for a token in the response body | Prefer Better Auth's `set-auth-token` response header, with body fallback |
| Mobile logout | Clears local state only | Attempt backend sign-out, then clear local state even if the request fails |

## Architecture

### Shared API boundary

`packages/api` remains the single HTTP boundary for document operations used by both frontends. It will expose explicit operations instead of overloading a generic update mutation:

- full update mutations using `PATCH`;
- document-specific status mutations;
- invoice bulk-status mutation;
- next-number queries or request helpers;
- typed create, update, status, and line-item payloads for the three document types.

The implementation will keep the three document modules separate. A large generic "financial document" abstraction would obscure meaningful differences in status sets and payload fields. Small shared types may be extracted only for genuinely identical line-item and next-number shapes.

Every successful mutation invalidates both the affected collection and record query keys. Status mutations must not require callers to manufacture a full document payload.

### React web boundary

React web owns form state, Vue-matching interaction behavior, and visual composition. It consumes the shared API operations and does not issue ad hoc document requests from views unless a sequential workflow, such as conversion, requires an imperative next-number fetch.

For each of the three modules, the React implementation will match the legacy Vue reference for:

- page structure, sticky headers, statistics, filters, tables, menus, and bulk controls;
- modal structure, field order, labels, validation, loading states, and confirmation behavior;
- status labels and available actions;
- empty, error, and disabled states;
- responsive behavior at equivalent viewport sizes.

Existing React theme tokens remain authoritative for color values, as requested.

### React Native boundary

Mobile consumes the same shared contract operations but retains the application's existing native interaction model. Desktop tables and hover menus will not be copied literally. Equivalent operations will use the current screen, card, bottom-sheet/modal, touch-target, safe-area, toast, and confirmation patterns.

New mobile controls must reuse existing typography, spacing, colors, buttons, inputs, feedback helpers, and modal conventions. This cycle does not introduce a second design system or navigation pattern.

### Native authentication transport

Email and Google sign-in will read the session token from the case-insensitive Axios response-header representation of `set-auth-token`, falling back to an existing response-body token for compatibility. The token and authenticated user are persisted only after a token is present.

Logout will call the existing Better Auth sign-out endpoint while the bearer token is still configured. Local token, user, organization, and Google state will be cleared in a `finally` path so the user is never trapped in a stale local session.

Before changing Expo or React Native API usage, the implementation will verify the relevant documentation for the installed Expo SDK 57-compatible packages, as required by the mobile repository instructions.

## Data Flows

### Create and edit

1. Opening a create form requests the next number for the active organization.
2. The form shows a loading or retryable error state until number resolution completes. It does not silently invent a fallback number.
3. The user completes customer, dates, line items, adjustments, notes, and custom fields using the existing platform-specific UI.
4. Client validation checks required identifiers, valid dates, non-empty line items, positive quantities, finite non-negative monetary values, and an allowed status.
5. Creation submits the complete backend payload and invalidates the collection.
6. Editing preserves the document's existing number and submits a complete payload through `PATCH`.

Requesting a next number is not a reservation. A duplicate-number response remains possible if two users create documents concurrently. A `409` response will keep the form open, explain the conflict, and offer to fetch a fresh number without discarding the other fields.

### Status transitions

Status actions call the dedicated status mutation and disable only the action currently in flight. The UI updates after server success through query invalidation. Failures retain the prior status and show the backend message when safe.

Supported states are:

- Invoice: `Draft`, `Outstanding`, `Paid`.
- Estimate: `Draft`, `Sent`, `Accepted`, `Declined`, `Invoiced`.
- Credit note: `Open`, `Void`, subject to backend restrictions for already-applied credit notes.

### Estimate-to-invoice conversion

Conversion is an explicit sequential operation:

1. Validate that the estimate has a customer identifier, dates, totals, and valid line items.
2. Fetch the next invoice number.
3. Build a complete invoice payload from the estimate, preserving customer ID, line items, amounts, tax, relevant notes, and custom fields. The invoice starts as `Draft`.
4. Create the invoice.
5. Mark the estimate `Invoiced` through the estimate status endpoint.
6. Refresh both invoice and estimate queries and report success.

The invoice is created before the estimate is marked invoiced because an `Invoiced` estimate with no invoice is the more damaging partial state. If invoice creation succeeds but the status update fails, the UI must report that exact partial outcome, refresh both collections, and must not claim the entire conversion failed. Silent catches are prohibited.

### Mobile credit-note creation

The mobile form will use a native line-item editor consistent with the existing invoice and estimate editors. It will collect or derive the issue date, customer ID, one or more valid line items, totals, optional reference invoice, reason/notes, and custom fields. An amount-only request will no longer be submitted.

## Error Handling

- Preserve backend error messages for validation, duplicate numbers, permission denial, and illegal status transitions when they are suitable for users.
- Keep forms open after recoverable errors and preserve entered data.
- Distinguish loading, empty, permission-denied, network-failure, and mutation-failure states.
- Never show a success toast before the corresponding server operation succeeds.
- Never swallow a failed second step in a multi-step workflow.
- A `401` clears stale native authentication through the existing unauthorized callback; a `403` reports insufficient workspace permission without logging the user out.
- No fallback mock records or random business identifiers may be used in production paths.

## Permissions

The backend remains the enforcement authority. Within this cycle, document actions will use any role or permission information already exposed to the frontend to avoid presenting clearly unauthorized create, edit, delete, status, and conversion actions. A complete reusable permission system is part of the workspace-administration cycle; this cycle must not invent a conflicting permission model.

## Verification

Verification is proportional to the workflow risk:

1. Add focused regression coverage for request method, endpoint, payload normalization, allowed statuses, numbering-response handling, and conversion payload construction using the repository's lightest maintainable test setup.
2. Run TypeScript checks for `packages/api`, `apps/web-react`, and `apps/mobile`.
3. Build the React web application.
4. Run the Expo-compatible mobile validation/export available for the installed SDK without changing native project structure.
5. Start the unchanged backend and both frontends where the local environment permits, then exercise create, edit, status, conversion, duplicate-number, validation-error, and logout paths against non-production test data.
6. Compare React and Vue web screens at matching desktop and responsive viewport sizes after the functional checks pass.
7. Confirm `git diff` shows no changes in `accountiva-backend`, `accountiva-frontend`, or feature-flag definitions.

If authenticated integration testing cannot be performed safely without writing to a shared or production-like database, it will be reported as unverified rather than creating test records there.

## Acceptance Criteria

- Both frontends use the existing backend methods and payload shapes for all scoped operations.
- Newly created invoices, estimates, and credit notes always use backend-generated next numbers.
- Full edits and status-only changes use distinct operations.
- Invoice actions expose only backend-supported statuses.
- Estimate conversion creates a valid draft invoice and marks the estimate `Invoiced`, with truthful partial-failure reporting.
- Mobile credit notes contain valid dates and line items.
- Native email and Google sign-in persist the Better Auth bearer token when the server returns it in `set-auth-token`.
- Native logout attempts server invalidation and always clears local authentication state.
- React web matches the Vue reference for scoped screens and workflows, apart from the intentionally retained React theme colors.
- Mobile additions follow existing native patterns and remain usable on compact phone viewports.
- Feature flags, staged modules, backend code, and the Vue repository remain unchanged.
- Type checks, the React build, applicable mobile validation, and new regression tests pass.

## Deferred Findings

The following confirmed issues belong to later cycles:

- organization invitation endpoint and role mismatches;
- trash `entityType` response/request casing;
- branding upload and removal;
- profile-picture persistence, localization, invoice-template persistence, and security placeholder actions;
- full member-permission parity;
- bookmarks, filter presets, product tours, chatbot, and other global Vue facilities;
- audit logs: the backend contains `routes/auditLogs.ts` but does not mount that router in `index.ts`. With the backend frozen, the frontend cannot make this feature operational and must not fabricate audit data.

## Rollback and Safety

This cycle has no schema or backend migration. Changes are limited to the monorepo's shared API package and the two active frontend applications. Each logical unit will be committed independently so a workflow can be reverted without discarding unrelated parity work.
