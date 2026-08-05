# Deferred Tasks

Things that are built (or stubbed) in code but can't actually go live until someone
gets an external account, verification, or approval. This file is updated automatically
every time a new item like this comes up — don't let it go stale.

## Blocked right now — code is ready, waiting on an external account/credential

### 1. Claude (Anthropic) API key
- **What's built:** Full AI provider layer (`AIProvider`/`AIRouter`/`ClaudeProvider`/prompt builder) + a "Test your AI employee" chat screen in the dashboard + the real Inbox (`src/features/inbox`), which calls the same `aiService.generateReply` to auto-reply inside conversations.
- **Blocked on:** A real `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com).
- **To unblock:** Add the key to `.env.local` (local) and to the Vercel project's Environment Variables (production), then redeploy.
- **Status:** User is buying the key tomorrow (2026-08-06). Until then, `inboxService.triggerAiReply` catches the provider's `AppError` gracefully — the customer message still saves, a system note ("AI employee couldn't generate a reply") gets logged, and the conversation flips to `handed_over` instead of crashing. So the Inbox is fully testable end-to-end today except for the actual AI reply text.

### 2. Real email delivery (Resend)
- **What's built:** `EmailService` abstraction with a Resend provider already wired in (`src/lib/email/resend-email-provider.ts`); falls back to a console-log mock provider when no key is set.
- **Blocked on:** Resend account is in **sandbox mode** — no verified sending domain yet. OTP emails can only be delivered to the account's own signup address (`ssaadbbbb@gmail.com`); any other recipient fails with `validation_error`.
- **To unblock:** Verify a custom domain in Resend, then update `EMAIL_FROM` (currently `onboarding@resend.dev`) to an address on that domain.
- **Status:** Works for the developer's own test account only. Not usable for real end users yet.

### 3. Redis session cache (Upstash)
- **What's built:** `src/lib/redis/session-cache.ts` caches sessions in Redis in front of Postgres, with a clean fallback — if `REDIS_URL` isn't set, it's skipped entirely (no doomed connection attempts; this was a real bug fixed on 2026-08-05).
- **Blocked on:** No Upstash Redis instance provisioned yet.
- **To unblock:** Create an Upstash Redis database, set `REDIS_URL` in `.env.local` and Vercel.
- **Status:** App works correctly without it (every session lookup just hits Postgres directly) — this is a performance optimization, not a blocker for anything else.

### 4. Platform Admin access in production
- **What's built:** A Super Admin Platform first slice — `/admin/settings` (edit the WhatsApp number/message customers see on the Billing page) and `/admin/admins` (self-service admin allowlist), gated by `requirePlatformAdmin()`. Two layers: `PLATFORM_ADMIN_EMAILS` env var (recovery/bootstrap, never locked out by DB state) plus a `platform_admins` DB table any current admin can add/remove emails from.
- **Blocked on:** Nothing external — but `PLATFORM_ADMIN_EMAILS=ssaadbbbb@gmail.com` was only added to local `.env.local`, not to Vercel's Environment Variables yet.
- **To unblock:** Add `PLATFORM_ADMIN_EMAILS` to the Vercel project's Environment Variables (same value, or a permanent email once one exists — user flagged the current account is temporary), then redeploy. Until then, `/admin/*` on production will redirect everyone to `/dashboard`, including the account that should have access.
- **Status:** Code is done and tested against the local DB; just needs the env var set on Vercel.

### 5. WhatsApp Business + Instagram DM (Meta OAuth) — the AI's own auto-reply channels
- **Not to be confused with:** item 4's WhatsApp CTA on `/dashboard/billing` — that's a plain `wa.me` deep link (no API, no approval needed) for *customers to contact the platform owner* about subscribing. This item is about the AI employee itself auto-replying to *end customers* on a business's own WhatsApp number, which does need the Business API.
- **What's built:** Onboarding step 10 ("Connect your channels") shows both channels with a "Coming soon" placeholder button. As of 2026-08-05, the underlying data model is real and channel-agnostic: `channels`/`contacts`/`conversations`/`messages` tables, a `channelRepository.ensureDefaultChannels` that already creates `not_connected` rows for `whatsapp`/`instagram` per workspace, and a Unified Inbox (`/dashboard/inbox`) built entirely against those tables. What's still missing is only the Meta-specific part: OAuth connection flow, webhook receiver, and outbound message-sending — once those exist they just insert into the same `messages` table the manual channel already uses, no redesign needed.
- **Blocked on:** A Meta Developer account, Business verification, and Meta App Review approval for the WhatsApp Business API and Instagram Graph API — this is a real, multi-week external approval process, not just an API key.
- **To unblock:** Register the business on Meta for Developers, submit for App Review with the required permissions, get WhatsApp Business API access provisioned.
- **Status:** Placeholder UI + ready-to-receive data model. OAuth/webhook/send code not started — next up once Meta approval is in progress.

## Known future items — not built yet, but will need an external account when we get there

- **Automated payment gateway / billing** (Stripe or similar) — Part 2's schema plan includes Billing/Subscriptions/Invoices tables, but none of this exists yet, and per the user (2026-08-05) a real payment gateway needs a registered company first, which doesn't exist yet. **In the meantime, subscribing is manual**: `/dashboard/billing` shows a "Subscribe via WhatsApp" button (a plain `wa.me` link, admin-configurable at `/admin/settings`) instead of a payment form — this is the real go-to-market flow for now, not a placeholder. There's also a real `orders`/`order_items` model (`src/features/orders`) with a 9-stage status (draft → pending → confirmed → preparing → ready → delivered → completed → cancelled → refunded) that businesses can move through manually/COD today. Whichever payment provider is chosen later just needs to plug into that same status flow (e.g. `pending` → auto-`confirmed` on successful payment) — no redesign, but it still needs the company registered and a real merchant account before online payment can be tested end-to-end.
- **Cloudflare R2 (file storage)** — logo upload during onboarding is currently just a raw URL text field; a real upload widget needs an R2 bucket + API credentials.
- **Sentry (monitoring)** / **PostHog (analytics)** — not integrated at all yet; both need their own account + project key when they're added.
