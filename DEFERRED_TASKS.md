# Deferred Tasks

Things that are built (or stubbed) in code but can't actually go live until someone
gets an external account, verification, or approval. This file is updated automatically
every time a new item like this comes up — don't let it go stale.

## Blocked right now — code is ready, waiting on an external account/credential

### 1. Claude (Anthropic) API key
- **What's built:** Full AI provider layer (`AIProvider`/`AIRouter`/`ClaudeProvider`/prompt builder) + a "Test your AI employee" chat screen in the dashboard + the real Inbox (`src/features/inbox`), which calls the same `aiService.generateReply` to auto-reply inside conversations. As of 2026-08-06 this also includes a full **AI Action Engine** (Part 4 of the spec): `src/features/ai/tools` — `create_lead`, `add_tag`, `update_contact_info`, `book_appointment`, `create_order`, `request_human_handover`. The Claude provider runs a bounded tool-use loop (`MAX_TOOL_ITERATIONS = 4` in `claude.provider.ts`); every tool call is validated (Zod), scoped to the calling workspace/contact/conversation (never AI-supplied IDs), and audit-logged to the new `ai_tool_executions` table via a single dispatcher (`src/features/ai/tools/registry.ts`). `book_appointment`/`create_order` match against the real service/product catalog and refuse to invent a price for anything unmatched. This only activates inside real conversations (`inboxService.triggerAiReply` passes `{contactId, conversationId}`) — the test chat screen stays reply-only since there's no real contact for a test tool call to touch.
- **Blocked on:** A real `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com) — still not set in `.env.local` as of 2026-08-06 (the user hasn't bought it yet, despite the 2026-08-05 estimate of "tomorrow").
- **To unblock:** Add the key to `.env.local` (local) and to the Vercel project's Environment Variables (production), then redeploy.
- **Status:** Until then, `inboxService.triggerAiReply` catches the provider's `AppError` gracefully — the customer message still saves, a system note ("AI employee couldn't generate a reply") gets logged, and the conversation flips to `handed_over` instead of crashing. So the Inbox (and now the Action Engine) is fully built and testable end-to-end except for the actual model call — once the key is added, leads/orders/appointments/tags/handovers created *during a live conversation* by the AI itself should be verified for real, since that path has only been unit-tested against mocks so far, not run against the real Claude tool-use API.

### 2. Real email delivery (Resend)
- **What's built:** `EmailService` abstraction with a Resend provider already wired in (`src/lib/email/resend-email-provider.ts`); falls back to a console-log mock provider when no key is set. Now also used for subscription expiry reminders (item 6) and Automation's `notify_owner_email` action, not just OTP.
- **Blocked on:** Resend account is in **sandbox mode** — no verified sending domain yet. Emails can only be delivered to the account's own signup address (`ssaadbbbb@gmail.com`); any other recipient fails with `validation_error`.
- **To unblock:** Verify a custom domain in Resend, then update `EMAIL_FROM` (currently `onboarding@resend.dev`) to an address on that domain.
- **Status:** Works for the developer's own test account only. Not usable for real end users yet — this now also means the "3/2/1 days left" subscription reminder emails (item 6) won't reach real customers until this is fixed, even though the logic that sends them is fully built and tested.

### 3. Redis session cache (Upstash)
- **What's built:** `src/lib/redis/session-cache.ts` caches sessions in Redis in front of Postgres, with a clean fallback — if `REDIS_URL` isn't set, it's skipped entirely (no doomed connection attempts; this was a real bug fixed on 2026-08-05).
- **Blocked on:** No Upstash Redis instance provisioned yet.
- **To unblock:** Create an Upstash Redis database, set `REDIS_URL` in `.env.local` and Vercel.
- **Status:** App works correctly without it (every session lookup just hits Postgres directly) — this is a performance optimization, not a blocker for anything else.

### 4. Platform Admin access in production — RESOLVED 2026-08-05
- **What's built:** A Super Admin Platform first slice, gated by `requirePlatformAdmin()` — two layers: `PLATFORM_ADMIN_EMAILS` env var (recovery/bootstrap, never locked out by DB state) plus a `platform_admins` DB table any current admin can add/remove emails from. Pages: `/admin/settings` (WhatsApp number/message), `/admin/admins`, `/admin/plans` (build packages — pick which of Inbox/Contacts/Leads/Orders/Appointments/Automations/Knowledge Base a plan includes, monthly or yearly, default duration), and `/admin/workspaces` (see every workspace, activate a plan for one with a specific number of days, or manually suspend/resume). A workspace's dashboard nav and each gated page hide/block anything its plan doesn't include (`requireFeature()` in `auth-guard.ts`); a suspended workspace sees a full block screen instead of its dashboard.
- **Resolved:** `PLATFORM_ADMIN_EMAILS` is set as a Production env var on the `ai` Vercel project (`saadbbbs-projects/ai`, alias `ai-delta-navy-52.vercel.app`) and the production deploy has picked it up.
- **Note found along the way:** the Vercel CLI on this machine had been logged into the wrong account (`dafatrapp-boop`, unrelated projects). Re-logged into the correct account (`saadbbb`) and linked this repo to the `ai` project — future `vercel` CLI commands in this repo should now work directly.

### 5. Cron secret in production — RESOLVED 2026-08-05
- **What's built:** `/api/cron/subscription-check` — runs daily (see `vercel.json`, `0 6 * * *`), sends "3/2/1 days left" reminder emails, and auto-suspends any workspace whose `subscriptionExpiresAt` has passed.
- **Resolved:** `CRON_SECRET` added as a Production env var on Vercel (same value as local `.env.local`) and production redeployed. Verified live: `curl` without an `Authorization` header now returns `401`, and with `Authorization: Bearer <CRON_SECRET>` returns `200` — the route is no longer open.

### 6. WhatsApp Business + Instagram DM (Meta OAuth) — the AI's own auto-reply channels
- **Not to be confused with:** item 4's WhatsApp CTA on `/dashboard/billing` — that's a plain `wa.me` deep link (no API, no approval needed) for *customers to contact the platform owner* about subscribing. This item is about the AI employee itself auto-replying to *end customers* on a business's own WhatsApp number, which does need the Business API.
- **What's built:** Onboarding step 10 ("Connect your channels") shows both channels with a "Coming soon" placeholder button. As of 2026-08-05, the underlying data model is real and channel-agnostic: `channels`/`contacts`/`conversations`/`messages` tables, a `channelRepository.ensureDefaultChannels` that already creates `not_connected` rows for `whatsapp`/`instagram` per workspace, and a Unified Inbox (`/dashboard/inbox`) built entirely against those tables. What's still missing is only the Meta-specific part: OAuth connection flow, webhook receiver, and outbound message-sending — once those exist they just insert into the same `messages` table the manual channel already uses, no redesign needed.
- **Blocked on:** A Meta Developer account, Business verification, and Meta App Review approval for the WhatsApp Business API and Instagram Graph API — this is a real, multi-week external approval process, not just an API key.
- **To unblock:** Register the business on Meta for Developers, submit for App Review with the required permissions, get WhatsApp Business API access provisioned.
- **Status:** Placeholder UI + ready-to-receive data model. OAuth/webhook/send code not started — next up once Meta approval is in progress.

### 7. Supabase Auth migration credentials — Phase 2 of PROJECT_GAP_ANALYSIS.md
- **Context:** Approved 2026-08-06 (Decision 1) — the app currently runs a fully custom email/OTP/session auth system (`src/features/auth`, `src/lib/auth/*`) instead of Supabase Auth as PART 3 of the spec requires. Pre-launch with no live customers, so this is the cheapest time to migrate. The plan: keep `users.id` as the same UUID Supabase assigns so no foreign key touches, add Google OAuth as the primary sign-in + email/password as secondary via Supabase, then remove the custom OTP/session/password code.
- **What's built:** Nothing yet — deliberately. Rewriting the live login/session flow without being able to test it against a real Supabase Auth instance risks breaking the only working auth path in the app, so no code was changed.
- **Blocked on:**
  1. The Supabase project's Auth API credentials — `NEXT_PUBLIC_SUPABASE_URL` (`https://gsqmfnavruffsijjuksv.supabase.co`, project ref read off the existing `DATABASE_URL`), `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` — all three are in the Supabase dashboard under **Project Settings → API** for that project.
  2. Google OAuth enabled as a sign-in provider — Supabase dashboard → **Authentication → Providers → Google**, which itself needs a Google Cloud Console OAuth 2.0 Client ID + Secret (Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID, type "Web application", authorized redirect URI is the one Supabase's Google provider screen shows once you open it — copy it in, don't guess it).
- **To unblock:** Get those 3 keys into `.env.local` (and later Vercel), and finish the Google provider setup in the Supabase dashboard, then say so — the actual code migration (client helpers, login/register/OAuth callback routes, session/middleware swap, then removing `users.password_hash`/`otp_codes`/`sessions`) can start the same session once credentials exist to test against.
- **Status:** Blocked on your action. Everything else in the approved plan (Phase 3 onward) doesn't depend on this and is proceeding in the meantime.

## Known future items — not built yet, but will need an external account when we get there

- **Automated payment gateway / billing** (Stripe or similar) — none of this exists yet, and per the user (2026-08-05) a real payment gateway needs a registered company first, which doesn't exist yet. **In the meantime, the full subscription lifecycle is manual but real, not a placeholder**: a customer messages via the WhatsApp CTA on `/dashboard/billing` → an admin activates a plan for them at `/admin/workspaces` with a specific number of days → the daily cron (item 5) emails them at 3/2/1 days before expiry and auto-suspends them if they don't renew. Whichever payment provider is chosen later just needs to call `workspaceAdminRepository.activateSubscription()` on successful payment instead of an admin clicking a button — no redesign. There's also a real `orders`/`order_items` model (`src/features/orders`) with a 9-stage status (draft → pending → confirmed → preparing → ready → delivered → completed → cancelled → refunded) that businesses can move through manually/COD today, separate from the platform's own subscription billing.
- **Cloudflare R2 (file storage)** — logo upload during onboarding is currently just a raw URL text field; a real upload widget needs an R2 bucket + API credentials.
- **Sentry (monitoring)** / **PostHog (analytics)** — not integrated at all yet; both need their own account + project key when they're added.

## Needs your decision — not blocked on an account, but shouldn't be built without your sign-off

Added 2026-08-06 while working through the remaining gaps from the Aii.txt spec. Items 1-3 below were approved by the user on 2026-08-06 and are now built (see resolution notes). Item 4 remains open.

### 1. Visual drag-and-drop workflow builder — RESOLVED 2026-08-06
- **What's built:** `/dashboard/automations/new` is now a React Flow (`@xyflow/react`) canvas — three connected, draggable nodes (Trigger / Conditions / Action, see `src/features/automation/components/workflow-canvas/`), zoom/pan/mini-map, editing every field inline inside each node. Submits the same `createWorkflowAction` payload the old form did, so the underlying data model and automation engine are unchanged.
- **Deliberate scope cut, not an oversight:** node count is fixed at three (this is a visual editor for the engine's existing linear trigger→conditions→action→delay shape, not a general graph/branching editor); node positions are draggable within a session but not persisted (auto-laid-out fresh on each visit); no undo/redo.
- **A real bug this caught:** the first implementation reconstructed a bare `{id, position}` object on every state change instead of using React Flow's `useNodesState`, which discarded the internal `measured` dimensions React Flow needs to ever mark a node visible — nodes (and the edges between them, which need both endpoints measured) stayed permanently invisible. Only caught by actually driving the page in a browser (Playwright, session cookie crafted for a local test) — typecheck/lint/build all passed on the broken version. Verified fixed end-to-end: node interaction, dropdown-without-drag, add-condition, and full submit → workflow appears in the list.

### 2. Real MRR/ARR revenue dashboard — RESOLVED 2026-08-06 (dashboard), open (actual prices)
- **What's built:** `plans.price`/`plans.currency` columns (currency fixed to IQD per user decision), a price field on the plan builder at `/admin/plans`, and `/admin/revenue` showing MRR/ARR/active-subscription-count/unpriced-count, broken down by plan (`calculateRevenue()`, unit tested).
- **Still open:** no actual prices were invented or entered — every plan in the live database has `price: null` today (there were zero plans in the DB as of 2026-08-06, so nothing to backfill either). The dashboard will show 0/0 until real prices are set.
- **Ask still standing:** go to `/admin/plans` and set a real IQD price on each plan whenever the pricing is decided — the revenue numbers pick it up immediately, no further engineering work needed.

### 3. Super Admin impersonation — RESOLVED 2026-08-06
- **What's built:** Read-only only, per the user's "highest security standards" instruction — not a session takeover. `/admin/workspaces/[id]/view` renders a snapshot (dashboard stats, contacts, leads, orders, appointments, conversations) with zero write path. Restricted to bootstrap (`PLATFORM_ADMIN_EMAILS`) admins only via a new `requirePrimaryPlatformAdmin()` guard — a database-managed admin (added through `/admin/admins`) cannot use it and doesn't see the link, since impersonation access can't be self-delegated. A persistent banner marks the mode; every view (not just the first) writes an `impersonation_started` row to `audit_logs` with the admin's identity and the target workspace.
- **Not built (would need your sign-off separately if wanted later):** a write-capable "log in as" mode, MFA gating, IP allow-listing.

### 4. Global cross-entity search (Part 2/5 of the spec)
- **What exists today:** Nothing — not started. Contacts/Leads/Orders/Appointments each have their own page but no single search box across all of them.
- **Why it's flagged:** Not risky, just underspecified — "search everything" needs a decision on where it lives (a header search bar? a dedicated `/search` page?), what ranking/grouping looks like with mixed result types, and whether it's simple `ILIKE` matching (fine at current scale) or needs to be planned for Postgres full-text search from the start.
- **Status:** Still open, still lower priority — not part of the 2026-08-06 approval.
