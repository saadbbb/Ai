# Deferred Tasks

Things that are built (or stubbed) in code but can't actually go live until someone
gets an external account, verification, or approval. This file is updated automatically
every time a new item like this comes up — don't let it go stale.

## Blocked right now — code is ready, waiting on an external account/credential

### 1. Claude (Anthropic) API key
- **What's built:** Full AI provider layer (`AIProvider`/`AIRouter`/`ClaudeProvider`/prompt builder) + a "Test your AI employee" chat screen in the dashboard.
- **Blocked on:** A real `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com).
- **To unblock:** Add the key to `.env.local` (local) and to the Vercel project's Environment Variables (production), then redeploy.
- **Status:** User is buying the key tomorrow (2026-08-06).

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

### 4. WhatsApp Business + Instagram DM (Meta OAuth)
- **What's built:** Onboarding step 10 ("Connect your channels") shows both channels with a "Coming soon" placeholder button; no OAuth flow, no webhook receiver, no message-sending code exists yet.
- **Blocked on:** A Meta Developer account, Business verification, and Meta App Review approval for the WhatsApp Business API and Instagram Graph API — this is a real, multi-week external approval process, not just an API key.
- **To unblock:** Register the business on Meta for Developers, submit for App Review with the required permissions, get WhatsApp Business API access provisioned.
- **Status:** Not started beyond the placeholder UI. This is its own future architecture phase (per the original Part 3 "Channel Connection" spec).

## Known future items — not built yet, but will need an external account when we get there

- **Payment gateway / billing** (Stripe or similar) — Part 2's schema plan includes Billing/Subscriptions/Invoices tables, but none of this exists yet. Whichever provider is chosen will need a real merchant account before payments can be tested end-to-end.
- **Cloudflare R2 (file storage)** — logo upload during onboarding is currently just a raw URL text field; a real upload widget needs an R2 bucket + API credentials.
- **Sentry (monitoring)** / **PostHog (analytics)** — not integrated at all yet; both need their own account + project key when they're added.
