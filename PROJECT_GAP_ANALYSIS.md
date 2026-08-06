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

**Status: Partial**

**Implemented:**
- Pipeline: `leads.stage` enum matches the spec's exact 10 stages; kanban board at `lead-board.tsx`.
- Lead creation converges to one path whether AI- or human-initiated (`crmService.createLeadFromConversation`), matching spec intent that manual creation is the exception.
- **Lead scoring is real and deterministic** (`src/features/crm/lib/lead-score.ts:39-63`) — computed live from message count, orders/appointments, VIP tag, stage, staleness; used in the board and contact detail page.
- Automation events are genuinely dispatched from CRM/orders/appointments/inbox services — `lead_created`, `lead_stage_changed`, `order_created`, `order_status_changed`, `appointment_created`, `appointment_status_changed`, `conversation_handed_over` — all real, all consumed by the automation dispatcher.
- Activity log writes are consistent across order/appointment/lead/note/task services, not just schema.
- Orders: 9-status enum matches spec exactly, with a real `order_items` table.
- CSV export works for leads/contacts/orders/appointments.

**Missing:**
- **Contacts schema is a stripped-down subset** — missing Avatar, Country, City, Timezone, Birthday, Gender, CustomerType, Source, Status, AssignedAgent, ConversationCount, OrderCount, AppointmentCount, LifetimeValue, PreferredProducts, CommunicationPreferences.
- No lifecycle field or auto-advance beyond `leads.stage` — "Customer"/"Repeat"/"VIP"/"Loyal" post-order stages from the spec's customer lifecycle have no representation.
- **No filter UI anywhere** — Contacts/Leads pages are unfiltered flat lists (leads only grouped by pipeline stage).
- Products/Services schemas lack categories, variants, images, discount, stock, AI-visibility flag, availability windows.
- No real tags entity — `contacts.tags` is an ad-hoc `jsonb` string array.
- **No AI-in-CRM beyond tagging/lead-creation/tool calls** — zero sentiment analysis, churn detection, purchase-probability prediction, or AI-suggested tasks.
- **No CRM follow-up cron** — no "inactive 7 days," "appointment tomorrow," "pending quotation" reminder job exists (only automation-delays and subscription-check crons exist).
- Export is CSV-only, no PDF/Excel.

**Incorrect:**
- "Customer Timeline" is fragmented into separate per-section lists on the contact detail page (Tasks, Notes, Appointments, Orders, Leads, Conversations each in their own block), not one interleaved chronological feed — only the raw Activity section itself is chronological.
- Lead score is **never persisted** — recomputed on every render, so it can't be filtered/sorted at the DB level.

**Recommended Engineering Solution:**
- Add a `contacts.lifecycleStage` enum with a service hook auto-advancing it on order completion/repeat-order thresholds.
- Extend `contacts` schema with the highest-value missing fields (avatar, country, source, assignedAgent, materialized counters) updated alongside existing `activityRepository.log` calls.
- Add filter query params + repository-level `WHERE` clauses to the Contacts/Leads list pages.
- Build a `crm-followups` cron reusing the existing cron pattern.
- Merge the contact-detail page's sections into one interleaved feed, reusing the merge/sort pattern already proven in `dashboard.service.ts:63-93`.
- Add PDF/Excel export alongside the existing `src/lib/csv.ts` helpers.

---

## PART 6 — Automation Engine & Workflow Platform (+ Extensions)

**Status: Partial** — a real, tested, minimal linear engine exists; most of what the spec lists beyond that is missing.

**Implemented:**
- 7 real triggers wired to real events (lead/order/appointment/conversation changes) firing from the actual CRM/orders/appointments/inbox services.
- Conditions: flat AND/OR on `tag`/`language` fields — real, but narrow.
- 3 real actions with real handlers: `add_contact_tag`, `remove_contact_tag`, `notify_owner_email` (real Resend email + in-app notification, with `{{contactName}}` variable substitution).
- Delay: day-granularity, backed by a durable Postgres row (`workflowPendingRuns`) drained by a daily cron — genuinely restart-safe.
- Every run (immediate or delayed) writes a real `workflowExecutions` row; errors never propagate to the triggering request.
- Visual canvas (`@xyflow/react`) is real UI, but **deliberately fixed at exactly 3 static nodes** — a linear editor, not a graph/branching editor (self-documented in code comments).

**Missing:**
- **12 of 15 spec actions have no handler at all**: Send AI Reply, Assign Agent, Create Lead, Create Order, Book Appointment, Update Contact, Create Task, Create Note, Send WhatsApp Template, Archive/Close Conversation, Trigger Another Workflow, Webhook/API Call.
- **14 of 21 spec triggers missing** (Message Received/Replied, Lead Won/Lost, Order Paid/Delivered, Tag Added, Customer VIP, AI Failed, Channel Connected, Workspace Created, Subscription Renewed, Payment Failed, User Invited).
- Condition fields beyond tag/language (Lead Score, Order Value, Working Hours, Sentiment, AI Confidence, etc.), nested AND/OR groups, Branches, general Variables, Workflow Versioning — all absent.
- **AI Workflow Generator: no code anywhere.**
- **Human Approval extension: no code anywhere.**
- Multi-Channel Dispatch: only Email is real; WhatsApp/SMS actions don't exist (blocked on Meta OAuth, same as PART 3).
- No BullMQ/Redis job queue — `bullmq` isn't a dependency at all.
- Workflow status enum only has `active`/`paused` — no Draft/Disabled/Archived.
- No AI-generated-workflow / delay-timer / approval events logged to the platform Audit Log (only to `workflowExecutions`, a separate table).

**Incorrect (real deviations):**
- **Execution is synchronous and inline**, not async/queued — `automationService.dispatch()` is awaited inside the same server action handling the user's original CRM/order/appointment request, adding latency (never breaks the request, since errors are swallowed, but it's architecturally not what the spec requires).
- No retry-count column and no actual retry logic exists despite the spec's explicit retry requirement.
- **Security gap: no permission enforcement on workflow CRUD at all** — `permissionService` is never imported by the automation feature; any authenticated workspace member (including Viewer/Agent) can create, edit, or delete workflows. The spec requires Owner/Admin/Manager/Read-only tiers.

**Recommended Engineering Solution:**
- **Fix the permission gap first — it's a real, cheap security fix**, not a feature build: add `permissionService` checks to the three workflow actions.
- Keep cron-based delays pre-launch (genuinely restart-safe); introduce BullMQ only if sub-day granularity or true async dispatch becomes a real requirement.
- Add a `retryCount`/`maxRetries` column and retry loop before marking an action failed.
- Expand actions/triggers incrementally, prioritizing ones with existing service-layer equivalents (Create Task, Update Contact now; Send WhatsApp once Meta OAuth lands).
- Treat AI Generator and Human Approval as net-new features to schedule, not gaps to patch onto existing code.

---

## PART 7 — Dashboard, Analytics & Business Intelligence

**Status: Partial**

**Implemented:**
- AI Insights are real, not canned — pulls live dashboard numbers, sends to the actual AI provider, caches per-workspace for 24h with fallback to last-good cache.
- **Business Health Score is genuinely computed** — averages lead-conversion/order-completion/appointment-completion/AI-success rates, correctly returns `null` (not a fake 0) when there's no data.
- Real KPIs + 5 charts backed by real repository queries.
- 4 real CSV report endpoints (contacts/leads/orders/appointments), feature-gated.

**Missing:**
- **No role-based dashboards** — one `getSummary()` call serves everyone regardless of role; no Owner-vs-Agent branching.
- **Only one chart type exists** (`bar-chart-card.tsx`) — every chart in the app is a bar chart with different data, not the varied set (funnels, trends, breakdowns) the spec implies.
- Reports are CSV-only; missing report types entirely (Conversations, AI usage, Channels, Team performance, Automation, Revenue).
- No AI Recommendations feature ("contact these 5 hot leads today").

**Recommended Engineering Solution:**
- Branch the dashboard service by role (Agent → assigned conversations/tasks only).
- Add a line/pie chart component alongside the existing bar chart.
- Add `xlsx` (SheetJS) for Excel and a lightweight PDF renderer, reusing existing report queries.

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

**Status: Partial — the largest raw gap area outside Group 8**

**Implemented:**
- Fully separate auth (`requirePlatformAdmin`/`requirePrimaryPlatformAdmin`), independent of tenant RBAC.
- Real workspace management: activate plan, change status (suspend/restore), **read-only impersonation** restricted to bootstrap admins, every view logged to `audit_logs`, zero write path — confirmed by reading the page, no mutation actions present.
- Audit log with a real typed action enum, snapshots actor email so it survives admin deletion.

**Missing:**
- No search/filter on the workspace list, no delete, no reset-trial/reset-limits, no transfer-ownership.
- **No support tickets system at all.**
- **No AI Operations console** — only aggregate + per-workspace totals, no per-provider/per-model breakdown, no global provider enable/disable.
- **No feature-flag system** — plan `enabledFeatures` is billing-tied, not a general flag system (platform-wide/beta/per-workspace).
- **No system/error/infra health monitoring** — Sentry/PostHog confirmed absent.
- Audit event coverage is narrower than spec: missing admin-login, refund-issued, role-updated, AI-provider-changed, support-access events.
- No unified Super Admin home dashboard — KPIs are split across separate `/admin/revenue` and `/admin/ai-usage` pages; `/admin` itself has no landing page beyond nav links.

**Recommended Engineering Solution:**
- Cheapest near-term wins: client-side search/filter on the (currently small) workspace list, plus an admin-login audit event.
- Support tickets, AI Ops console, feature flags, and infra monitoring are all net-new subsystems with no partial scaffolding — sequence by actual business urgency, don't build speculatively.

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
