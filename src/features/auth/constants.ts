/**
 * Temporarily hides email+password sign-up/sign-in in the UI, leaving only
 * Google — the app's Resend account has no verified sending domain yet
 * (see DEFERRED_TASKS.md), so email/password's confirmation and password-reset
 * codes can't reliably reach real users right now. Nothing was deleted:
 * flipping this back to true re-enables the existing forms/actions/pages
 * as-is. Google sign-in needs no outbound email at all, so it's unaffected.
 */
export const EMAIL_PASSWORD_AUTH_ENABLED = false;
