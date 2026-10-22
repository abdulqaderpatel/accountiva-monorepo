# Accountiva Conversational AI Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one persistent, context-aware Accountiva assistant shared by React web and native mobile, with multi-step Gemini tool use and explicit, idempotent confirmation for every write.

**Architecture:** The backend owns conversations, context selection, Gemini orchestration, tool access, and pending actions. React web and native consume one additive API through shared monorepo contracts and hooks; web renders a Vue-parity floating panel while native renders a full-screen modal. Database writes are prepared during chat and executed only by a separate transactional confirmation service.

**Tech Stack:** Node.js/TypeScript, Express, Prisma/PostgreSQL, `@google/generative-ai`, React 19, TanStack Query, Vite, Expo SDK 57, React Native 0.86, Vitest, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-22-ai-assistant-conversations-design.md`

## Repository Roots

- **Backend:** `/home/aq/Programming/Projects/accountiva-backend`
- **Monorepo:** `/home/aq/Programming/Projects/accountiva`

All backend paths below are relative to the Backend root. All shared/web/mobile paths are relative to the Monorepo root. Commit in the repository named by each task; do not combine paths from the two repositories in one commit.

## Global Constraints

- Do not edit `/home/aq/Programming/Projects/accountiva-frontend`.
- Do not rename, remove, or change defaults for existing feature flags.
- With `ENABLE_ALL_FEATURES !== "true"`, AI must not query or mutate bills, expenses, vendors, banking, journals, or transactions.
- Keep existing `POST /api/chat` and `GET /api/chat/history/:organizationId` response compatibility.
- Require confirmation for every write, including legacy Vue requests; exact text `confirm` is the only legacy execution shortcut.
- Use at most 30 messages and 30,000 serialized characters of model context.
- Limit one user turn to four model rounds and eight total tool calls.
- Accept at most three PNG/JPEG/PDF attachments of at most 10 MB each; do not raise the existing 50 MB JSON limit or persist binary data.
- Preserve the `GEMINI_MODEL` environment override; change only the fallback from `gemini-3.6-flash` to `gemini-3.8-flash`, the current stable Flash model with function calling documented by Google at <https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash>.
- React web must visually match the Vue assistant while using existing React theme tokens.
- Native must use a global launcher and full-screen modal, not a sixth bottom-navigation item.
- Run Prisma migration commands only against a verified non-production development database.

## Review Focus

- A MIME-spoofed, malformed, fourth, or oversized attachment returns `400` before Gemini is called; Task 3 pins this behavior.
- Two concurrent confirmations create one business record and both callers receive the same stored result; Task 7 pins this behavior.
- A guessed conversation/action ID from another user or organization reveals no data and performs no action; Tasks 6 and 7 pin this behavior.
- Retrying a send after a network timeout reuses the stored user turn and cannot create a duplicate response or pending action; Task 6 pins this behavior.
- A staged tool call fabricated by the model is rejected at dispatch and again at confirmation when `ENABLE_ALL_FEATURES` is off; Tasks 4 and 7 pin this behavior.

---

### Task 1: Add Conversation and Pending-Action Persistence

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<generated_timestamp>_add_ai_conversations/migration.sql`
- Create: `tests/aiSchema.test.ts`

**Interfaces:**
- Consumes: existing `profiles`, `organizations`, and `chat_messages` Prisma models.
- Produces: generated Prisma models `chat_conversations`, `chat_pending_actions`, enum `chat_action_status`, and nullable `chat_messages.conversation_id`, `client_request_id`, `in_reply_to_id`, `processing_token`, and `processing_started_at` fields for Tasks 6–7.

- [ ] **Step 1: Write the failing schema contract test**

```ts
test("AI conversation migration is additive and backfills existing messages", () => {
  assert.match(schema, /model chat_conversations/);
  assert.match(schema, /model chat_pending_actions/);
  assert.match(schema, /conversation_id\s+String\?/);
  assert.match(schema, /in_reply_to_id\s+String\?/);
  assert.match(schema, /processing_token\s+String\?/);
  assert.match(migration, /WHERE closed_at IS NULL/i);
  assert.match(migration, /UPDATE "chat_messages"/i);
});
```

The test must locate the single migration directory ending in `_add_ai_conversations` and assert the partial active-conversation unique index, user/organization indexes, existing-message backfill, nullable rollback-compatible conversation reference, unique non-null `in_reply_to_id`, and processing-claim fields.

- [ ] **Step 2: Run the schema test and verify it fails**

Run from Backend: `node --test --experimental-strip-types tests/aiSchema.test.ts`  
Expected: FAIL because the models and migration do not exist.

- [ ] **Step 3: Add the Prisma models and relations**

Add the fields specified in the design, including exact action statuses `pending`, `executing`, `completed`, `cancelled`, `failed`, `expired`. Add relations on `profiles` and `organizations`. Keep all new `chat_messages` references and processing fields nullable for rollback compatibility.

- [ ] **Step 4: Generate and complete the standard migration**

Run from Backend against a verified development database: `npm exec -- prisma migrate dev --name add_ai_conversations --create-only`.

Edit the generated SQL to:

- create one active conversation per existing `(user_id, organization_id)` pair;
- attach existing messages to that conversation;
- create the partial unique index for one `closed_at IS NULL` conversation;
- create a partial unique request-ID index when `client_request_id IS NOT NULL`.
- create a unique index when `in_reply_to_id IS NOT NULL` so one user message can have at most one assistant response.

- [ ] **Step 5: Generate Prisma and verify schema/migration checks**

Run from Backend:

- `npm run prisma:generate`
- `npm exec -- prisma validate`
- `node --test --experimental-strip-types tests/aiSchema.test.ts`
- `npm run build`

Expected: all commands exit 0.

- [ ] **Step 6: Commit Task 1**

```bash
git add prisma/schema.prisma prisma/migrations/<generated_timestamp>_add_ai_conversations/migration.sql tests/aiSchema.test.ts
git commit -m "feat(ai): add persistent conversation schema"
```

Replace `<generated_timestamp>` with the migration directory created in Step 4; do not stage unrelated migrations.

---

### Task 2: Build Bounded Context and Organization-Aware Prompts

**Files:**
- Create: `src/lib/aiTypes.ts`
- Create: `src/lib/aiContext.ts`
- Create: `src/lib/aiPrompt.ts`
- Create: `tests/aiContext.test.ts`

**Interfaces:**
- Consumes: stored message shapes and organization fields from Prisma.
- Produces:
  - `buildAiHistory(messages: StoredAiMessage[], limits?: { maxMessages: number; maxChars: number }): AiHistoryMessage[]`
  - `buildAiSystemPrompt(input: AiPromptContext): string`
  - backend-internal `AiHistoryMessage`, `AiOrganizationContext`, and tool-call types used by Tasks 4–7.

- [ ] **Step 1: Write failing context and prompt tests**

```ts
test("history keeps the newest useful turns within both limits", () => {
  const history = buildAiHistory(messages, { maxMessages: 30, maxChars: 30_000 });
  assert.equal(history[0]?.role, "user");
  assert.ok(history.length <= 30);
  assert.ok(JSON.stringify(history).length <= 30_000);
  assert.doesNotMatch(JSON.stringify(history), /base64,/);
});

test("prompt uses trusted organization currency and current date", () => {
  const prompt = buildAiSystemPrompt({ currentDate: "2026-10-22", organization, enableAllFeatures: false });
  assert.match(prompt, /2026-10-22/);
  assert.match(prompt, /USD/);
  assert.doesNotMatch(prompt, /all monetary amounts.*INR/i);
});
```

Also cover trimming an initial assistant message, clipped structured data, excluded error messages, reference-resolution rules, same-language replies, and absent optional organization fields.

- [ ] **Step 2: Run the tests and verify they fail**

Run from Backend: `node --test --experimental-strip-types tests/aiContext.test.ts`  
Expected: FAIL with missing modules/functions.

- [ ] **Step 3: Implement the context builder**

Implement `buildAiHistory` with exact defaults of 30 messages and 30,000 serialized characters. Select newest messages first, include bounded structured results, exclude error rows and attachment binary data, restore chronological order, and remove leading model turns.

- [ ] **Step 4: Implement the system-prompt builder**

Implement `buildAiSystemPrompt` with the spec's natural-language, uncertainty, live-data, clarification, currency, current-date, and confirmation rules. The prompt lists only tools available for the current release mode.

- [ ] **Step 5: Verify Task 2**

Run from Backend:

- `node --test --experimental-strip-types tests/aiContext.test.ts`
- `npm run build`

Expected: PASS and exit 0.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/lib/aiTypes.ts src/lib/aiContext.ts src/lib/aiPrompt.ts tests/aiContext.test.ts
git commit -m "feat(ai): build bounded organization context"
```

---

### Task 3: Validate and Normalize Multimodal Attachments

**Files:**
- Create: `src/lib/aiAttachments.ts`
- Create: `tests/aiAttachments.test.ts`

**Interfaces:**
- Consumes: untrusted `{ name, mimeType, size, data }` request objects.
- Produces: `normalizeAiAttachments(value: unknown): { modelParts: AiInlinePart[]; metadata: AiAttachmentMetadata[] }` or an `AiInputError` with HTTP-safe status/message.

- [ ] **Step 1: Write failing attachment-boundary tests**

```ts
test("attachment validation rejects spoofed and oversized input before model use", () => {
  assert.throws(() => normalizeAiAttachments([spoofedPdf]), /content.*type/i);
  assert.throws(() => normalizeAiAttachments(fourValidFiles), /three/i);
  assert.throws(() => normalizeAiAttachments([over10Mb]), /10 MB/i);
});
```

Also assert empty arrays succeed, PNG/JPEG/PDF magic bytes match the declared MIME type, malformed base64 fails, declared and decoded sizes are checked, and returned metadata contains no `data` field.

- [ ] **Step 2: Run the tests and verify they fail**

Run from Backend: `node --test --experimental-strip-types tests/aiAttachments.test.ts`  
Expected: FAIL with missing module.

- [ ] **Step 3: Implement attachment normalization**

Use constants `MAX_AI_ATTACHMENTS = 3` and `MAX_AI_ATTACHMENT_BYTES = 10 * 1024 * 1024`. Decode once, verify magic bytes (`%PDF-`, PNG signature, JPEG SOI), return Gemini inline-data parts plus safe metadata, and never log or persist decoded buffers.

- [ ] **Step 4: Verify Task 3**

Run from Backend:

- `node --test --experimental-strip-types tests/aiAttachments.test.ts`
- `npm run build`

Expected: PASS and exit 0.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/lib/aiAttachments.ts tests/aiAttachments.test.ts
git commit -m "feat(ai): validate chat attachments"
```

---

### Task 4: Split AI Tools into Gated Read, Preview, and Confirmed Write Operations

**Files:**
- Create: `src/lib/aiToolRegistry.ts`
- Modify: `src/lib/aiTools.ts`
- Create: `tests/aiTools.test.ts`

**Interfaces:**
- Consumes: Prisma-compatible database client, `enableAllFeatures`, authenticated `AiToolContext`, model function name/arguments.
- Produces:
  - `createAiToolRegistry(deps: AiToolRegistryDeps): AiToolRegistry`
  - `AiToolRegistry.declarations`
  - `AiToolRegistry.getKind(name): "read" | "write"`
  - `AiToolRegistry.runRead(call, context): Promise<AiToolResult>`
  - `AiToolRegistry.prepareWrite(call, context): Promise<PreparedAiWrite>`
  - `AiToolRegistry.executeWrite(prepared, context, tx): Promise<AiToolResult>`

- [ ] **Step 1: Write failing registry tests**

```ts
test("write preparation has no business mutation", async () => {
  const prepared = await registry.prepareWrite(createInvoiceCall, context);
  assert.equal(prepared.dataType, "invoice");
  assert.equal(fakeDb.writeCount, 0);
});

test("default release rejects staged calls even when the model fabricates one", async () => {
  await assert.rejects(() => registry.runRead(expenseQueryCall, context), /not available/i);
  await assert.rejects(() => registry.prepareWrite(createExpenseCall, context), /not available/i);
});
```

Also cover invoice/customer/item write classification, batch invoice preview, estimates and credit-notes reads, overdue/unpaid/top-customer/dashboard query normalization, maximum query limit 50, invalid amounts/dates/statuses, and `ENABLE_ALL_FEATURES=true` exposure without changing flag definitions.

- [ ] **Step 2: Run the tests and verify they fail**

Run from Backend: `node --test --experimental-strip-types tests/aiTools.test.ts`  
Expected: FAIL with missing registry exports.

- [ ] **Step 3: Extract the registry and preserve existing write logic**

Move classification/gating into `aiToolRegistry.ts`. Refactor existing database operations in `aiTools.ts` to accept an injected Prisma or transaction client. Keep current invoice/customer/item creation behavior and validation, but do not invoke it from `prepareWrite`.

- [ ] **Step 4: Add active-module read support**

Add query execution and normalized results for invoices, overdue/unpaid invoices, customers, top customers, items, estimates, credit notes, and dashboard summaries. Currency formatting remains a presentation concern; results carry numeric amounts and configured currency.

- [ ] **Step 5: Verify Task 4**

Run from Backend:

- `node --test --experimental-strip-types tests/aiTools.test.ts`
- `npm test`
- `npm run build`

Expected: all tests pass and build exits 0.

- [ ] **Step 6: Commit Task 4**

```bash
git add src/lib/aiTools.ts src/lib/aiToolRegistry.ts tests/aiTools.test.ts
git commit -m "refactor(ai): gate reads and confirmed writes"
```

---

### Task 5: Add a Gemini Gateway and Multi-Round Orchestrator

**Files:**
- Create: `src/lib/aiModel.ts`
- Create: `src/lib/aiOrchestrator.ts`
- Create: `tests/aiOrchestrator.test.ts`

**Interfaces:**
- Consumes: `buildAiHistory`, `buildAiSystemPrompt`, `AiToolRegistry`, and normalized user parts.
- Produces:
  - `AiModelGateway.start(input): AiModelSession`
  - `AiModelSession.send(parts: AiModelPart[]): Promise<AiModelTurn>`
  - `runAiTurn(input: RunAiTurnInput, deps: RunAiTurnDeps): Promise<RunAiTurnResult>`
  - `RunAiTurnResult.preparedWrites: PreparedAiWrite[]`

- [ ] **Step 1: Write failing orchestration tests with fake model sessions**

```ts
test("read tool results return to the model before the final answer", async () => {
  const result = await runAiTurn(input, depsWithTurns([readCallTurn, finalTextTurn]));
  assert.equal(fakeRegistry.readCalls, 1);
  assert.equal(fakeSession.sent.length, 2);
  assert.equal(result.text, "Northstar Labs owes ₹42,500.");
});

test("write calls return prepared writes and never execute or persist them", async () => {
  const result = await runAiTurn(input, depsWithTurns([writeCallTurn, previewTextTurn]));
  assert.equal(fakeRegistry.writeExecutions, 0);
  assert.equal(result.preparedWrites.length, 1);
});
```

Also test multiple read calls, mixed read/write calls, invalid-tool feedback, empty provider text, maximum four rounds, maximum eight tool calls, and provider exceptions.

- [ ] **Step 2: Run the tests and verify they fail**

Run from Backend: `node --test --experimental-strip-types tests/aiOrchestrator.test.ts`  
Expected: FAIL with missing gateway/orchestrator.

- [ ] **Step 3: Implement the provider-neutral orchestrator**

Route read calls through `runRead` and write calls through `prepareWrite`, then send typed preview responses back to the same model session. Keep prepared writes in request memory and return them with final text, structured read data, data type, and round/tool counts. This layer must not persist pending actions.

- [ ] **Step 4: Implement the Gemini gateway**

Wrap the installed `@google/generative-ai` SDK. Construct a model per request with dynamic system instruction and declarations. Preserve `GEMINI_MODEL`; use `gemini-3.8-flash` only when it is absent. Do not add another AI SDK.

- [ ] **Step 5: Verify Task 5**

Run from Backend:

- `node --test --experimental-strip-types tests/aiOrchestrator.test.ts`
- `npm run build`

Expected: PASS and exit 0 without live Gemini calls.

- [ ] **Step 6: Commit Task 5**

```bash
git add src/lib/aiModel.ts src/lib/aiOrchestrator.ts tests/aiOrchestrator.test.ts
git commit -m "feat(ai): orchestrate multi-step tool conversations"
```

---

### Task 6: Implement Conversation Storage, Pagination, Send Idempotency, and New Chat

**Files:**
- Create: `src/lib/aiConversationStore.ts`
- Create: `src/lib/aiConversationService.ts`
- Create: `tests/aiConversationService.test.ts`

**Interfaces:**
- Consumes: generated Prisma models, attachment normalization, context/prompt builders, `runAiTurn`, and authenticated user/organization IDs.
- Produces:
  - `createAiConversationStore(prisma): AiConversationStore`
  - `createAiConversationService(deps): AiConversationService`
  - `AiConversationService.getActive(input: { userId; organizationId; before?; limit? })`
  - `AiConversationService.startNew(input: { userId; organizationId })`
  - `AiConversationService.send(input: SendAiMessageInput)`

- [ ] **Step 1: Write failing service tests against an in-memory store**

```ts
test("a retried client request reuses one user turn and one response", async () => {
  const first = await service.send(request);
  const second = await service.send(request);
  assert.equal(store.userMessagesFor(request.clientRequestId).length, 1);
  assert.equal(orchestrator.calls, 1);
  assert.equal(second.assistantMessage.id, first.assistantMessage.id);
});

test("foreign conversation IDs are rejected without disclosure", async () => {
  await assert.rejects(() => service.send({ ...request, conversationId: otherOrgId }), /not available/i);
  assert.equal(orchestrator.calls, 0);
});
```

Also cover server-generated legacy request IDs, newest-50 chronological pagination with `before`, limit clamping 1–100, null active conversation, adoption of legacy null conversation rows, New chat closing the prior conversation, cancellation of pending actions, a simultaneous retry receiving retryable conflict, a stale claim being reclaimed after two minutes, provider-failure retry without duplicate pending actions, an obsolete processing token being unable to commit or clear a newer claim, and organization context loading.

- [ ] **Step 2: Run the tests and verify they fail**

Run from Backend: `node --test --experimental-strip-types tests/aiConversationService.test.ts`  
Expected: FAIL with missing store/service.

- [ ] **Step 3: Implement the Prisma conversation store**

Keep all queries scoped by `user_id` and `organization_id`. Use `(conversation_id, client_request_id)` for idempotent user-message insertion and the unique `in_reply_to_id` relation to find a completed response. Claim an unfinished user message with a unique `processing_token` and timestamp by conditional update; replace only claims older than two minutes. Return chronologically ordered pages plus `nextBefore`.

- [ ] **Step 4: Implement the conversation service**

Validate input before persistence, create an active conversation on first send, ignore client history/body organization ID, load trusted organization fields, claim the user turn, and invoke the orchestrator. In one token-guarded transaction, insert the final assistant response plus every prepared pending action and clear the claim. On provider failure, clear only the matching token and persist no action. If the response already exists, return it; if another live claim owns the turn, return retryable conflict. Return both additive and legacy response fields.

- [ ] **Step 5: Verify Task 6**

Run from Backend:

- `node --test --experimental-strip-types tests/aiConversationService.test.ts`
- `npm run build`

Expected: PASS and exit 0.

- [ ] **Step 6: Commit Task 6**

```bash
git add src/lib/aiConversationStore.ts src/lib/aiConversationService.ts tests/aiConversationService.test.ts
git commit -m "feat(ai): persist idempotent conversations"
```

---

### Task 7: Add Transactional Confirmation and Secure Chat Routes

**Files:**
- Create: `src/lib/aiActions.ts`
- Modify: `routes/chat.ts`
- Create: `tests/aiActions.test.ts`
- Create: `tests/chatRoutes.test.ts`

**Interfaces:**
- Consumes: `AiConversationService`, `AiToolRegistry.executeWrite`, Prisma transactions, `authMiddleware`, and `requireOrganization`.
- Produces:
  - `createAiActionService(deps): AiActionService`
  - `AiActionService.confirm({ actionId, userId, organizationId })`
  - `AiActionService.cancel({ actionId, userId, organizationId })`
  - `AiActionService.confirmLatest({ conversationId, userId, organizationId })`
  - `createChatRouter(deps?)` plus the default production router.

- [ ] **Step 1: Write failing action-service tests**

```ts
test("concurrent confirmation executes one write and replays its result", async () => {
  const [left, right] = await Promise.all([service.confirm(scope), service.confirm(scope)]);
  assert.equal(fakeRegistry.writeExecutions, 1);
  assert.deepEqual(right.result, left.result);
});

test("confirmation rechecks release gating and ownership", async () => {
  await assert.rejects(() => service.confirm(stagedActionScope), /not available/i);
  await assert.rejects(() => service.confirm(foreignOrgScope), /not available/i);
  assert.equal(fakeRegistry.writeExecutions, 0);
});
```

Also cover expiry, cancellation, completed replay, validation failure to `failed`, transient rollback remaining `pending`, and exact newest-action confirmation.

- [ ] **Step 2: Write failing route contract tests using a temporary Node HTTP server**

Test `GET /active`, `POST /conversations`, `POST /`, Confirm, Cancel, and legacy history. Inject fake auth/organization middleware and fake services; assert status codes, legacy fields, additive fields, organization-param mismatch rejection, and exact `confirm` interception. Do not add `supertest`.

- [ ] **Step 3: Run both test files and verify they fail**

Run from Backend: `node --test --experimental-strip-types tests/aiActions.test.ts tests/chatRoutes.test.ts`  
Expected: FAIL with missing action service/router factory.

- [ ] **Step 4: Implement transactional action execution**

Inside one Prisma transaction, conditionally change `pending` to `executing`, call `executeWrite` with the transaction client, store result/executed timestamp, and mark `completed`. A concurrent loser reloads and returns the completed result. Recheck expiry, ownership, and `ENABLE_ALL_FEATURES` before claiming.

- [ ] **Step 5: Refactor and secure the router**

Apply both `authMiddleware` and `requireOrganization` to every chat route. Add:

- `GET /active`
- `POST /conversations`
- `POST /`
- `POST /actions/:actionId/confirm`
- `POST /actions/:actionId/cancel`
- compatible `GET /history/:organizationId`

Use `req.user.id` and `req.orgId` only. Do not fall back to body organization IDs. Map input, conflict, and provider errors to the statuses defined in the spec without logging prompts or payloads.

- [ ] **Step 6: Verify the complete backend**

Run from Backend:

- `npm test`
- `npm run prisma:generate`
- `npm exec -- prisma validate`
- `npm run build`
- `npm exec -- prisma migrate status`

Expected: tests/build/validation pass; migration status reports the expected development state without modifying production.

- [ ] **Step 7: Commit Task 7**

```bash
git add src/lib/aiActions.ts routes/chat.ts tests/aiActions.test.ts tests/chatRoutes.test.ts
git commit -m "feat(ai): confirm actions through secure chat routes"
```

---

### Task 8: Add Shared Chat Contracts and Query Hooks

**Files:**
- Create: `packages/shared/src/chat.ts`
- Create: `packages/shared/src/chat.test.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/package.json`
- Create: `packages/api/src/chat.ts`
- Modify: `packages/api/src/index.ts`

**Interfaces:**
- Consumes: backend JSON contract from Tasks 6–7 and the existing configured Axios client.
- Produces:
  - `ChatAttachmentInput`, `ChatMessage`, `ChatConversation`, `PendingChatAction`, `ActiveChatResponse` (including `organizationId`), `SendChatPayload`, `SendChatResponse`.
  - `mergeChatMessages(current, incoming): ChatMessage[]`.
  - `mergeActiveChatResponse(current: ActiveChatResponse | undefined, incoming, expectedOrganizationId): ActiveChatResponse | undefined`.
  - `chatKeys.active(organizationId)`.
  - `useActiveChat`, `useSendChatMessage`, `useStartNewChat`, `useConfirmChatAction`, and `useCancelChatAction` hooks for Tasks 9–10.

- [ ] **Step 1: Write failing shared-contract tests**

```ts
it("merges paginated and retried messages once in chronological order", () => {
  expect(mergeChatMessages(current, overlappingPage).map((m) => m.id)).toEqual([
    "older", "existing", "newer",
  ]);
});
```

Also test pending/completed action decoding, unknown structured data preservation, missing optional legacy fields, and rejection/ignoring of stale organization responses by the query-cache updater.

- [ ] **Step 2: Run the test and verify it fails**

Run from Monorepo: `pnpm exec vitest run packages/shared/src/chat.test.ts`  
Expected: FAIL with missing module.

- [ ] **Step 3: Add shared types and pure merge helpers**

Export chat contracts from the package root and an explicit `./chat` package export. Keep types platform-neutral: no DOM `File`, React, or React Native imports. Make the pure active-response merge helper refuse an incoming response whose `organizationId` differs from the currently selected organization.

- [ ] **Step 4: Add API functions and TanStack Query hooks**

Implement exact endpoints from the spec. Scope every active-chat query key by organization ID. Merge successful sends and confirmations into the active-chat cache, and invalidate `['invoices']`, `['customers']`, or `['items']` only after the corresponding confirmed action.

- [ ] **Step 5: Verify shared packages**

Run from Monorepo:

- `pnpm exec vitest run packages/shared/src/chat.test.ts`
- `pnpm --filter @accountiva/shared exec tsc --noEmit`
- `pnpm --filter @accountiva/api exec tsc --noEmit`

Expected: PASS and exit 0.

- [ ] **Step 6: Commit Task 8**

```bash
git add packages/shared/src/chat.ts packages/shared/src/chat.test.ts packages/shared/src/index.ts packages/shared/package.json packages/api/src/chat.ts packages/api/src/index.ts
git commit -m "feat(ai): share conversation contracts and hooks"
```

---

### Task 9: Build the React Web Assistant with Vue Visual Parity

**Files:**
- Create: `apps/web-react/src/components/chat/ChatBot.tsx`
- Create: `apps/web-react/src/components/chat/ChatMessage.tsx`
- Create: `apps/web-react/src/components/chat/PendingActionCard.tsx`
- Create: `apps/web-react/src/lib/chatAttachments.ts`
- Create: `apps/web-react/src/lib/chatAttachments.test.ts`
- Modify: `apps/web-react/src/components/layout/AppLayout.tsx`

**Interfaces:**
- Consumes: shared chat types/hooks, `useAuth().currentOrganization`, existing `ai-mascot.png`, theme classes, Sonner, and shared `formatCurrency`.
- Produces: authenticated global `<ChatBot />`, drag/drop and file-picker attachment conversion, structured result cards, and pending-action Confirm/Cancel UI.

- [ ] **Step 1: Write failing browser attachment-helper tests**

```ts
it("accepts three supported files and rejects a fourth before reading", async () => {
  expect(await prepareWebChatFiles(validThree)).toHaveLength(3);
  await expect(prepareWebChatFiles(validFour)).rejects.toThrow(/three/i);
});
```

Also test unsupported type, declared size over 10 MB, preserved filename/MIME/size, and data-URL output. Use small synthetic `File` values; do not include real financial documents.

- [ ] **Step 2: Run the test and verify it fails**

Run from Monorepo: `pnpm exec vitest run apps/web-react/src/lib/chatAttachments.test.ts`  
Expected: FAIL with missing helper.

- [ ] **Step 3: Implement file conversion and the focused child components**

Implement `prepareWebChatFiles(files: File[]): Promise<ChatAttachmentInput[]>`, `ChatMessage`, and `PendingActionCard`. Pending cards render immutable preview fields, status, expiry, Confirm, Cancel, and retry-safe loading states with accessible labels.

- [ ] **Step 4: Implement the Vue-parity floating assistant**

Port the established Vue layout and behaviors into React without editing Vue: launcher, mascot, header, New chat, welcome state, suggestions, transcript, pagination-on-scroll, drag overlay, attachment chips, composer, loading/error states, structured results, and responsive sizing. Use the shared hooks; never send client history.

- [ ] **Step 5: Mount globally and handle organization changes**

Render `<ChatBot />` once in `AppLayout` after protected content. Close/reset local composer state when the organization changes, while the organization-scoped query key loads that organization's active conversation. New chat warns about pending-action cancellation.

- [ ] **Step 6: Verify React web**

Run from Monorepo:

- `pnpm exec vitest run apps/web-react/src/lib/chatAttachments.test.ts packages/shared/src/chat.test.ts`
- `pnpm --filter web-react build`

Manually verify desktop and narrow viewport parity against `apps/web/src/components/ChatBot.vue`, keyboard focus, attachment drag/drop, multi-turn reference display, Confirm/Cancel, duplicate-click loading state, New chat warning, and organization switching.

Expected: tests and production build pass; no Vue files change.

- [ ] **Step 7: Commit Task 9**

```bash
git add apps/web-react/src/components/chat apps/web-react/src/lib/chatAttachments.ts apps/web-react/src/lib/chatAttachments.test.ts apps/web-react/src/components/layout/AppLayout.tsx
git commit -m "feat(web): add persistent AI assistant"
```

---

### Task 10: Build the Native Mobile Assistant and Run Full Verification

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/mobile/assets/ai-mascot.png`
- Create: `apps/mobile/src/chat/attachments.ts`
- Create: `apps/mobile/src/chat/attachments.test.ts`
- Create: `apps/mobile/src/components/chat/ChatAssistant.tsx`
- Create: `apps/mobile/src/components/chat/ChatMessageCard.tsx`
- Create: `apps/mobile/src/components/chat/PendingActionCard.tsx`
- Modify: `apps/mobile/App.tsx`

**Interfaces:**
- Consumes: shared chat types/hooks, `useAuth().currentOrg`, mobile theme/typography, `FeedbackContext`, Expo document/file APIs, and copied mascot asset.
- Produces: global mobile assistant launcher, full-screen modal, native attachment selection, persistent transcript, and touch-safe confirmation UI.

- [ ] **Step 1: Read the SDK 57 document-picker and file-system documentation**

Read the matching versioned pages linked from `https://docs.expo.dev/versions/v57.0.0/` and `https://docs.expo.dev/llms.txt`. Record the supported result shape and base64-reading API in a short comment only if the API choice would otherwise be unclear.

- [ ] **Step 2: Install only the SDK-compatible Expo modules**

Run from `apps/mobile`:

- `npx expo install expo-document-picker expo-file-system`

Expected: `apps/mobile/package.json` and the root `pnpm-lock.yaml` update without a separate npm lockfile.

- [ ] **Step 3: Write failing native attachment-helper tests**

```ts
test("picker assets are validated before file content is read", () => {
  assert.throws(() => validatePickedChatAssets(fourAssets), /three/i);
  assert.throws(() => validatePickedChatAssets([oversizedAsset]), /10 MB/i);
  assert.equal(validatePickedChatAssets([pdfAsset])[0]?.mimeType, "application/pdf");
});
```

Also test missing MIME fallback from extension, unsupported extension, missing size, and stable metadata mapping. Keep native I/O behind `readPickedAttachment(asset): Promise<ChatAttachmentInput>` so validation tests remain pure.

- [ ] **Step 4: Run the helper test and verify it fails**

Run from Monorepo: `node --test --experimental-strip-types apps/mobile/src/chat/attachments.test.ts`  
Expected: FAIL with missing helper.

- [ ] **Step 5: Implement native attachment selection**

Implement `pickChatAttachments(): Promise<ChatAttachmentInput[]>` with `copyToCacheDirectory`, supported MIME filters, validation before reading, and SDK-57 file reading. Do not request camera/media-library permission because the system document picker is sufficient for images and PDFs.

- [ ] **Step 6: Implement the native chat components**

Use `Modal`, `SafeAreaView`, `FlatList`, and `KeyboardAvoidingView`. Add a launcher above the bottom navigation, full-screen header/back/New chat, suggestions, transcript pagination, attachment chips, composer, structured cards, Confirm/Cancel, retry states, screen-reader labels, and minimum touch targets. Copy the existing web mascot asset mechanically to `apps/mobile/assets/ai-mascot.png`.

- [ ] **Step 7: Mount the assistant in the authenticated app shell**

Render `ChatAssistant` beside the existing screen container and `BottomNav` only when a current organization exists. Reset local modal/composer state on organization changes; the shared query hook restores the matching active conversation.

- [ ] **Step 8: Run native and cross-repository verification**

Run from Monorepo:

- `node --test --experimental-strip-types apps/mobile/src/chat/attachments.test.ts`
- `pnpm test`
- `pnpm --filter web-react build`

Run from `apps/mobile`:

- `npx tsc --noEmit`
- `npx expo lint`
- `npx expo-doctor`

Run from `apps/mobile/android`:

- `./gradlew :app:assembleDebug`

Run from Backend:

- `npm test`
- `npm run build`
- `npm run prisma:generate`
- `npm exec -- prisma validate`

Expected: all automated checks pass.

With the backend running against a non-production development database and a test organization, manually verify:

- the acceptance conversation from the spec;
- no record before confirmation;
- one record after repeated confirmation taps;
- web-to-mobile active conversation continuity;
- organization isolation;
- New chat cancellation;
- offline/provider retry;
- Android keyboard, scrolling, picker, light/dark theme, and accessibility labels;
- legacy query plus exact typed `confirm`.

- [ ] **Step 9: Commit Task 10**

```bash
git add apps/mobile/package.json apps/mobile/assets/ai-mascot.png apps/mobile/src/chat/attachments.ts apps/mobile/src/chat/attachments.test.ts apps/mobile/src/components/chat/ChatAssistant.tsx apps/mobile/src/components/chat/ChatMessageCard.tsx apps/mobile/src/components/chat/PendingActionCard.tsx apps/mobile/App.tsx pnpm-lock.yaml
git commit -m "feat(mobile): add persistent AI assistant"
```

---

## Completion Criteria

- Backend and monorepo working trees contain only the intended commits.
- All Task 10 automated commands pass with fresh output.
- The eleven acceptance scenarios in the specification are manually exercised or explicitly recorded as unavailable with the exact environmental blocker.
- No legacy Vue file or feature-flag definition changes appear in either diff.
- A final whole-change review checks both repositories, migration safety, organization isolation, and confirmation idempotency before merge.
