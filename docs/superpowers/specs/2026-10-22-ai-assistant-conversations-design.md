# Accountiva Conversational AI Upgrade Design

**Date:** 2026-10-22  
**Status:** Conversational design approved; written specification awaiting review  
**Repositories:** `accountiva-backend` and the `accountiva` monorepo  

## Summary

Upgrade Accountiva's existing Gemini assistant into a server-managed, persistent conversational system shared by React web and the native mobile app. The assistant will understand natural follow-up language, use a longer bounded context, complete multi-step read operations, and turn every database write into a reviewable pending action that requires explicit confirmation.

The legacy Vue repository remains untouched. Existing feature-flag definitions and configuration remain untouched. Backend work is required because conversation memory, tool orchestration, authorization, and confirmation must be enforced server-side.

## Current State

- The real assistant UI exists only in the legacy Vue application.
- React web advertises the assistant on the landing page but has no authenticated assistant component.
- The native application has no assistant screen or global assistant entry point.
- The Vue client sends at most six earlier messages with each request.
- The backend accepts client-provided history instead of rebuilding context from its own stored messages.
- The backend performs only one Gemini response cycle. It executes returned tools but does not return tool results to Gemini for continued reasoning.
- Write tools execute immediately without a confirmation boundary.
- Chat messages are stored by user and organization, but there is no conversation entity or New chat isolation.
- The system prompt forces INR even though organizations have configurable currency and region.
- AI tools can access staged data paths directly unless the AI layer explicitly respects the existing release controls.

## Goals

1. Understand conversational English, shorthand, minor spelling mistakes, relative dates, and references to earlier results such as “the second one” or “use the same amount.”
2. Preserve one active conversation per user and organization across web, mobile, app restarts, and device changes.
3. Keep the complete active transcript while sending Gemini only a bounded, useful recent context.
4. Support iterative read-tool reasoning within one user turn.
5. Require explicit confirmation before creating any financial or directory record.
6. Make confirmation idempotent so retries or repeated taps cannot duplicate records.
7. Deliver the assistant in React web with visual parity to the Vue floating panel and in native mobile with established mobile interaction patterns.
8. Preserve existing backend chat endpoint compatibility wherever it does not conflict with the new confirmation requirement.
9. Keep organization data isolated and keep attachments and financial payloads out of logs.

## Non-Goals

- Editing the legacy `accountiva-frontend` Vue repository.
- Creating a conversation-history browser. The first release resumes only the active conversation.
- Vector search, embeddings, retrieval-augmented generation, or indefinite semantic memory.
- Voice input, streaming responses, background autonomous actions, scheduled actions, or proactive notifications.
- Update or delete tools.
- New feature flags or changes to current flag definitions.
- Persisting uploaded attachment binaries in chat storage.
- Replacing Gemini solely for this feature.

## Terminology

- **Conversation:** One user-and-organization-scoped chat. Exactly one is active for a given user and organization.
- **Context window:** The recent subset of stored messages provided to Gemini for the current turn.
- **Read tool:** A tool that queries data without changing business records.
- **Write tool:** A tool that would create a business record.
- **Pending action:** A validated write-tool request stored for review but not yet executed.

## Architecture

React web and native mobile use the same authenticated backend API. The backend owns conversations, history selection, organization context, Gemini orchestration, tool execution, and pending actions. Gemini receives typed tools but never direct database access.

The request path is:

1. Client sends a new message, active conversation ID, client request ID, and optional attachments.
2. Backend authenticates the user and derives the organization from trusted middleware context.
3. Backend resolves the active conversation and idempotently stores the user message.
4. Backend loads organization settings and a bounded recent conversation context.
5. Gemini interprets the request and may call tools.
6. Read tools execute immediately and their results are sent back to Gemini.
7. Write tools are validated and stored as pending actions; no business row is created.
8. Gemini receives the pending-action result and writes a concise review message.
9. Backend stores and returns the assistant message, structured data, and pending action cards.
10. A separate Confirm request revalidates and atomically executes one pending action.

The Gemini loop is capped at four model rounds and eight total tool calls per user turn. If the cap is reached, the assistant asks the user to narrow the request rather than continuing indefinitely.

## Persistence Model

### `chat_conversations`

Add a conversation table with:

- `id` UUID primary key;
- `user_id` UUID foreign key;
- `organization_id` UUID foreign key;
- `created_at` timestamp;
- `updated_at` timestamp;
- `closed_at` nullable timestamp.

A database-level partial unique index enforces at most one row with `closed_at IS NULL` per `(user_id, organization_id)`. New chat closes the prior active conversation before creating another.

### `chat_messages`

Retain the existing table and add:

- `conversation_id` UUID foreign key;
- `client_request_id` nullable string for send idempotency;
- a unique index on `(conversation_id, client_request_id)` when the client request ID is present.

Existing `role`, `content`, `data`, `data_type`, and timestamps remain. Structured query results and attachment metadata may stay in `data`; binary attachment data must not be stored.

### `chat_pending_actions`

Add a pending-action table with:

- `id` UUID primary key;
- `conversation_id`, `user_id`, and `organization_id` foreign keys;
- `assistant_message_id` nullable foreign key;
- immutable `tool_name` and `arguments` JSON;
- `status`: `pending`, `executing`, `completed`, `cancelled`, `failed`, or `expired`;
- nullable `result` JSON and `error` text;
- `expires_at`, `created_at`, `updated_at`, and nullable `executed_at` timestamps.

Pending actions expire 24 hours after creation. Expiry is enforced when actions are read or confirmed; no background scheduler is required.

### Migration and Backfill

The migration is additive:

1. Create conversation and pending-action structures.
2. Add nullable conversation and request-ID fields to chat messages.
3. Create one active conversation for every existing `(user_id, organization_id)` pair with messages.
4. Assign existing messages to the matching conversation in their original order.
5. Keep `conversation_id` nullable for rollback compatibility, while the new application code always sets it and adopts any legacy null rows into the active conversation on first load.
6. Add indexes and foreign keys.

No existing chat messages or business records are deleted.

## API Contract

### Load Active Conversation

`GET /api/chat/active?limit=50&before=<message-id>`

- Uses the authenticated user and middleware-selected organization.
- Returns `conversation: null` when no active conversation exists.
- Otherwise returns conversation metadata, the selected message page in chronological display order, pending-action states, and an older-message cursor.
- `limit` is clamped to 1–100.

React web and native load the newest 50 messages and may fetch older pages when the user scrolls upward.

### Create a New Conversation

`POST /api/chat/conversations`

- Atomically closes the active conversation.
- Cancels its unconfirmed pending actions.
- Creates and returns a new active conversation.
- Does not delete the earlier conversation or messages.

### Send a Message

Keep `POST /api/chat` for compatibility. The new request shape is:

```json
{
  "conversationId": "uuid-or-null",
  "clientRequestId": "client-generated-id-or-null",
  "message": "user text",
  "attachments": [
    { "name": "invoice.pdf", "mimeType": "application/pdf", "size": 102400, "data": "data:..." }
  ]
}
```

The organization ID in the body and client-supplied `history` are no longer authoritative. Old clients may still send them, but the server ignores history and uses middleware organization context. `clientRequestId` is required from the new clients; the backend generates one when a legacy client omits it.

The response retains the legacy top-level `message`, `actionExecuted`, `data`, and `dataType` fields and adds:

```json
{
  "conversationId": "uuid",
  "assistantMessage": {
    "id": "uuid",
    "role": "assistant",
    "content": "Review the invoice below.",
    "data": null,
    "dataType": "pending_action",
    "createdAt": "timestamp"
  },
  "pendingActions": []
}
```

`actionExecuted` remains `false` for previews and becomes `true` only in a confirmation response.

### Confirm or Cancel

- `POST /api/chat/actions/:actionId/confirm`
- `POST /api/chat/actions/:actionId/cancel`

Both endpoints verify the authenticated user, active organization, conversation ownership, action state, and expiry. Confirm returns the original result when called again for an already completed action. Cancel is also idempotent.

For legacy Vue compatibility, an exact case-insensitive text message of `confirm` confirms the newest non-expired pending action in the active conversation. Any less explicit phrase follows the normal model path and cannot execute a write directly. This keeps the Vue source untouched while honoring the confirmation requirement.

### Legacy History

Keep `GET /api/chat/history/:organizationId`. It returns the active conversation's messages in the legacy array shape, with optional additive fields. Organization access checks remain mandatory.

## Conversation Context

The backend, not the client, builds model history. It selects at most 30 useful messages and 30,000 serialized characters from the newest portion of the active conversation, then restores chronological order.

Context construction must:

- begin with a valid user turn;
- exclude transient transport errors;
- include concise structured result data when a later reference may depend on it;
- count serialized structured data toward the character limit;
- truncate oversized individual message content safely;
- never include attachment binary data;
- preserve user/assistant ordering expected by the Gemini SDK.

The full transcript remains in PostgreSQL and in the UI even when older turns are outside the model context. No summary memory is introduced in this release.

## Natural-Language Behavior

The system instruction will be generated from a stable base prompt plus trusted organization context:

- current ISO date;
- organization name;
- configured currency;
- region, industry type, and business nature when present;
- active module/tool availability.

Behavioral rules require the assistant to:

- interpret common shorthand, minor spelling mistakes, and conversational phrasing;
- resolve pronouns and ordinal references from recent context;
- resolve relative dates from the supplied current date;
- use the organization's currency rather than always forcing INR;
- answer in the user's language when reasonably clear;
- use read tools for live Accountiva facts instead of guessing;
- ask one focused clarification when a write lacks a required or safely inferable field;
- distinguish a request to explain or draft from a request to save;
- state uncertainty rather than inventing records or totals;
- remain concise and show the facts needed for a decision.

## Tool Model

Split the current tool behavior into declarations, validation, preview, and execution.

### Read Tools

Read tools execute during the model loop. The supported invoice-only release surface includes:

- invoices and overdue/unpaid invoice queries;
- customers and top-customer queries;
- items;
- estimates;
- credit notes;
- dashboard summaries.

Returned values are normalized into small JSON results for Gemini and UI cards.

### Write Tools

Initial write tools remain deliberately narrow:

- create invoice, including batch invoice creation;
- create customer;
- create catalog item.

A write tool call performs schema and business validation but does not mutate a business table. It creates one pending action containing an immutable snapshot of the validated arguments and a human-readable preview.

At confirmation time, the backend rechecks:

- user and organization ownership;
- action status and expiry;
- current tool/module availability;
- required fields, dates, amounts, and allowed statuses;
- referenced customer or item state.

Execution and transition to `completed` happen in one database transaction. The write executor must accept a Prisma transaction client so the business record and action result commit together. Validation failure marks the action failed with a safe explanation; transient database failure rolls back and leaves the action pending for retry.

### Existing Release Controls

The AI tool registry and executor must honor the existing `ENABLE_ALL_FEATURES` behavior. With the default invoice-only release, staged bills, expenses, vendors, banking, journals, and transactions cannot be queried or mutated through the assistant. When the existing override is enabled, the current staged tools may be exposed. No feature-flag names, defaults, or configuration files are changed.

## Attachment Handling

- Accept at most three PNG, JPEG, or PDF files up to 10 MB each, matching the existing assistant behavior while remaining below the 50 MB encoded JSON request limit.
- Validate MIME type, declared size, decoded size, and attachment count at the backend boundary.
- Strip data-URL prefixes before sending inline data to Gemini.
- Store only safe metadata such as filename and MIME type with the chat message.
- Do not store base64 data, previews, or document contents in PostgreSQL or logs.
- Document analysis may propose a supported write action, but the proposal still requires confirmation.
- Unsupported staged records are explained without bypassing release controls.

The implementation must not raise global body limits.

## React Web Experience

Add an authenticated global assistant component to `AppLayout`:

- match the Vue floating launcher, panel dimensions, visual hierarchy, mascot, suggestions, upload interactions, and responsive behavior;
- use the current React theme tokens rather than copying Vue CSS implementation details;
- load the active conversation when opened or when the organization changes;
- support text, file selection, drag and drop, structured read-result cards, pending-action cards, Confirm, Cancel, Retry, and New chat;
- keep sends disabled while the same client request is processing;
- refresh affected screen data through the existing fetch/query patterns after a confirmed action;
- warn that New chat cancels unconfirmed actions.

This is visual parity, not source-code reuse. The legacy Vue repository is not edited.

## Native Mobile Experience

Add a global assistant trigger above the existing bottom navigation and open a full-screen native assistant surface. Do not add a sixth bottom-navigation item.

The native experience includes:

- a mobile header with back and New chat actions;
- keyboard-aware message list and composer;
- compact structured result and pending-action cards;
- Confirm and Cancel controls sized for touch;
- native image/document selection using SDK-compatible Expo modules;
- organization-change isolation and active-conversation reload;
- retry states that tolerate mobile connectivity loss;
- screen-reader labels, touch targets, and theme-consistent colors.

Web and native share API shapes and behavior, not UI component code.

## Idempotency and Concurrency

Each client send includes a stable `clientRequestId`. If the same request is retried:

- an existing completed assistant response is returned;
- an existing stored user message without a completed response is processed again without duplicating the user message;
- another user message is never inserted for that request ID.

Confirmation uses a conditional state claim inside the same transaction as tool execution. Concurrent confirmations therefore create at most one business record. A caller arriving after completion receives the stored result.

Cross-device simultaneous free-text sends are not serialized in this release. Each request uses committed history available when it begins. This is acceptable because simultaneous composition in the same user conversation is uncommon; request and confirmation idempotency still prevent duplicate records.

## Failure Handling

- Authentication or organization mismatch: return `401` or `403` without revealing whether the target exists.
- Invalid input or attachment: return `400` with a field-level safe error.
- Missing or closed conversation: return `409` so the client reloads the active conversation.
- Gemini timeout or unusable response: retain the idempotent user message, create no pending action or business write, and return a retryable error.
- Tool validation error: return the validation result to Gemini so it may ask a focused clarification.
- Model/tool loop cap: stop and ask the user to narrow the request.
- Expired or cancelled action: return `409`; never recreate it implicitly.
- Confirmation-time business validation failure: mark the action failed and ask the user to create a fresh proposal.
- Transient database failure during confirmation: roll back all mutations and leave the action pending.

Clients show human-readable errors and a retry control while keeping the current transcript visible.

## Privacy and Observability

Structured logs may include request ID, conversation ID, action ID, user ID, organization ID, model name, latency, tool name, round count, and coarse error category. They must not include:

- user message bodies;
- model response bodies;
- attachment data or extracted document text;
- pending-action arguments;
- customer details or financial values.

Unexpected errors retain server-side stack traces only where current production logging permits them; API responses remain generic.

## Compatibility and Rollout

1. Deploy the additive database migration and compatible backend behavior.
2. Verify legacy query chat and exact-text confirmation.
3. Deploy the React web assistant.
4. Deploy the native assistant and rebuild the application if native picker modules are introduced.

Old clients continue using `POST /api/chat` and the legacy history endpoint. The intentional compatibility change is that writes become pending and require confirmation. No current endpoint is removed.

The schema additions are rollback-safe for older backend code because old code ignores the new tables and fields. Rolling backend code back would restore immediate legacy writes, so rollback must be treated as a safety regression and used only deliberately.

## Testing Strategy

### Backend Unit Tests

Use the existing Node test runner with injected fake model and tool boundaries to cover:

- context ordering, role normalization, character/message caps, and structured-data truncation;
- system context for date, currency, region, and enabled tools;
- iterative read-tool result handling;
- write-tool conversion to a pending action with no business mutation;
- mixed read/write turns;
- loop and tool-call caps;
- exact legacy confirmation parsing;
- provider failures and retryable message state;
- attachment validation.

### Backend Route and Persistence Tests

Cover:

- active conversation creation and retrieval;
- New chat closure and pending-action cancellation;
- user and organization isolation;
- send idempotency;
- confirm, cancel, expiry, validation failure, and double-confirm behavior;
- transaction rollback on write failure;
- existing release-control enforcement;
- legacy response fields and history shape.

Run backend tests, TypeScript build, Prisma generation, migration validation, and migration status checks against an appropriate non-production database.

### React Web Verification

- Production TypeScript/Vite build.
- Pure state/normalization tests using existing project test facilities; do not add a large UI test stack solely for this feature.
- Manual verification of open/close, organization switching, long transcript loading, text send, drag/drop, file selection, read cards, pending cards, confirm/cancel, retry, and New chat.
- Visual comparison against the Vue assistant at desktop and narrow viewport sizes.

### Native Verification

- TypeScript check, Expo lint, and Expo doctor.
- Pure state/normalization tests using the existing lightweight test approach.
- Manual Android verification of keyboard behavior, long-list scrolling, image/document selection, offline retry, pending confirmation, duplicate-tap protection, organization switching, theme behavior, and screen-reader labels.

### Acceptance Scenarios

The release is accepted when all of the following pass:

1. A user asks for overdue invoices, then says “use the second customer and make the same invoice for next month”; the assistant resolves the references and shows a correct invoice preview.
2. No invoice exists before confirmation.
3. Confirming once creates exactly one invoice; confirming again returns the same result without another invoice.
4. The conversation and pending preview opened on web appear on native for the same user and organization.
5. Switching organizations never exposes the previous organization's messages or actions.
6. New chat isolates later context and cancels pending actions from the prior conversation.
7. A long conversation retains its transcript while the model receives only the defined bounded context.
8. Read requests involving estimates and credit notes use live data rather than hallucinated answers.
9. Default invoice-only release controls cannot be bypassed through AI tools.
10. Gemini or network failure produces no business write and can be retried safely.
11. The legacy Vue client can query normally and confirm its newest pending action by sending `confirm`.

## Explicitly Deferred

- Browsing, renaming, deleting, or searching older conversations.
- Automatic summaries of context outside the bounded recent window.
- Streaming tokens.
- Voice and speech features.
- AI-powered updates or deletions of existing records.
- Persisted attachment storage.
- General-purpose workflow automation.
