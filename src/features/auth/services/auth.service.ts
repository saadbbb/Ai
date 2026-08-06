import "server-only";
import { getAppUrl } from "@/lib/env";
import { AppError } from "@/lib/errors/app-error";
import { checkRateLimit } from "@/lib/rate-limit/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Thin wrapper over Supabase Auth (see PROJECT_GAP_ANALYSIS.md Phase 2) — Supabase
 * owns credential storage, email verification, password reset, and session/JWT
 * handling natively. This layer only adds app-level rate limiting on top and
 * translates Supabase's errors into our own AppError shape, same as the retired
 * custom auth service did for its own checks.
 */

async function signUp(email: string, password: string): Promise<{ needsEmailConfirmation: boolean }> {
  const allowed = await checkRateLimit(`signup:${email.toLowerCase()}`, { windowSeconds: 60, max: 3 });
  if (!allowed) {
    throw new AppError("RATE_LIMITED", "Please wait a moment before trying again.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${getAppUrl()}/auth/callback` },
  });

  if (error) {
    throw new AppError("VALIDATION_ERROR", error.message);
  }

  return { needsEmailConfirmation: !data.session };
}

async function login(email: string, password: string): Promise<void> {
  const allowed = await checkRateLimit(`login:${email.toLowerCase()}`, { windowSeconds: 15 * 60, max: 5 });
  if (!allowed) {
    throw new AppError("RATE_LIMITED", "Too many login attempts. Please try again in a few minutes.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email or password.");
  }
}

async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

/** Supabase never reveals whether the account exists — same privacy guarantee the old flow had. */
async function requestPasswordReset(email: string): Promise<void> {
  const allowed = await checkRateLimit(`password-reset:${email.toLowerCase()}`, { windowSeconds: 60, max: 3 });
  if (!allowed) {
    throw new AppError("RATE_LIMITED", "Please wait a moment before requesting another reset link.");
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${getAppUrl()}/reset-password` });
}

export const authService = {
  signUp,
  login,
  logout,
  requestPasswordReset,
};
