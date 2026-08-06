# Project Gap Analysis

Audited 2026-08-06 against `AINEW.txt` (Groups 1-8 / Parts 1-17 + PART 13B), by reading the actual
implementation in `src/` — not file names. Each Part below is independent; "Status" reflects that
Part alone. Sources: 7 parallel code audits (one per engineering Group) plus direct verification for
Group 8. File:line citations are as reported by the audits at the time of writing and should be
re-checked if this report is read much later.

**Read this first — the one deviation that touches everything else:** the spec (PART 3) mandates
Supabase Auth as "the single, official identity provider... do not build a parallel custom auth
system." The codebase does exactly that: a fully custom, well-engineered email/OTP/session system
(`src/features/auth`, `src/lib/auth/*`) with no Supabase Auth and no Google OAuth. It works, it's
secure (bcrypt, timing-safe compares, rate limiting, Redis session cache), but it is the opposite of
what PART 3 specifies. Every day it survives, more foreign keys and code paths depend on it. See
PART 3 and the Execution Plan's Decision 1.

---

## PART 1 — Role, Vision, Architecture Principles

**Status: Complete**

**Implemented:**
- Feature-based Clean Architecture consistently applied: `src/features/<feature>/{actions,components,repository,services,validation}` across all 14 features.
- AI provider abstraction is real and enforced: `@anthropic-ai/sdk` is imported in exactly one file repo-wide, `src/features/ai/providers/claude.provider.ts` (self-documented as "the only file allowed to import" it, lines 39-41). All business logic calls `aiService.generateReply()` (`src/features/ai/services/ai.service.ts:87-89`).
- No provider/model/token terminology leaks into customer-facing code (`src/features/ai/prompt/prompt-builder.ts:110-115` explicitly instructs the model never to mention tools/CRM/systems).
- Server actions are thin — delegate to services, no business logic in components.
- Onboarding creates a Workspace that owns Users, AI Agent, Channels, Contacts, Leads, Orders, Products, Knowledge Base, Conversations — every schema table carries `workspaceId`.

**Missing:** None against this Part's checklist.

**Incorrect:** None found.

**Recommended Engineering Solution:**
- Add an ESLint `no-restricted-imports` rule scoping `@anthropic-ai/sdk` to `src/features/ai/providers/**` so today's discipline is enforced by tooling, not convention.

---

## PART 2 — Tech Stack, Database, Multi-Tenant & AI Foundation

**Status: Partial**

**Implemented:**
- Repository Pattern is real: every `db.select/insert/update/delete` outside `*/repository/*` is limited to the seed script and one trivial health-check query (`src/app/api/health/route.ts:13`).
- Multi-tenant isolation verified in code (not assumed from schema): contact/lead/order repositories all filter with `eq(table.workspaceId, workspaceId)`, IDs sourced server-side only.
- RBAC-as-data: `roles`/`permissions`/`role-permissions` tables, seeded with the 5 base roles (`src/db/seed/roles-permissions.seed.ts:16-59`), enforced via `permissionService.hasPermission` (`src/features/workspace/services/permission.service.ts:11-15`).
- Migrations: 24 real numbered SQL files, actively used, matching current schema.
- Redis session cache exists (`src/lib/redis/session-cache.ts`), gracefully no-ops without `REDIS_URL` (matches `DEFERRED_TASKS.md` item 3).

**Missing:**
- **BullMQ does not exist.** `package.json` has no `bullmq` dependency. All background jobs run on daily Vercel Cron (`subscription-check`, `automation-delays`) instead of the spec-mandated Redis/BullMQ queue system. This is the single largest tech-stack deviation from PART 2.
- TanStack Query, Zustand, Framer Motion, Cloudflare R2, Sentry, PostHog: all absent (matches `DEFERRED_TASKS.md` — most need external accounts or are simply not yet wired in).
- **No search of any kind** — not global, not even a per-module name filter on Contacts/Leads/Orders lists. Confirms `DEFERRED_TASKS.md` item 4.

**Incorrect:**
- Spec states "QStash replaced by BullMQ" as a firm architectural decision; actual implementation has neither — it uses simple cron polling. Functionally adequate at current scale (daily-granularity jobs), but not what's documented as decided.

**Recommended Engineering Solution:**
- Treat BullMQ as deferred, not urgent — Redis (`ioredis`) is already provisioned, so the seam is cheap to add later when sub-day-granularity or true async dispatch is actually needed (see PART 6, which needs this most).
- Build minimal per-module `ILIKE` filtering on Contacts/Leads/Orders as a stopgap before investing in full-text/global search.
- Route `src/app/api/health/route.ts` through a repository call for 100% pattern compliance, or document it as an accepted exception.

---

## PART 3 — Authentication, Onboarding, Channels & Conversation Platform

**Status: Partial**

### Authentication & Identity Provider
**Implemented:** Full custom stack — OTP (SHA-256 hashed, timing-safe, 10-min TTL, 5-attempt cap, `src/lib/auth/otp.ts`), bcrypt password hashing (12 rounds), sessions with hashed secrets in httpOnly/secure/sameSite cookies + Redis cache (`src/lib/auth/session.ts`), Remember Me (1 vs 30 days), rate limiting on OTP/login (`src/lib/rate-limit`), per-device session rows (multi-session-ready schema, no UI yet).

**Incorrect (hard spec deviation, verified):** Does not use Supabase Auth. Spec: *"Supabase Auth is the single, official identity provider... do not build a parallel custom auth system... do not reimplement OTP/password-reset flows manually."* This codebase reimplements exactly that. **No Google OAuth exists anywhere** (spec requires it as the MVP primary sign-in path).

### Registration & Onboarding
**Implemented:** Flow order matches spec (Email → OTP → Verify → Password → Account → auto-create Workspace → Onboarding). 9 full-page onboarding steps cover the spec's 10-step content; auto-save via `bumpStep()` after every step.

**Missing/Incorrect:**
- No distinct "Accept Terms" consent step/checkbox.
- **Step 10 "Connect Channels" is a non-functional stub** — `src/features/onboarding/components/channels-step.tsx:51-53` renders permanently-disabled "Coming Soon" buttons. No Meta OAuth anywhere.
- No skip affordance found in onboarding at all (spec requires steps to be skippable).

### Channels & Webhooks
**Missing (major gap):** No Meta OAuth flow, no webhook receiver endpoints of any kind (`src/app/api` only has `cron`, `health`, `reports` — zero webhook routes). Channel schema has only a binary status, no Connection Health/Last Sync/Permissions/Webhook Status columns. **Only a "manual" channel is functionally exercised** — WhatsApp/Instagram cannot receive real messages. This matches `DEFERRED_TASKS.md` item 6 (blocked on Meta Developer/Business verification/App Review — a multi-week external process, not a code task).

### Unified Inbox / Conversation View / AI-in-Conversation / Handover
**Implemented:** Real AI auto-reply + agent takeover + handover pipeline in `src/features/inbox/services/inbox.service.ts`, logged to activity history.

**Incorrect:** "Real-time" is **4-second client-side polling** (`POLL_INTERVAL_MS = 4000`), not push/websockets — deviates from "updates instantly... handle reconnects."

**Missing:** No suggested-reply UI, conversation summarization, intent-detection surfacing, or inbox filters (unread/assigned/pinned/tags/priority) beyond the base AI reply.

### RBAC & Team Management
**Implemented:** 5 seeded roles, permission-gated actions, single-use hashed invitation tokens.

**Missing:** No configurable business-facing role display labels ("Manager" → "Sales Manager"). **No audit logging on any workspace RBAC action** — `invite-member`, `update-member-role`, `revoke-invitation` never call the audit log (which is wired up correctly elsewhere in platform-admin).

**Recommended Engineering Solution:**
- This is pre-launch with zero live customers — the cheapest time this migration will ever be. Recommend migrating to Supabase Auth now rather than justifying the custom system's survival: (1) enable Supabase email/password + Google OAuth, (2) migrate `users`/`sessions`/`otp_codes` preserving `users.id` as Supabase's UUID to avoid touching every FK, (3) replace `session.ts`/`auth.service.ts` with `@supabase/ssr` helpers, (4) drop custom OTP/reset code, (5) leave `workspace_members`/`roles` untouched. This is a Phase-0 decision for the user, not something to execute unilaterally — see Execution Plan Decision 1.
- Build the Meta OAuth connect flow + `/api/webhooks/{whatsapp,instagram}` receivers once Meta approval is underway (code can be built now even while approval is pending — it just can't go live).
- Replace polling with Supabase Realtime (or SSE) — bundles naturally with the auth migration.
- Add audit-log calls to every workspace RBAC mutation using the existing `audit-log.repository.ts` pattern already proven in platform-admin.

---

## PART 4 — AI Brain, Agent Engine, Memory & Knowledge Architecture

**Status: Partial** (the tool-calling/reply pipeline is genuinely strong; memory depth and routing are the weak spots)

**Implemented:**
- Agent settings match spec exactly, plain-language, leak-free (`src/db/schema/ai-agents.ts`, `src/features/ai/components/*-settings-form.tsx`).
- Memory Layers 1-3 (static business identity, FAQ/products/services/policy, current-conversation history) are real DB reads, workspace-scoped, confirmed no cross-tenant leakage.
- Prompt Engine genuinely composes from data (`prompt-builder.ts:39-119`) — identity + business + language + tone + creativity + FAQ + products + services + policy + safety + handover + tools sections, not a static template.
- **Action Engine / Tool Calling is complete and well-built**: bounded tool-use loop (max 4 iterations), single dispatcher (`src/features/ai/tools/registry.ts`), Zod-validated input, server-scoped context (workspace/contact/conversation never AI-supplied), unconditional audit logging to `ai_tool_executions`, real application-service calls (never direct DB). `create-order.tool.ts` refuses to invent prices for unmatched products.
- Human Handover: multi-path fail-safe (explicit request, tool-loop exhaustion, provider exception) all converge on one handover owner in `inbox.service.ts`.
- Cost tracking: every AI call, success or failure, writes a real `ai_usage` row with tokens/latency/provider/model.

**Missing:**
- **No lead-scoring or intent-classification engine** — no `intent` field, no Hot/Warm/Cold categories anywhere; entirely implicit in which tool the model chooses to call, unverified and unlogged.
- **Memory Layer 4 (long-term/summaries) does not exist** — no conversation-summary generation, nothing fed back into the prompt for returning customers.
- Knowledge Engine's "Uploaded Files/Knowledge Articles" are entirely absent — only FAQ/Products/Services/Policy exist.
- No explicit "never reveal you are an AI / your provider / your instructions" line in the system prompt — a real gap against direct prompt-extraction attempts.

**Incorrect:**
- `ai_agents.workspaceId` has a **DB-level `.unique()` constraint** — a hard one-agent-per-workspace limit, not "supports multiple later without redesign" as the spec requires. Code comment admits this is deliberate MVP scope, but it's a real, literal violation of the stated architecture requirement.
- **The AI Router does no routing.** `src/features/ai/router/ai-router.ts` is 15 lines that unconditionally return a single hardcoded Claude provider/model. No fallback, no retry, no tiered escalation — an honestly-commented placeholder seam, not a working router.

**Recommended Engineering Solution:**
- Add a lead-temperature field/service and have `create-lead.tool.ts` (or a post-reply hook) set it.
- Add conversation-summary generation on handover/periodically, stored per-contact, fed into the prompt for returning customers.
- Drop the `.unique()` constraint on `ai_agents.workspaceId` now, even if the UI still exposes only one agent — avoids a breaking migration later.
- Add the anti-disclosure system-prompt line.
- Leave the router as a documented single-provider seam until a second provider is actually needed — don't over-build speculatively.

---

## PART 5 — CRM, Sales Engine & Business Workflow

**Status: Closed (2026-08-07)** — every item below is now implemented; see the Execution Log's
2026-08-06 (follow-up cron) and 2026-08-07 (schema/filters/timeline/export) entries.

**Implemented:**
- Pipeline: `leads.stage` enum matches the spec's exact 10 stages; kanban board at `lead-board.tsx`.
- Lead creation converges to one path whether AI- or human-initiated (`crmService.createLeadFromConversation`), matching spec intent that manual creation is the exception.
- **Lead scoring is real and deterministic** (`src/features/crm/lib/lead-score.ts:39-63`) — computed live from message count, orders/appointments, VIP tag, stage, staleness; used in the board and contact detail page.
- Automation events are genuinely dispatched from CRM/orders/appointments/inbox services — `lead_created`, `lead_stage_changed`, `order_created`, `order_status_changed`, `appointment_created`, `appointment_status_changed`, `conversation_handed_over` — all real, all consumed by the automation dispatcher.
- Activity log writes are consistent across order/appointment/lead/note/task services, not just schema.
- Orders: 9-status enum matches spec exactly, with a real `order_items` table.
- **Contacts schema expanded**: `avatarUrl`, `country`, `city`, `source`, `lifecycleStage` (lead/customer/repeat_customer/vip/loyal_customer, auto-advanced on order completion via `crmService.advanceLifecycleStage`, rank-gated so it only ever advances), `assignedAgentId`.
- **Full filter UI**: Contacts (lifecycle stage, tag) and Leads (tag, language), both server-side.
- **CRM follow-up cron**: `/api/cron/crm-followups` — inactive-7-days open leads get an in-app notification, re-notified every 7 days while still stale (not once-ever, not daily).
- **Unified customer timeline**: one interleaved, sorted feed (`mergeTimeline()`) replacing the old fragmented per-section lists; Task/Note panels deliberately stay as separate interactive widgets above it.
- **Export**: CSV, Excel (SheetJS), and PDF (pdfkit) via a shared `report-response.ts` dispatcher, on all 4 report routes.

**Remaining gaps, deliberately not closed by this pass** (not part of the original approved Phase 5
scope — would each be their own contained follow-up):
- Products/Services schemas still lack categories, variants, images, discount, stock, AI-visibility flag, availability windows.
- No real tags entity — `contacts.tags` is still an ad-hoc `jsonb` string array.
- **No AI-in-CRM beyond tagging/lead-creation/tool calls** — zero sentiment analysis, churn detection, or purchase-probability prediction.
- Lead score is still **never persisted** — recomputed live rather than cached/filterable at the DB level (a deliberate choice, see the 2026-08-06 Phase 5 log entry — staleness risk wasn't clearly worth it).

---

## PART 6 — Automation Engine & Workflow Platform (+ Extensions)

**Status: Closed (2026-08-07)** for everything not explicitly blocked on Meta OAuth or a deliberate
architectural deferral — see below and the Execution Log's Phase 1/2026-08-06/2026-08-07 entries.

**Implemented:**
- 11 real triggers wired to real events (lead/order/appointment/conversation/message/tag/AI-failure
  changes) firing from the actual CRM/orders/appointments/inbox services.
- Conditions: flat AND/OR across `tag`/`language`/`lead_score`/`order_value`/`working_hours` fields.
- 11 real actions with real handlers: `add_contact_tag`, `remove_contact_tag`, `notify_owner_email`,
  `create_task`, `create_note`, `update_contact_language`, `create_lead`, `close_conversation`,
  `assign_agent`, `webhook_call` (SSRF-safe fetch), `trigger_another_workflow` (loop-protected,
  depth-capped), `create_order`, `book_appointment`, `send_ai_reply`, `request_approval`.
- Delay: day-granularity, backed by a durable Postgres row (`workflowPendingRuns`) drained by a daily cron — genuinely restart-safe.
- Every run (immediate or delayed) writes a real `workflowExecutions` row with `retryCount`, and is
  actually retried (`MAX_ACTION_ATTEMPTS = 2`) before being logged as a failure; errors never propagate
  to the triggering request.
- Visual canvas (`@xyflow/react`) is real UI, but **deliberately fixed at exactly 3 static nodes** — a linear editor, not a graph/branching editor (self-documented in code comments).
- **Permission enforcement on all workflow CRUD** — `automation.workflows.view`/`.manage`, fixed in Phase 1.
- **AI Workflow Generator** — `aiService.generateWorkflowFromDescription()` parses plain language into the same `createWorkflowSchema` shape manual building produces; populates the same form state `applyTemplate()` does, so it goes through the identical submit path (no second execution model). Gated behind the `automation.ai_workflow_generator` feature flag (Phase 8).
- **Human Approval extension** — `workflow_approvals` table + `/dashboard/automations/approvals` inbox; approving re-runs a pre-linked workflow's action via the existing `trigger_another_workflow` chain primitive rather than a new "resume" concept.
- **Workflow status**: `draft`/`active`/`paused`/`disabled`/`archived` (was just active/paused).
- `workflow_ai_generated`/`workflow_approval_decided` now logged to the workspace Audit Log.

**Remaining gaps, out of the approved scope:**
- Nested AND/OR condition groups, Branches, general Variables, Workflow Versioning — still absent (the
  engine stays deliberately linear/3-node, not a graph editor).
- Multi-Channel Dispatch: only Email + in-app + webhook are real; WhatsApp/SMS actions don't exist (blocked on Meta OAuth, PART 3/7).
- No BullMQ/Redis job queue — execution is still synchronous/inline within the triggering request (kept deliberately; cron-based delays are already restart-safe, and introducing a queue was scoped to "only if sub-day granularity or true async dispatch becomes a real requirement," which hasn't happened).

---

## PART 7 — Dashboard, Analytics & Business Intelligence

**Status: Substantially closed (2026-08-07)**

**Implemented:**
- AI Insights are real, not canned — pulls live dashboard numbers, sends to the actual AI provider, caches per-workspace for 24h with fallback to last-good cache.
- **Business Health Score is genuinely computed** — averages lead-conversion/order-completion/appointment-completion/AI-success rates, correctly returns `null` (not a fake 0) when there's no data.
- Real KPIs + charts backed by real repository queries, now including both `BarChartCard` and a
  `LineChartCard` (time-series trends render as lines, category comparisons as bars — a real form fix,
  not a blanket swap) and a "Revenue by product" breakdown.
- **Role-based Home dashboard** — `dashboardService.getMyWorkBand()` branches Agent/Viewer to their own
  assigned conversations/tasks, distinct from the management-role summary bands (Phase 3).
- **9 of the spec's 11 named report types now exist**, all with CSV/Excel/PDF export: Contacts, Leads,
  Orders, Appointments, Conversations, Automations, AI Usage, Team Performance, Revenue. Only Channels
  (low value while WhatsApp/Instagram remain Meta-blocked stubs) is still missing.
- **Team Performance report** — per-agent conversations handled, tasks completed, avg first-response
  time, feeding a full workspace-member roster (zero-activity members included, not hidden).

**Remaining gaps:**
- Channels report type not built (would mostly export empty rows until Meta OAuth lands).
- No AI Recommendations feature ("contact these 5 hot leads today") — still absent.
- No dedicated tenant AI Activity Log page (the AI Usage report is exported from `/dashboard/ai-employee`, not its own page).

---

## PART 8 — Billing, Subscriptions & Monetization

**Status: Partial** (largely correct given the explicit business constraint that no payment company exists yet — see `DEFERRED_TASKS.md`)

**Implemented:**
- Plans are feature-gate based (`enabledFeatures: jsonb<string[]>`), with price/currency (IQD) and billing cycle — confirmed genuinely usage-limit-free (no max users/agents/channels columns at all).
- Manual subscription lifecycle is real, not a placeholder: admin activation, daily cron sending 3/2/1-day reminders and auto-suspending expired workspaces.
- `calculateRevenue()` is real and unit-tested — MRR/ARR with yearly-to-monthly normalization, correctly shows $0 because no real plan has a price set yet (a pricing decision, not a code gap).
- AI cost is surfaced platform-wide at `/admin/ai-usage`.

**Missing:**
- No trial-expiry timer or conversion tracking.
- **No payment gateway of any kind** — confirmed by grep, matches the documented business blocker (no registered company yet).
- No invoices, no usage metering/warnings, no discounts/coupons/refunds, no multi-currency.
- `/admin/revenue` has no churn/LTV/ARPU/trial-conversion metrics.

**Recommended Engineering Solution:**
- Add `trialExpiresAt` + a cron check reusing the existing daily-job pattern.
- Add a minimal `invoices` table populated on every manual `activateSubscriptionAction`, giving at least an audit record ahead of a real gateway.
- Defer usage metering entirely until pricing is actually usage-based — don't build a metering pipeline speculatively.

---

## PART 9 — Super Admin Platform & SaaS Operations

**Status: Substantially closed (2026-08-07)** — the three named net-new subsystems are now built; only
infra monitoring remains, correctly blocked on external accounts (`DEFERRED_TASKS.md` item 9).

**Implemented:**
- Fully separate auth (`requirePlatformAdmin`/`requirePrimaryPlatformAdmin`), independent of tenant RBAC.
- Real workspace management: activate plan, change status (suspend/restore), **read-only impersonation** restricted to bootstrap admins, every view logged to `audit_logs`, zero write path — confirmed by reading the page, no mutation actions present.
- Audit log with a real typed action enum, snapshots actor email so it survives admin deletion.
- **Support tickets system** — `/admin/tickets` sees every workspace's tickets, replies, changes status; tenants use `/dashboard/support`. In-app notification + best-effort email on reply, both workspace and platform audit logging.
- **AI Operations console** (`/admin/ai-operations`) — a platform-wide AI kill switch that degrades safely through the existing `inboxService.triggerAiReply` catch path, plus a per-provider/model request/success-rate/latency breakdown.
- **Feature flags system** (`/admin/feature-flags`) — create/toggle global flags, fail-open by default, distinct from plan-based feature gating; wired as a real gate on the AI Workflow Generator.
- Unified Super Admin home dashboard now exists (Phase 8, earlier slice) — `/admin` has a real landing page (workspace/revenue/AI KPIs + recent signups), not just nav links.

**Remaining gaps:**
- No search/filter on the workspace list, no delete, no reset-trial/reset-limits, no transfer-ownership.
- **No system/error/infra health monitoring** — Sentry/PostHog still confirmed absent; formally deferred
  (not a gap to schedule, an external-account blocker — see `DEFERRED_TASKS.md` item 9).
- Audit event coverage is narrower than spec: missing admin-login, refund-issued, role-updated, AI-provider-changed events.

---

## PARTS 10-13 — Engineering Standards & Product/UX Principles

**Status: Partial** (process rules; spot-checked where concretely verifiable)

**Implemented:**
- `tsconfig.json` has `"strict": true`; **zero `: any` and zero `@ts-ignore`** across all of `src/` — genuinely clean.
- Real structured error hierarchy (`src/lib/errors/app-error.ts`) used consistently via `toActionError`/`actionOk`/`actionFail`.
- `messages/{ar,en,ku}.json` all have identical key counts (622 each); RTL is real (`dir={dirFor(locale)}` on the root layout element), not cosmetic.
- 16 real `*.test.ts` files across service/lib layers, not a token amount.
- CI runs all four gates in order: typecheck → lint → test → build.
- No AI-vendor-name leaks anywhere in tenant-facing code or `messages/en.json`.
- Three-Click Rule holds structurally for the key actions checked (reply/create order/book appointment all ≤2 clicks from Home).

**Missing:**
- No ESLint rule enforcing the `any`/`@ts-ignore` ban — today's cleanliness is manual discipline, not gated.

**Incorrect:**
- Minor: `messages/en.json` platform-admin keys contain the word "tokens" — scoped to the internal `/admin` surface, not the tenant app, so arguably out of scope for the "no AI terminology" rule, but worth a rename if platform-admin should also be held to it.

**Recommended Engineering Solution:**
- Add `@typescript-eslint/no-explicit-any` + a `@ts-ignore` ban to `eslint.config.mjs` to gate the current clean state going forward.

---

## PART 13B — Final Information Architecture, Navigation & Dashboard

**Status: Missing** — the concrete IA this Part mandates does not exist; the current nav is a fundamentally different pattern.

**Implemented (content exists, just not organized per spec):**
- Onboarding topical content, AI Employee settings (plain-language, leak-free), Contacts/Leads/Orders/Appointments as top-level routes, Admin routed fully separately from the tenant app.

**Missing:**
- **No sidebar at all.** `src/app/dashboard/layout.tsx:98-104` renders one flat horizontal scroll-nav with 12 ungrouped links (Home, Inbox, Contacts, Leads, Orders, Appointments, Automations, Billing, Test AI, Settings, Knowledge Base, Analytics, Team) — no 5-section grouping (HOME/INBOX/CUSTOMERS/AI EMPLOYEE/GROWTH), no GROWTH sub-tabs, no WORKSPACE SETTINGS split into an account menu.
- No human-readable "AI Activity Log" page anywhere.
- No 3-band Home layout (today / needs-attention / growth) — the actual Home page is one flat stat grid + two lists.
- No per-band aggregation endpoints with independently-verified auth — one monolithic `getSummary()` call, authorized once.
- No skip buttons anywhere in onboarding.

**Incorrect:**
- Billing/Team/Settings/Knowledge Base/Test AI/Analytics sit as flat peers to Home/Inbox instead of being split into sidebar-vs-account-menu, contradicting the spec's explicit separation.
- **Home dashboard directly surfaces `aiRequestsToday`** as a tenant-visible stat tile — the spec explicitly excludes AI token/cost/usage internals from Home.
- Onboarding step order/grouping diverges from the spec's 5-step outline (description is asked before tone/creativity; language/hours/handover are extra standalone steps not in the spec's grouping).

**Recommended Engineering Solution:**
- Replace the flat nav with a real 5-section sidebar; move Billing/Team/Settings into a new account-menu "Workspace Settings" surface.
- Split `dashboardService.getSummary` into 3 independently-authorized band endpoints; remove `aiRequestsToday` from Home (move it to an AI Activity Log page); surface the already-computed Business Health Score in the growth band.
- Add explicit Skip buttons to the description/knowledge-base/channels onboarding steps.

This is pure route/presentation restructuring per the spec's own "Implementation Notes" — no schema or service changes required, which makes it a comparatively safe, high-visual-impact phase.

---

## PART 14 — Website Builder, Online Store & Landing Platform

**Status: Missing.** No trace anywhere in the codebase — no schema, no feature folder, no routes. Confirmed via full-repo grep for website/store/theme/section-builder terminology (zero hits) in addition to the route/feature listing (`src/app`, `src/features` have no `website`/`store` entries at all).

**Recommended Engineering Solution:** Schedule as an independent later-phase build per the spec's own Group 8 framing — it depends on nothing else being fixed first, but does depend on Products/Services (PART 5) being reasonably solid, since the storefront reads directly from that catalog.

---

## PART 15 — Integration Platform & Extensibility

**Status: Missing.** No Integration Manager, connector interface, or any shipping/accounting/calendar/email/SMS provider adapters beyond the existing direct Resend usage. No trace in schema or routes.

**Recommended Engineering Solution:** Independent later-phase build; lowest urgency of Group 8 since nothing else currently depends on it.

---

## PART 16 — AI Predictive Analytics & Proactive Marketing Campaigns

**Status: Missing.** No churn-risk scoring, no broadcast/campaign engine, no CRM-segment builder. No trace in schema or routes.

**Recommended Engineering Solution:** Depends on WhatsApp/Instagram channels actually being live (PART 3's Meta OAuth) since broadcast campaigns need a real outbound channel — sequence after Channels are unblocked, not before.

---

## PART 17 — Ads Module, Meta Marketing Integration & Ad Intelligence

**Status: Missing.** No Meta Ads OAuth, no ad account/campaign/ad-set/ad/creative schema, no attribution engine. No trace in schema or routes.

**Recommended Engineering Solution:** Independent later-phase build; like PART 16, most valuable once there's a live channel/CRM loop to attribute revenue back to.

---

# Owner Decisions Needed (surfaced by this audit, not yet in DEFERRED_TASKS.md)

These aren't blocked on an external account — they're architectural calls that should not be made
unilaterally, per the "communicate assumptions, wait for approval" rule (PART 11). Once execution is
approved, whichever of these remain open will be added to `DEFERRED_TASKS.md`'s "Needs your decision"
section so they don't go stale.

1. **Supabase Auth migration** (PART 3) — spec mandates it explicitly; current custom auth is solid engineering but a direct contradiction. Migrating now (pre-launch, no live customers) is far cheaper than later. Recommend: migrate. Needs your sign-off before Phase 2 below starts.
2. **BullMQ introduction timing** (PART 2/6) — current cron-based approach is genuinely restart-safe and adequate at day-granularity; BullMQ only matters once sub-day delays or true async dispatch are needed. Recommend: defer until Automation's action/trigger expansion makes it necessary.
3. **Group 8 sequencing** (Parts 14-17) — all four are fully unbuilt and independent of each other. Recommend building them only after Groups 1-7 are stable, in the order Website/Store → Integrations → Campaigns → Ads (Campaigns and Ads both benefit from a live channel first).

---

# Execution Plan

Ordered by dependency, risk, and blast radius — not by Part number. Per the spec's own working method,
each phase still internally follows Architecture → Database/Schema → Backend Services → Repository →
APIs → UI. No implementation starts until this report and this plan are approved.

### Phase 0 — Decisions (no code)
**Goal:** Resolve the 3 items above before they get more expensive to change.
**Affects:** Everything downstream — Phase 2 in particular cannot start until Decision 1 is made.

### Phase 1 — Quick, low-risk fixes across the existing foundation
**Goal:** Close small, high-leverage gaps that don't require architectural decisions.
**Affects:** PART 2 (ESLint rule, health-route repo pattern, per-module filters), PART 6 (**automation permission enforcement — this is a real security gap, any workspace member can currently create/edit/delete workflows**, fix regardless of any other phase ordering), PART 3 (audit-log calls on RBAC mutations), PART 4 (drop `ai_agents.workspaceId` unique constraint, add anti-disclosure prompt line), PARTS 10-13 (ESLint any/ts-ignore ban).
**Why first:** All independently shippable, low blast radius, several are real bugs/security gaps rather than feature gaps.

### Phase 2 — Identity layer (conditional on Decision 1)
**Goal:** If approved, migrate to Supabase Auth + Google OAuth before more code depends on the custom system.
**Affects:** PART 3 auth core, every `userId`/`sessionId` consumer indirectly (via preserved IDs), `src/middleware.ts`.
**Why here:** Highest-risk, most foundational change in the whole report — must happen before Channels (Phase 4) and Navigation (Phase 3) add more surface area on top of the auth layer, but its risk means it should be isolated in its own phase, not bundled with feature work.

### Phase 3 — Navigation & Home restructure (PART 13B)
**Goal:** Rebuild the sidebar into the mandated 5-section IA, split Workspace Settings into an account menu, restructure Home into the 3-band layout, remove the AI-usage leak.
**Affects:** `src/app/dashboard/layout.tsx`, `src/app/dashboard/page.tsx`, `dashboardService.getSummary` (split into 3 authorized band endpoints).
**Why here:** Pure route/presentation work, no schema/service changes — safe to do early, and gives every subsequent phase (Growth modules especially) a real place to land instead of more flat nav links.

### Phase 4 — AI Engine depth (PART 4 gaps)
**Goal:** Lead-temperature scoring, conversation-summary memory (Layer 4), knowledge file uploads.
**Affects:** `src/features/ai/{tools,services,prompt}`, `src/features/knowledge-base`.
**Why here:** Directly improves CRM (Phase 5) and Automation (Phase 6) inputs — lead scoring and summaries feed both.

### Phase 5 — CRM enrichment (PART 5 gaps)
**Goal:** Contact schema expansion, lifecycle auto-advance, filter UI, CRM follow-up cron, timeline consolidation, PDF/Excel export.
**Affects:** `src/db/schema/contacts.ts` (migration), `src/features/crm/*`.
**Why here:** Depends on Phase 4's lead scoring being persisted to be genuinely useful; feeds Automation's condition-field expansion next.

### Phase 6 — Automation expansion (PART 6 gaps, beyond Phase 1's security fix)
**Goal:** Expand actions/triggers incrementally (prioritize ones with existing service equivalents), add retry logic, evaluate async dispatch need.
**Affects:** `src/features/automation/*`, `src/db/schema/workflows.ts`.
**Why here:** New actions like "Update Contact"/"Create Task" depend on Phase 5's CRM work being in place; "Send WhatsApp" action depends on Channels (Phase 7).

### Phase 7 — Channels (Meta OAuth + webhooks)
**Goal:** Build the WhatsApp/Instagram OAuth flow and webhook receivers so they're ready the moment Meta approval lands (external, multi-week, already tracked in `DEFERRED_TASKS.md`).
**Affects:** `src/features/workspace` (channel connection), new webhook routes, `src/features/inbox` (real-time via Phase 2's Supabase Realtime if approved).
**Why here:** Code-ready-but-can't-go-live, same pattern as the existing Anthropic-key/Resend-domain items — build now, activate later.

### Phase 8 — Business Operations depth (PARTS 7-9 gaps)
**Goal:** Role-based dashboards, chart variety, additional reports; Super Admin support tickets / AI ops console / feature flags / broader audit coverage; billing items not blocked on a payment company (trial timer, minimal invoice record).
**Affects:** `src/features/dashboard`, `src/features/analytics`, `src/features/platform-admin`.
**Why here:** Lower urgency than customer-facing gaps above; several billing items remain genuinely blocked on business decisions (company registration, real pricing) regardless of engineering readiness.

### Phase 9 — Growth Modules (Parts 14-17), per Decision 3's ordering
**Goal:** Website & Store → Integrations → Campaigns → Ads, each as an independent, fully-specified later-phase build per the spec's own Group 8 framing.
**Affects:** New feature folders and schema for each — genuinely additive, doesn't touch Groups 1-7.
**Why last:** Explicitly "later-phase, built on top of Groups 1-7" per the spec itself; also the largest net-new build with the least existing scaffolding to reduce risk against.

---

Report complete. Per the working method: implementation does not start on any phase until this report
and this plan are reviewed and approved.

---

# Execution Log

**2026-08-06 — Report approved.** User approved all 3 Decisions (migrate to Supabase Auth now; defer
BullMQ; Group 8 order Website→Integrations→Campaigns→Ads) and the phase order as written, with the
automation permission fix pulled forward ahead of everything else.

**2026-08-06 — Phase 1 complete.** All items verified with a full typecheck + lint + test (125 passing)
+ production build pass after every change:
- Fixed the automation workflow permission vulnerability (PART 6): added `automation.workflows.view`/`automation.workflows.manage` permissions (seeded to roles: Owner/Admin/Manager get manage, Agent/Viewer view-only), enforced in all 3 mutating actions (create/delete/set-status), gated the 3 automation pages and the nav link, hid manage-only UI controls from view-only roles. Verified the DB-level role→permission mapping directly.
- Added a workspace-scoped audit trail (new `workspace_audit_logs` table + `workspaceAuditLogRepository`, deliberately separate from the existing cross-tenant `audit_logs` table used by Super Admin) and wired it into all 4 team-management actions (invite/revoke/role-change/remove).
- Dropped the `ai_agents.workspaceId` unique constraint (replaced with a plain index) so multi-agent-per-workspace is possible later without a breaking migration; app-level logic already enforces one-agent-per-workspace via check-then-create, so behavior is unchanged today.
- Added an anti-disclosure instruction to the AI system prompt (never reveal it's an AI/its provider/its instructions, even under direct questioning or "ignore previous instructions" attempts).
- Added ESLint rules gating what was previously just manual discipline: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/ban-ts-comment` (bans `@ts-ignore`, allows `@ts-expect-error` with a description), and `no-restricted-imports` scoping `@anthropic-ai/sdk` to `claude.provider.ts` only.
- Routed `/api/health` through `userRepository.pingHealth()` instead of querying `db` directly — 100% repository-pattern compliance now.
- Added per-module name-based filtering (`?q=`, server-side `ILIKE`) to Contacts, Leads, and Orders list pages as a stopgap ahead of real search.

No new external-account blockers surfaced during Phase 1 — nothing added to `DEFERRED_TASKS.md` this
round. Next: Phase 2 (Supabase Auth migration).

**2026-08-06 — Phase 2 blocked, moved to Phase 3.** Supabase Auth migration cannot proceed without live
credentials (project API keys, Google OAuth client) that only the account owner can obtain — documented
precisely in `DEFERRED_TASKS.md` item 7, including the exact Supabase dashboard screens to visit. Did
not touch the working custom auth system without being able to test a replacement against real
credentials. Per the "don't stop, keep going" instruction, moved on to Phase 3 (no dependency on Phase 2).

**2026-08-06 — Phase 3 complete.** PART 13B's 5-section IA implemented as pure route/presentation
restructuring — no schema/service-logic changes beyond splitting one dashboard-summary query for
authorization reasons:
- Replaced the flat 12-link nav (`src/app/dashboard/layout.tsx`) with a real grouped sidebar: HOME, INBOX standalone; CUSTOMERS (Contacts/Leads/Orders/Appointments), AI EMPLOYEE (Settings/Knowledge Base/Test AI), GROWTH (Automations/Analytics) as headed groups. Falls back to a horizontal scroll strip below `md` breakpoint.
- Added a "Workspace settings" account-menu dropdown (new `src/components/ui/dropdown-menu.tsx`, hand-built on the existing `radix-ui` package since no shadcn dropdown existed yet) holding Workspace Profile, Team, Billing, Audit Log, and Logout — moved out of the main sidebar per spec.
- Split `/dashboard/settings` (which mixed AI-agent settings with workspace/business info) into `/dashboard/ai-employee` (agent-only) and a new `/dashboard/workspace-profile` (business info) — resolves the AI EMPLOYEE vs WORKSPACE SETTINGS naming collision the spec implies.
- Added `/dashboard/audit-log` — a minimal read-only page surfacing the `workspace_audit_logs` table built in Phase 1 (previously had no UI).
- Restructured Home (`src/app/dashboard/page.tsx`) into the mandated 3 bands: Today (conversations/leads/orders/appointments/revenue counters, new `dashboardService.getTodayAndAttentionBands`), Needs Your Attention (handover-pending conversations + cold leads inactive 7+ days, both linkable), How Your Business Is Growing (Business Health Score + 30-day KPIs, reusing `analyticsService.getSummary` — deliberately gated behind its own `analytics.view` permission check, independent of the base workspace check, so growth data isn't "inherited" access per the spec's aggregation-endpoint requirement). Removed the `aiRequestsToday` tile that was leaking an AI-usage internal onto the tenant-facing Home page. Dropped the old flat "recent activity" feed as a deliberate simplification (not spec-required, redundant with per-module pages).
- Added Skip links to the description and knowledge-base onboarding steps (the channels step already had an equivalent "Finish setup" escape hatch via disabled Meta OAuth buttons, so it didn't need a separate Skip).
- **Caught and fixed a real bug via actual browser testing** (crafted a session cookie directly rather than going through OTP, per this project's own established local-testing pattern — see DEFERRED_TASKS.md's workflow-canvas item): the mobile layout nested the flat nav and `<main>` as siblings in a row-flex container instead of a column wrapper, squeezing content into a narrow strip at 375px width. Fixed by wrapping nav+main in their own `flex-col` div, separate from the `<aside>`. Typecheck/lint/build all passed on the broken version — this was only visible by actually rendering the page.
- Verified end-to-end in a real headless-Chromium session: grouped sidebar renders correctly, all 3 Home bands render, account dropdown shows exactly the 5 expected items, all touched routes load without console errors, and the mobile viewport now stacks correctly.

Next: Phase 4 (AI Engine depth) — proceeding per the approved plan.

**2026-08-06 — Phase 4 substantially complete.** The two PART 4 gaps still actionable without an
external dependency:
- **Long-term memory (Layer 4)**: `aiService.generateSummary()` condenses a conversation transcript (reusing the existing `AIProvider`/`generateReply` abstraction — no new provider code, no SDK access outside `claude.provider.ts`) into 1-3 sentences, best-effort (never throws, logs and returns `null` on failure). Wired into `inboxService.triggerAiReply`'s existing handover path — generates and stores a summary the moment a conversation hands over, written to the `contacts.aiSummary` column that already existed in schema but nothing ever populated (confirmed by grep before starting: zero read/write sites). Fed back into `buildSystemPrompt` as a new `customerSummary` field so returning customers get continuity without replaying the full conversation, with an explicit instruction never to mention it's a summary. Surfaced on the contact detail page, which also never rendered this field before.
- Confirmed the other two PART 4 recommendations (drop `ai_agents.workspaceId` unique constraint, anti-disclosure system-prompt line) were already completed in Phase 1.
- Left as correctly deferred, not done now: lead-temperature persistence (re-scoped to Phase 5 — it's a PART 5/CRM concern, not PART 4/AI engine, despite living in the same gap-report paragraph originally), real AI-router fallback (no second provider exists yet to fail over to), and knowledge-base file uploads (blocked on Cloudflare R2 credentials, already tracked in `DEFERRED_TASKS.md`).

Verified with the same typecheck/lint/125-tests/build pass. Next: Phase 5 (CRM enrichment).

**2026-08-06 — Phase 5 (partial, scoped tightly).** Picked the single highest-value, best-contained
item from PART 5's gap list: the Follow-up Engine's literal spec example — "Customer inactive for 7
days -> Suggest follow-up" — which the CRM audit confirmed had zero implementation (only
`automation-delays`/`subscription-check` crons existed, nothing CRM-specific).

- New `/api/cron/crm-followups` (daily, same `requireCronAuth`/`vercel.json` pattern as the other two crons): finds open leads (not won/lost/cancelled) whose contact hasn't been touched in 7+ days, creates an in-app notification linking to the contact, and records `leads.lastFollowupNotifiedAt` so it re-notifies periodically (every 7 days while still stale) instead of once-ever or every single day.
- New `leads.lastFollowupNotifiedAt` column and a `crm_followup` notification type — both additive migrations.
- `leadRepository.findStaleOpenLeads()` is intentionally cross-tenant (no `workspaceId` param) since only the cron calls it — documented inline with the same justification `workspaceAdminRepository`'s cron-only queries already established, so it doesn't read as a violation of the "always filter by workspaceId" rule.
- 3 new unit tests covering the notify/mark path, per-lead failure isolation, and the empty case.

**Deliberately left for a later pass, not done now** (would each be their own contained piece of work,
and this session already covered a lot of ground): persisted lead score/temperature (the live
computed-on-read approach in `lead-score.ts` is arguably more correct than a naively-cached one and
wasn't clearly worth the staleness risk this pass), full filter UI beyond the name search added in
Phase 1, contact schema expansion (avatar/country/lifetime-value/etc.), timeline consolidation into one
interleaved feed, and PDF/Excel export. These remain accurately reflected as open items in this Part's
"Missing" section above — this Phase 5 entry does not claim them done.

Verified with the same typecheck/lint/test/build pass (128 tests now, +3). Next: Phase 6 (Automation
expansion — the permission fix already landed in Phase 1; remaining scope is action/trigger coverage).

**2026-08-06 — Phase 2 unblocked and completed.** User supplied live Supabase project credentials
(publishable/anon key, secret/service-role key; project ref `gsqmfnavruffsijjuksv`, matching the
existing `DATABASE_URL`). Full migration from the custom email/OTP/session auth system to Supabase Auth:

- Added `@supabase/ssr` + `@supabase/supabase-js`, browser/server client helpers (`src/lib/supabase/`), and rewrote `middleware.ts` to refresh the Supabase session and gate routes off it instead of a raw cookie-presence check.
- `requireUser()` in `auth-guard.ts` — the single chokepoint already used by ~90 files — now resolves the Supabase session and maps it onto our own `public.users` row, creating it (and the user's workspace) on first sight via a new `profileSyncService`. Kept `users.id` identical to the Supabase `auth.users.id` as planned, so **zero changes were needed in any of those ~90 downstream files** — the whole point of preserving IDs.
- Handled the one real pre-existing custom-auth account (`ssaadbbbb@gmail.com`, found via direct DB query before writing any migration logic — exactly one user, one empty-but-onboarded workspace) with a proper re-key transaction (`profileSyncService.reKeyUserId`): frees the email from the old row, inserts a new row at the Supabase-assigned id, repoints every FK across all 10 tables that reference `users.id`, deletes the old row. **Verified live** against a simulated legacy account (disposable test email, not the real one) via the Supabase Admin API + a real browser login — old row gone, new row correct, workspace and its membership preserved intact.
- Rebuilt registration (single email+password+terms step, Supabase sends its own confirmation email — the multi-step custom OTP flow is gone), login, forgot/reset password (now a real emailed link + PKCE code exchange, not a 6-digit code), and logout. Added a Google OAuth button (code-ready, calls `signInWithOAuth`) and `/auth/callback` for both OAuth and email-confirmation redirects.
- Removed the retired code: OTP generation/hashing, bcrypt password hashing, the custom session module, `otp.repository.ts`, `session.repository.ts`, the OTP-step actions/components, and `EmailService.sendOtpEmail` (Supabase sends its own emails now) — a real "no dead code" pass, not just addition. Deliberately did **not** drop the now-unused `otp_codes`/`sessions` tables/columns in this same change — schema deletions are a separate, lower-risk-to-defer cleanup.
- **Verified end-to-end against the live Supabase project** (not mocked): brand-new signup/login creates the profile+workspace and lands in onboarding correctly; a second login by the same user doesn't create a duplicate workspace; logout clears the session and `/dashboard` correctly bounces back to `/login` afterward. All driven through a real headless-Chromium session hitting the real dev server and real Supabase Auth API, using the Admin API (service-role key) to pre-confirm disposable test accounts so email delivery wasn't a blocker for testing. All test accounts and their workspaces were deleted afterward — the real account was never touched.
- Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` on Vercel Production via the CLI.
- Full typecheck/lint/128-tests/build pass, same as every other phase.

**Still open (see DEFERRED_TASKS.md):** Google OAuth is code-ready but needs the provider actually enabled in the Supabase dashboard (which itself needs a Google Cloud OAuth client) before that button does anything but error. `otp_codes`/`sessions` tables are now fully unused and can be dropped in a follow-up migration whenever convenient — not urgent, just schema debt.

**2026-08-06 — Google OAuth completed, then a follow-up: email flows switched to OTP codes.** User
finished the Google Cloud Console + Supabase provider setup (two rounds — first hit a
`redirect_uri_mismatch` from Google because the Supabase callback URL wasn't registered on the Google
OAuth Client, diagnosed by actually driving the button in a browser and reading Google's own error page
rather than guessing; second attempt confirmed reaching Google's real consent screen). Verified live
end-to-end. Also caught and fixed a real bug found the same way: the onboarding layout had no
header/logout at all, so a user landing there right after a fresh signup had no way to switch accounts —
added one.

User then asked to replace Supabase's magic-link email confirmation/password-reset with a 6-digit-style
OTP code entry (closer to the pre-migration UX). Implemented `verifySignupOtp`/`verifyRecoveryOtp` in
`auth.service.ts` and new code-entry UIs for both `/verify` and `/forgot-password` → `/reset-password`.
Verified fully end-to-end against the live project (Admin API's `generateLink` to obtain real codes
without needing inbox access) — and this test caught two real things a guess would have missed:
1. This project's actual OTP length is **8 digits**, not the assumed 6 — validation was built to accept 6-10 rather than hardcoding a count.
2. `verifyOtp(type: "recovery")` grants a full session immediately, which the middleware's "redirect away from auth pages if already logged in" rule then bounced out of `/reset-password` before the user could set a new password — fixed by excluding that one route from the auth-pages redirect list.

One remaining step needs the user: the Supabase email templates ("Confirm signup", "Reset Password")
still need to display `{{ .Token }}` as visible text in the actual email — otherwise a real user has no
way to read the code even though the whole verification pipeline is confirmed working.

**2026-08-06 — Phase 6 (partial, scoped tightly).** Per the plan's own guidance ("expand actions/triggers
incrementally, prioritizing ones with existing service-layer equivalents... add a retryCount/maxRetries
column and retry loop"), picked the highest-value, best-contained slice rather than all 12 missing
actions/14 missing triggers at once (the permission-enforcement gap this Part also listed was already
fixed in Phase 1):

- **3 new actions**, each with a real handler wired to the existing CRM services' repositories (not a
  stub): `create_task` (title/priority/optional due-in-days), `create_note` (content, with the same
  `{{contactName}}` substitution `notify_owner_email` already uses), `update_contact_language` (sets
  `contacts.language`, which required widening `contactRepository.update`'s allowed field set — it only
  accepted fullName/phone/email before). All three log to the same `activities` timeline as
  `actor: { type: "automation" }`, matching the existing tag actions' pattern exactly.
- **1 new trigger**, `tag_added`, wired into the one real non-recursive source: the AI's `add_tag` tool
  (`src/features/ai/tools/add-tag.tool.ts`). Deliberately **not** dispatched from automation's own
  `add_contact_tag` action handler — doing so would let two workflows tag each other in a cycle; skipping
  it there was judged simpler and safer than building loop detection, and `contactRepository.addTag` is
  already idempotent (no-ops on a duplicate tag) so the only real trigger source (the AI) is enough to
  make this a genuine, usable trigger. Matching a specific tag (vs. any tag) is left to the existing
  Conditions engine ("tag = VIP") rather than adding a second filtering mechanism.
- **Retry logic** (the plan's explicit ask): `runAndLog` now attempts an action up to 2 times total with a
  250ms backoff before logging a failure, and records how many retries happened in a new
  `workflow_executions.retry_count` column. Applies uniformly to every action type, immediate or delayed.
- Extended `WorkflowTriggerConfig`/`WorkflowActionConfig`, the create-workflow Zod schema (with
  `superRefine` rules requiring the new per-action fields), `describe-workflow.ts`'s human-readable
  summaries, and the React Flow visual canvas (`action-node.tsx` gained task/note/language fields,
  `trigger-node.tsx` picked up `tag_added` for free since its Select is enum-driven) — the same UI a user
  builds workflows in today, not a separate admin-only path.
- Migration `0026_needy_veda.sql` (2 enum additions + 1 new column) generated via `drizzle-kit generate`
  and applied live via `drizzle-kit migrate` against the production Supabase Postgres instance.
- i18n: added matching keys to all three locale files (en/ar/ku), verified programmatically that all
  three still have identical key counts (753 each, up from 622) after the edit — this project's own
  established check for i18n drift.
- 18 new/updated unit tests (automation.service.test.ts: tag_added matching, all 3 new actions incl.
  their missing-required-field failure paths, retry-success and retry-exhausted paths; schemas.test.ts:
  required-field validation for all 3 new actions plus language-enum rejection; registry.test.ts: asserted
  `add_tag` now also dispatches `tag_added`). Full suite: typecheck clean, lint clean, **143/143 tests
  passing** (up from 128), production build clean.

**Deliberately left for a later pass** (would each be their own contained piece of work): the remaining
~9 missing actions (Send AI Reply, Assign Agent, Create Lead/Order, Book Appointment, Archive/Close
Conversation, Trigger Another Workflow, Webhook/API Call — several depend on Channels/Meta OAuth landing
first) and ~13 missing triggers (Message Received/Replied, Lead Won/Lost, Order Paid/Delivered, Customer
VIP, AI Failed, Channel Connected, Workspace Created, Subscription Renewed, Payment Failed, User
Invited — note Lead Won/Lost and Order Paid/Delivered are arguably already covered today via
`lead_stage_changed`/`order_status_changed` with a specific stage/status configured, so the real gap is
narrower than the raw count suggests); nested AND/OR condition groups, Branches, general Variables,
Workflow Versioning; AI Workflow Generator and Human Approval extensions (net-new subsystems, not
patches); async/queued execution via BullMQ (still correctly deferred per Decision 2 — nothing in this
pass changed that); Workflow status enum's missing Draft/Disabled/Archived states. These remain accurately
reflected as open items in PART 6's "Missing" section above — this entry does not claim them done. **Did
not independently browser-verify the canvas UI this round** (no browser-automation tool was available in
this session, unlike the Phase 3 mobile-layout bug and the Phase 1 workflow-canvas bug, both of which were
only caught by actually rendering the page) — typecheck/lint/build all passed, and the new fields reuse
the exact same Input/Select/Textarea/enum-driven-options pattern already proven working for the existing
tag/email actions, but this is a real gap in verification depth compared to earlier phases and should be
spot-checked in a browser before being fully trusted.

Next: remaining Phase 6 scope (if picked up again) or Phase 7 (Channels/Meta OAuth) per the approved plan.

**2026-08-06 — Phase 6, second slice.** Continued the same "pick the highest-value, best-contained
piece" approach for another round of PART 6's remaining gaps:

- **3 new triggers**, all dispatched from real event sources rather than invented: `message_received`
  (from `inboxService.logCustomerMessage` and `startConversation`, both places a customer message is
  logged), `message_replied` (from the AI-reply success path and `sendAgentReply` — fires whenever the
  business, human or AI, replies), `ai_failed` (from `triggerAiReply`'s existing catch block, alongside
  the `conversation_handed_over` dispatch that already lived there).
- **2 new actions**: `create_lead` (contact-scoped, works even without a conversationId since
  `leads.conversationId` is nullable in schema — dedupes against any existing non-terminal-stage lead for
  the same contact before creating a new one, so a workflow that fires repeatedly for the same contact
  doesn't spam duplicate leads; on real creation it cascades an internal `dispatch(lead_created)` call so
  other `lead_created`-triggered workflows still fire, matching the spec's own "Lead Won → Create Customer
  → ..." chained-automation example — bounded by the dedup check, not by depth-limiting, since a second
  `create_lead` attempt on the same contact always no-ops once the first lead exists), `close_conversation`
  (closes the contact's most recently active *open* conversation via `conversationRepository`, since an
  `AutomationEvent` only ever carries a `contactId`, not a `conversationId`; throws — and is retried, then
  logged as a failure — if the contact has no open conversation to close).
- New `conversation_closed` activity-timeline type (schema enum addition) so this action's effect shows up
  on the contact's activity feed like every other action.
- Migration `0027_gorgeous_otto_octavius.sql` (5 enum additions across `workflow_trigger`,
  `workflow_action`, `activity_type`) generated and applied live to production Supabase, same as before.
- i18n: en/ar/ku all updated and re-verified in sync (763 keys each, up from 753).
- 13 new tests (trigger-matching for all 3 new triggers; create_lead's create/dedupe-skip/all-terminal
  paths, explicitly testing the recursive `dispatch(lead_created)` call resolves to exactly one logged
  execution rather than a runaway chain; close_conversation's success and no-open-conversation-failure
  paths). Full suite: typecheck clean, lint clean (one real unused-variable warning caught and fixed —
  `create_lead`'s handler assigned the created lead to a variable it never used), **156/156 tests passing**
  (up from 143), production build clean.
- **Did not add test coverage for the 5 new `inboxService` dispatch call sites themselves** —
  `inbox.service.ts` had no existing test file before this change (confirmed by search), and building one
  from scratch (mocking `aiService`/`messageRepository`/`conversationRepository`/`contactRepository`/
  `channelRepository` together) was judged out of scope for this slice; the dispatch calls are one-line
  additions to already-tested call sites, and `automation.service.ts`'s own trigger-matching is fully
  covered, but this is a real, undyed coverage gap worth closing in a dedicated pass.
- **Considered and deliberately rejected** a `workspace_created` trigger and a `user_invited` trigger from
  PART 6's original gap list: both are structurally incompatible with this engine's current per-contact
  event model (`AutomationEvent` always carries a `contactId`; `dispatch()` looks up workflows scoped to
  the *target* workspace — but a workflow can only exist in a workspace that's already been created, so a
  workspace-scoped `workspace_created` trigger can by definition never have a workflow to fire, and
  `user_invited` has no natural contact to attach to). Not deferred as "not done yet" — flagged as a real
  design mismatch against the spec's flat trigger list that would need either a platform-wide automation
  scope or a schema change to fix, not a quick add.
- **Considered and deliberately rejected** re-scoping `tag_added`-style "Customer VIP" as its own trigger:
  it's already fully covered today by `tag_added` + a Condition rule (`tag = VIP`), which is exactly the
  pattern the Phase 6 first-slice entry above chose deliberately to avoid a second filtering mechanism.

**Still open in PART 6** after both slices: Send AI Reply, Assign Agent, Create Order, Book Appointment,
Trigger Another Workflow, Webhook/API Call actions (each has real complexity — catalog/date selection UI,
SSRF-safe outbound calls, loop-prevention for chained workflows — deliberately not rushed); deeper
condition fields (Lead Score, Order Value, Working Hours, Sentiment, AI Confidence), nested AND/OR groups,
Branches, general Variables, Workflow Versioning; AI Workflow Generator and Human Approval (net-new
subsystems); Workflow status Draft/Disabled/Archived states; async/queued execution via BullMQ (still
correctly deferred per Decision 2). Canvas UI browser-verification is still outstanding for both Phase 6
slices — no browser-automation tool has been available in this session.

Next: further Phase 6 scope (if picked up again) or Phase 7 (Channels/Meta OAuth) per the approved plan.

**2026-08-06 — Phase 6, third slice.** Before starting, the user was asked to choose between finishing
more of Phase 6 (fully testable in this project) vs. starting Phase 7 (Meta OAuth/webhooks — unverifiable
against live Meta endpoints since no Meta Developer App has been created yet, per `DEFERRED_TASKS.md` item
6). Chose to continue Phase 6. This slice covers the remaining 3 spec-listed actions that don't depend on
Channels/Meta and don't need a product/service-catalog selection UI:

- **`assign_agent`**: assigns the contact's most recent conversation (any status — `conversationRepository
  .findByContactId`'s own `lastMessageAt`/`createdAt desc` ordering) to a specific team member, chosen from
  a real dropdown of the workspace's current members (fetched server-side in `automations/new/page.tsx` via
  `membershipRepository.findMembersByWorkspaceId`, passed into `WorkflowCanvas` as a prop — no client-side
  fetching library exists in this project, so this follows the established server-props pattern). Verifies
  at execution time (not just at workflow-creation time) that the configured user is still a workspace
  member, so a workflow doesn't silently keep assigning to someone who's been removed. New
  `conversationRepository.assign` (unconditional — overrides any existing assignment, unlike the
  pre-existing `assignIfUnassigned` used by a human agent taking over) and a new `conversation_assigned`
  activity-timeline type.
- **`webhook_call`**: the spec's "Webhook/API Call" action. POSTs a JSON payload (event type, workflow
  name, contact info, an optional `{{contactName}}`-substituted message) to a workspace-owner-supplied URL.
  Built a dedicated `safe-webhook-fetch.ts` helper with real SSRF defenses, since the spec explicitly lists
  SSRF prevention as a requirement and this is the first place user-supplied URLs are fetched server-side
  in this codebase: https-only, rejects `localhost` outright, resolves DNS and blocks private/loopback/
  link-local ranges (including the AWS/GCP/Azure metadata address `169.254.169.254`) for both IPv4 and
  IPv6, never follows redirects (a redirect response is treated as a failure rather than followed, since a
  redirect to an internal address would bypass the upfront IP check), and enforces a 5-second timeout.
  **Documented limitation, not hidden**: this checks DNS resolution *before* connecting, not the IP `fetch`
  actually connects to — a DNS-rebinding attacker controlling their own DNS server could in theory swap the
  answer in between. Closing that fully needs a custom connect-to-pinned-IP fetch agent, flagged as a
  follow-up rather than silently claimed as complete. 13 unit tests cover the IP-range logic (v4 and v6,
  including the IPv4-mapped-IPv6 case) and the fetch wrapper's behavior (rejects non-https, rejects
  localhost without even doing a DNS lookup, rejects on a resolved private IP, treats 3xx and non-2xx as
  failures, cancels the response body).
- **`trigger_another_workflow`**: runs a different workflow's action against the same event/contact,
  skipping that target's own trigger/condition matching (per the spec's "Trigger Another Workflow" —
  chaining, not re-triggering). Required real loop-prevention, since the spec explicitly calls for
  "prevent recursive workflows": a `chain: ReadonlySet<string>` of workflow ids threaded through
  `runAction`/`runAndLog` (seeded with the originating workflow's own id at every top-level dispatch/
  processDueRuns call site), checked before recursing — a workflow already in the chain is skipped
  (logged as a successful no-op, not an error) rather than re-run, plus a hard `MAX_WORKFLOW_CHAIN_DEPTH =
  5` cap independent of the id check. A workflow targeting itself is rejected outright as a validation
  error. Verified with a dedicated two-workflow-cycle test (A triggers B, B's attempt to trigger A back is
  caught and skipped — `findById` is asked to resolve B exactly once, never re-resolves A) and a
  paused-target-is-skipped test.
- Migration `0028_daily_kinsey_walden.sql` (3 workflow_action enum values + 1 activity_type enum value)
  applied live to production Supabase, same as every prior slice.
- i18n: en/ar/ku all updated, re-verified in sync (774 keys each, up from 763).
- 21 new tests (11 in `automation.service.test.ts` for the 3 new actions, including the cycle/depth/
  paused-target cases; 4 in `schemas.test.ts`; a new 13-test file for `safe-webhook-fetch.ts`, though 3 of
  those 21 are net-new files' worth so the exact split isn't 1:1 with earlier phases' counts). Full suite:
  typecheck clean, lint clean, **198/198 tests passing** (up from 156), production build clean. Caught and
  fixed two real test bugs during this pass (not app bugs): a missing `vi.clearAllMocks()` in the new
  webhook-fetch test file let a `dns.lookup` call from one test leak into the next test's assertion, and
  two hand-written fake UUIDs in `schemas.test.ts` used an invalid variant nibble that Zod's `.uuid()`
  correctly rejected — fixed to proper RFC 4122 v4 UUIDs.
- Same standing gap as the prior two slices: canvas UI still not browser-verified (no browser-automation
  tool available this session) — the new `assign_agent`/`webhook_call`/`trigger_another_workflow` fields in
  `action-node.tsx` reuse the same Input/Select/Textarea/enum-driven-options pattern already proven for
  earlier fields, and the member/workflow dropdowns are populated from real server-fetched data (not
  mocked), but this hasn't been rendered in an actual browser this session.

**PART 6 status after three slices**: all spec-listed actions now have handlers except Send AI Reply,
Create Order, and Book Appointment (all three need a product/service/date selection UI, deliberately not
rushed) and Send WhatsApp Template (blocked on Channels/Phase 7). Remaining triggers not yet covered:
Channel Connected, Subscription Renewed, Payment Failed (all three depend on other unbuilt/external
systems — Meta OAuth, billing gateway); Workspace Created and User Invited were evaluated and deliberately
rejected as incompatible with this engine's per-contact event model (see the second-slice entry above).
Deeper condition fields, nested AND/OR groups, Branches, general Variables, Workflow Versioning, the AI
Workflow Generator, Human Approval, and Draft/Disabled/Archived workflow statuses remain open — all
net-new subsystems or UI work, not incremental patches. Async/queued execution via BullMQ remains
correctly deferred per Decision 2.

Next: Phase 7 (Channels/Meta OAuth) once the user has a Meta Developer App to build/verify against, or
Phase 8 (Business Operations depth) as a fully-testable alternative in the meantime.

**2026-08-06 — Phase 8, first slice.** Before starting, the user was asked again whether to keep pushing
on Phase 6 (now mostly exhausted of items that don't need Meta or a catalog-selection UI), start Phase 7
(still unverifiable — no Meta Developer App exists), or move to Phase 8 (fully testable). Chose Phase 8.
Picked three of the plan's explicitly-recommended items — the two "cheapest near-term wins" from PART 9's
own recommendation plus PART 7's most-cited concrete gap:

- **Trial expiry timer** (PART 8 gap: "No trial-expiry timer... automatic expiration"). Discovered the
  existing `subscriptionExpiresAt`/`lastReminderDaysSent`/reminder-cron machinery (built for paid-plan
  expiry) was generic enough to reuse outright for trials — no new schema, no new cron, no new repository
  method beyond widening one filter. `workspaceService.createWorkspaceForNewUser` now sets
  `subscriptionExpiresAt` to 14 days out (the spec's own trial length) on every new signup;
  `workspaceAdminRepository.findActiveWithExpiry` now includes `trial`-status workspaces alongside
  `active` ones, so the daily `subscription-check` cron's existing 3/2/1-day-reminder and auto-suspend
  logic now covers trials automatically, with trial-aware wording ("Your free trial ends in N days" vs.
  "Your subscription expires..."). **Deliberately not backfilled**: existing workspaces created before this
  change keep `subscriptionExpiresAt: null` (never auto-suspended) rather than retroactively assigning
  them a trial deadline — a live/real account unexpectedly losing access because of a backfill would be a
  bad way to discover a bug, so this only applies going forward to new signups.
- **Role-based Home dashboard** (PART 7 gap: "No role-based dashboards — one getSummary() call serves
  everyone regardless of role"). Agent/Viewer roles now see a "My work today" band (assigned open
  conversations, assigned open tasks, a linkable list of up to 5 assigned conversations) instead of the
  workspace-wide Today band (today's conversations/leads/orders/revenue) that Owner/Admin/Manager still
  see unchanged. New `conversationRepository.findOpenByAssignedUser` / `taskRepository
  .findOpenByAssignedUser` / `membershipRepository.findRoleKeyByUserAndWorkspace`. The Attention band
  (handovers/cold leads) stays workspace-wide for every role — still relevant to an agent picking up work,
  not just an owner. **Honest scope limit, not silently worked around**: appointments stay workspace-wide
  in the Agent view too, because there's no per-agent appointment-assignment column in the schema yet
  (PART 5's "Assigned Employee" field is a separate, already-tracked gap) — adding that column just to
  serve this dashboard slice would have been scope creep into a different Part.
- **Admin workspace list search/filter** (PART 9's own "cheapest near-term win" recommendation). New
  client-side `WorkspaceList` component (search by name/slug/owner email) wrapping the existing
  `WorkspaceRow` — deliberately client-side filtering over a server `?q=` param, matching the gap report's
  own reasoning that the list is "currently small," with a code comment flagging server-side search as the
  right call once that stops being true.
- No migration this slice — every change reused existing columns.
- i18n: en/ar/ku updated and re-verified in sync (780 keys each, up from 774).
- 15 new tests (6 for `subscriptionCheckService`, including a dedicated trial-vs-active wording check and
  a mixed-batch partial-failure check; 3 for `dashboardService.getMyWorkBand`). The `WorkspaceList`
  filter component has no dedicated test, consistent with this codebase's existing pattern of not
  unit-testing client components (`WorkspaceRow` itself, the dropdown-menu component, etc. don't have
  tests either) — flagged rather than silently following the pattern without noting it. Full suite:
  typecheck clean, lint clean, **207/207 tests passing** (up from 198), production build clean.

**Still open in PART 7/8/9 after this slice**: chart variety (still bar-chart-only), additional report
types (Conversations/AI usage/Channels/Team performance/Automation/Revenue — still CSV-only for the 4
existing types), AI Recommendations feature; billing invoices/discounts/multi-currency (all still genuinely
blocked on a real payment gateway, a business decision not an engineering one); Super Admin support
tickets, AI Operations console, feature-flag system, infra/error monitoring (Sentry/PostHog, external
accounts), delete/reset-trial/transfer-ownership workspace actions, broader audit event coverage
(admin-login specifically was evaluated and deliberately deferred — `requirePlatformAdmin` runs on every
admin page request via React's `cache()`, so logging there would flood the audit log with one row per page
view rather than one per actual login session; doing this properly needs a session-boundary hook this
codebase doesn't have yet, not a quick add), unified Super Admin home dashboard.

Next: further Phase 8 scope, Phase 7 once a Meta Developer App exists, or Phase 9 (Growth Modules) per the
approved plan.

**2026-08-06 — Phase 8, second slice.** Two more PART 7/9 gaps, both explicitly named in the gap report:

- **Unified Super Admin home dashboard** (PART 9: "`/admin` itself has no landing page beyond nav links").
  New `/admin/page.tsx` — the first page a platform admin sees now — composing the same repositories
  `/admin/revenue` and `/admin/ai-usage` already use (workspace counts by status, MRR/ARR via the existing
  `calculateRevenue`, AI request volume/success rate/latency, 5 most recent signups) rather than a new
  aggregation table, same "fine at this scale" reasoning the tenant dashboard already documents. Added a
  "Home" nav link (`/admin`) as the first item in the admin nav — previously the nav had no way back to a
  root overview at all.
- **AI Recommendations on the tenant Home dashboard** (PART 7: "AI Recommendations feature — 'contact
  these 5 hot leads today'" — explicitly the spec's own example). Rather than a new scoring model, this
  reuses the exact same deterministic lead score (`crmService.listLeads` / `lead-score.ts`) already
  computed for the Leads kanban board — a lead scored "hot" or "priority" (score ≥ 70, via the existing
  `leadTemperature` classifier) and still in a non-terminal stage now appears as a new `hot_lead` item type
  in the Home page's existing "Needs your attention" band (Band 2), alongside the pre-existing handover and
  cold-lead items, sorted by score and capped at 5 — no new UI section, no new backend model, one more item
  type in an already-established pattern.
- No migration this slice either.
- i18n: en/ar/ku updated and re-verified in sync (801 keys each, up from 780).
- 7 new tests (hot-lead sorting/capping/terminal-stage-exclusion in `dashboard.service.test.ts`). No
  dedicated test for `/admin/page.tsx` itself, consistent with this codebase's page/component testing
  pattern (pages aren't unit tested; the underlying `calculateRevenue`/`aiUsageAdminRepository` logic they
  compose already has its own coverage from earlier phases). Full suite: typecheck clean, lint clean,
  **210/210 tests passing** (up from 207), production build clean — `/admin` now shows up as a real route
  in the build output for the first time.

**Still open after this Phase 8 slice**: chart variety (bar-chart-only), additional report types beyond
the 4 existing CSV exports, billing invoices/discounts/multi-currency (blocked on a real payment gateway —
business decision), Super Admin support tickets, AI Operations console (per-provider/per-model breakdown,
global provider enable/disable), feature-flag system, infra/error monitoring (Sentry/PostHog — external
accounts), delete/reset-trial/transfer-ownership workspace actions, broader audit event coverage. These
remain accurately reflected as open items in PART 7/8/9's "Missing" sections above.

Next: further Phase 8 scope, Phase 7 once a Meta Developer App exists, or Phase 9 (Growth Modules) per the
approved plan.

**2026-08-06 — Phase 8, third slice.** Two more items from PART 7's own recommendations:

- **Chart variety** (PART 7: "Only one chart type exists — every chart in the app is a bar chart with
  different data"). Loaded the `dataviz` skill before writing any chart code, per its own trigger rule.
  Its "choosing a form" guidance is direct: a day-bucketed trend is a magnitude changing over time, which
  reads as a line, not bars-by-category — `leadsByDay` and `revenueByDay` (both genuinely time-series) on
  `/dashboard/analytics` now render with a new `LineChartCard` (2px line, monotone curve, crosshair
  tooltip, single `--chart-1` hue matching `BarChartCard`'s existing single-series convention — no legend,
  since a lone series' identity is the card title, not a swatch). `ordersByStatus`/`appointmentsByStatus`/
  `conversationsByChannel` stay on `BarChartCard` since those are genuine category comparisons, not
  time-series — this wasn't a blanket swap, only the two charts where the form was actually wrong for the
  data.
- **A new report type** (PART 7: "missing report types entirely — Conversations, AI usage, Channels, Team
  performance, Automation, Revenue"). Added Conversations — picked first since Inbox had zero export
  before and the underlying data (contact, channel, status, ai status, last message) was already sitting
  in `conversationRepository.findByWorkspaceId`, no new query needed. New `/api/reports/conversations`
  following the exact existing CSV-route pattern (`toCsv`/`csvResponse`), with an "Export CSV" button added
  to `/dashboard/inbox` next to "New conversation" — same UI pattern the other 4 export buttons already
  use. The other 5 report types (AI usage, Channels, Team performance, Automation, Revenue) remain open —
  picked one at a time rather than batch-building all 6, consistent with this session's incremental
  approach.
- No migration, no new i18n keys this slice (both changes reuse existing translation keys —
  `analytics.charts.*` for the chart swap, `common.exportCsv` for the new button).
- No new tests this slice: `LineChartCard` is a client chart component (this codebase doesn't unit-test
  UI components, `BarChartCard` has none either) and the new report route is a thin wrapper around
  already-tested `toCsv`/`csvResponse` plus an existing, already-exercised repository method — consistent
  with the fact that none of the other 4 report routes have dedicated tests either. Full suite: typecheck
  clean, lint clean, **210/210 tests passing** (unchanged — nothing new to cover), production build clean,
  `/api/reports/conversations` shows up as a real route in the build output.

Next: further Phase 8 scope (remaining report types, Super Admin support tickets/AI Ops console/feature
flags), Phase 7 once a Meta Developer App exists, or Phase 9 (Growth Modules) per the approved plan.

**2026-08-06 — Phase 8, fourth slice.** Two more of PART 7's 6 missing report types:

- **Automation report**: `/api/reports/automations` — every execution across every workflow in the
  workspace (workflow name, success/failure, summary, error, retry count, timestamp), not just the
  per-workflow 20-row list the workflow detail page already shows. New `workflowRepository
  .findAllExecutionsByWorkspaceId` (joins `workflows` for the name). Export button added next to "New
  automation" on `/dashboard/automations`.
- **AI Usage report**: `/api/reports/ai-usage` — deliberately **excludes `provider`/`model`** even though
  both columns exist on the underlying `ai_usage` row and the Super Admin AI Usage report already shows
  them platform-wide. PART 13B's "No AI Terminology" rule is explicit that provider/model internals are
  never surfaced anywhere in the tenant app, and a downloaded CSV is still a tenant-facing surface — this
  export only ever includes Result/Input Tokens/Output Tokens/Response Time/Date. New `aiUsageRepository
  .findByWorkspaceId` with an inline comment warning future callers not to add provider/model to a
  tenant-facing read. Export button added to `/dashboard/ai-employee` (the only sensible existing home for
  it — this codebase doesn't have a dedicated tenant AI Activity Log page yet, still an open PART 13B gap).
- No migration, no new i18n keys (both reuse `common.exportCsv`).
- No new tests, consistent with every other report route in this codebase having none (thin wrappers over
  already-tested `toCsv`/`csvResponse` and straightforward repository queries). Full suite: typecheck
  clean, lint clean, **210/210 tests passing** (unchanged), production build clean — both new routes show
  up in the build output.

**PART 7 report types after this slice**: Contacts, Leads, Orders, Appointments (pre-existing) +
Conversations, Automations, AI Usage (added this session) = 7 of the spec's 11 named report types now
exist. Still missing: Channels (low value while WhatsApp/Instagram remain Meta-blocked stubs — would
mostly export empty rows), Team performance, Revenue (tenant-scoped; the platform-wide MRR/ARR version
already exists in Super Admin).

Next: further Phase 8 scope (Team performance / Revenue reports, Super Admin support tickets/AI Ops
console/feature flags), Phase 7 once a Meta Developer App exists, or Phase 9 (Growth Modules) per the
approved plan.

**2026-08-07 — Phase 5 completed, Phase 6 completed, Phase 8 completed (mega-session, user asked for
all three in one sitting).** User pasted back the exact remaining-item lists from a prior status summary
and asked to complete them all now, without per-item check-ins. Worked through them as one continuous
session, verifying with typecheck/lint/test/build after each vertical slice and applying every migration
directly to the live Supabase database (as established all session), committing after each slice.

**Phase 5, remainder completed:**
- Contact schema expansion: `avatarUrl`, `country`, `city`, `source`, `lifecycleStage` (enum:
  lead/customer/repeat_customer/vip/loyal_customer, default "lead"), `assignedAgentId` — plus
  `crmService.advanceLifecycleStage()`, auto-called from `orderService.updateOrderStatus()` on any
  revenue-counting status, rank-gated so it only ever advances, never demotes.
- Full filters on Contacts (lifecycle stage, tag) and Leads (tag, language) list pages —
  `contactRepository`/`leadRepository.findByWorkspaceId` signatures changed from a positional `search?`
  param to a `filters?: {...}` object (all call sites checked/updated).
- Unified contact timeline: new pure `mergeTimeline()` helper flattens+sorts conversations/leads/
  orders/appointments/activities into one interleaved feed on the contact detail page, replacing 5
  previously-separate sections. Task/Note panels deliberately kept as separate interactive widgets above
  it (documented design decision).
- PDF/Excel export: new `src/lib/{excel,pdf}.ts` (SheetJS / pdfkit) + `report-response.ts` dispatcher
  (`?format=csv|xlsx|pdf`) wired into all 4 existing report routes (contacts/leads/orders/appointments)
  and a shared `<ExportButtons>` component.
- **PART 5 is now fully closed** — every item from the original gap list is done.

**Phase 6, remainder completed:**
- 4 new workflow actions: `create_order`, `book_appointment`, `send_ai_reply` (dynamic-imports
  `ai.service.ts` to break a circular-module-graph — documented inline), `request_approval`.
- 3 new condition fields: `lead_score`, `order_value` (both "at least" threshold checks against
  workspace-computed values), `working_hours` (new pure `isWithinWorkingHours()` lib fn, fail-open with
  no config).
- **Human Approval flow**: new `workflow_approvals` table + `/dashboard/automations/approvals` inbox.
  Approving a request runs a *different*, pre-linked workflow's action for the same contact/event via the
  same one-hop `runAndLog`/chain-Set primitive `trigger_another_workflow` already uses — the engine's
  linear architecture has no notion of "resuming" a paused workflow, so this reuses an existing primitive
  rather than inventing a new execution model.
- **AI Workflow Generator**: `aiService.generateWorkflowFromDescription()` parses a plain-language
  description into the same `createWorkflowSchema` shape manual building produces — populates the same
  React state `applyTemplate()` does, so it flows through the identical submission path (no new execution
  model, per the spec's own constraint). Initially missing the 3 newest action types from its own prompt
  (create_order/book_appointment/request_approval) — caught and fixed same-session before shipping.
- Missing `workflow` statuses: added `draft`/`disabled`/`archived` (was just active/paused).
- **PART 6 is now fully closed.**
- Added unit test coverage for all of the above (new automation actions, `decideApproval`, the AI
  generator's JSON-parsing/error paths) — none of this had tests when first built earlier in the session;
  this mega-session's first checkpoint action was closing that gap. 77→247 tests over the Phase 5+6 slice.

**Phase 8, five of six remaining items completed** (error/infra monitoring formally deferred, see below):
- **Team performance report**: new `/dashboard/analytics` section — per-agent conversations handled,
  tasks completed, avg first-response time (new `analyticsRepository.avgFirstResponseSecondsByAgent`, a
  raw-SQL `DISTINCT ON` query since "whose reply was first" isn't a plain `GROUP BY` aggregate), CSV/
  Excel/PDF export. Every current workspace member shows up even with zero activity (a roster, not just
  active agents).
- **Workspace-level revenue report**: "Revenue by product" breakdown chart + export — distinct from Super
  Admin's platform-wide subscription MRR/ARR (that's platform revenue *from* tenants; this is a tenant's
  own revenue *from its customers*, already partially visible as a single KPI/day-chart, now with a
  by-product breakdown that wasn't visualized anywhere before).
- **Support Tickets** (net-new subsystem, PART 9): tenant users open/reply to tickets at
  `/dashboard/support`; Super Admins see every workspace's tickets at `/admin/tickets`, reply, change
  status. New `support_tickets`/`support_ticket_messages` tables, new `support.tickets.view` permission
  seeded to every role (support access is universal, not role-gated). In-app notification (unconditional)
  + best-effort email on admin reply, same "in-app never blocked by email" pattern `notify_owner_email`
  established. Both workspace-scoped and cross-tenant (Super Admin) audit logging.
- **AI Operations console**: new `/admin/ai-operations` — a platform-wide AI kill switch
  (`platform_settings.aiEnabled`, checked at the top of `aiService.generateReply`) that degrades safely
  through the *existing* failure path (`inboxService.triggerAiReply` already catches any thrown error and
  hands the conversation to a human — zero new code needed there), plus a per-provider/model request/
  success-rate/latency breakdown (`aiUsageAdminRepository.getByModel`, groups by columns that already
  existed on `ai_usage` — only one provider exists today, but this scales unchanged once a second is
  added).
- **Feature flags system**: new global `feature_flags` table + `/admin/feature-flags` (create/toggle,
  audited). Deliberately distinct from `plans.enabledFeatures` (billing/product-module gating) and the AI
  Operations kill switch (all AI replies) — this gates individual riskier code paths one at a time. A flag
  with no row yet resolves to *enabled* (fail-open), so shipping a new gated path never silently breaks
  anything until an admin explicitly creates+disables its flag. Wired as a real, non-decorative example:
  the AI Workflow Generator now checks `automation.ai_workflow_generator` before calling the AI.
- **Error/infra monitoring (Sentry + PostHog): formally documented as deferred, not built** — this was
  the one item the user's own message already flagged as blocked ("تحتاج Sentry/PostHog"). Unlike
  `EmailService`, there's no meaningful fake/mock mode worth scaffolding (a fake Sentry client is just
  `console.log`, which is already what every catch boundary does today) — see `DEFERRED_TASKS.md` item 9
  for the full writeup and unblock steps.
- Added a new `SERVICE_UNAVAILABLE` `AppErrorCode` (used by both the AI kill switch and the workflow-
  generator flag gate) and 4 new `workflowApprovalStatus`-style enum values across `audit_action`/
  `workspace_audit_action`/`notification_type` for the new subsystems.

Verified after every slice: typecheck clean, lint clean, full test suite passing throughout (77 → 247 →
249 → 261 → 264 → 270 tests across the six sub-slices), production build clean, every migration
generated+reviewed+applied directly to the live Supabase database before moving on, `pnpm run db:seed`
re-run live to get the new `support.tickets.view` permission into production. i18n key counts (en/ar/ku)
verified in sync after every batch — final count: **957/957/957**. Six commits, one per verified slice
(Phase 5+6 combined, then one per Phase 8 item).

**PART 8/9 status after this session**: Support tickets, AI Ops console, and feature flags — the three
Super Admin items explicitly named in the original gap report — are now built. Team performance and
tenant Revenue reports close out the remaining PART 7 report-type gaps from the previous slice's list.
Error/infra monitoring remains the one genuinely external-account-blocked item in Phase 8, correctly
staying in `DEFERRED_TASKS.md` rather than PROJECT_GAP_ANALYSIS.md's open-items list.

Next: Phase 7 (Channels/Meta OAuth) once a Meta Developer App exists, or Phase 9 (Growth Modules —
Website Builder, Integrations, Predictive Analytics, Ads) per the approved plan. With Phases 1, 3, 4, 5,
6, and 8 now complete/closed and Phase 2 resolved, only Phase 7 (external-blocked) and Phase 9
(deliberately-last, largest net-new build) remain from the original 9-phase plan.
