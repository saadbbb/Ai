import "server-only";
import { AppError } from "@/lib/errors/app-error";
import { checkRateLimit } from "@/lib/rate-limit/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Thin wrapper over Supabase Auth (see PROJECT_GAP_ANALYSIS.md Phase 2) — Supabase
 * owns credential storage, email verification, password reset, and session/JWT
 * handling natively. This layer only adds app-level rate limiting on top and
 * translates Supabase's errors into our own AppError shape, same as the retired
 * custom auth service did for its own checks.
 *
 * Email confirmation and password reset both use a 6-digit OTP code, not a
 * magic link — matching the pre-migration UX. The code itself is generated
 * and emailed by Supabase; verifying it (verifyOtp) is what establishes the
 * session. This requires the "Confirm signup" and "Reset Password" email
 * templates in the Supabase dashboard to actually display {{ .Token }} —
 * see DEFERRED_TASKS.md.
 */

const OTP_VERIFY_WINDOW_SECONDS = 15 * 60;
const OTP_VERIFY_MAX_ATTEMPTS = 5;

async function signUp(email: string, password: string): Promise<{ needsEmailConfirmation: boolean }> {
  const allowed = await checkRateLimit(`signup:${email.toLowerCase()}`, { windowSeconds: 60, max: 3 });
  if (!allowed) {
    throw new AppError("RATE_LIMITED", "Please wait a moment before trying again.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    throw new AppError("VALIDATION_ERROR", error.message);
  }

  return { needsEmailConfirmation: !data.session };
}

/** Confirms a new account with the 6-digit code Supabase emailed — establishes a session on success. */
async function verifySignupOtp(email: string, code: string): Promise<void> {
  const allowed = await checkRateLimit(`verify-signup:${email.toLowerCase()}`, {
    windowSeconds: OTP_VERIFY_WINDOW_SECONDS,
    max: OTP_VERIFY_MAX_ATTEMPTS,
  });
  if (!allowed) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Please request a new code.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
  if (error) {
    throw new AppError("INVALID_OTP", "Invalid or expired code.");
  }
}

/** Re-sends the 6-digit signup confirmation code. */
async function resendSignupOtp(email: string): Promise<void> {
  const allowed = await checkRateLimit(`resend-signup:${email.toLowerCase()}`, { windowSeconds: 60, max: 1 });
  if (!allowed) {
    throw new AppError("RATE_LIMITED", "Please wait a moment before requesting another code.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) {
    throw new AppError("VALIDATION_ERROR", error.message);
  }
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

/**
 * No SMS provider configured (same underlying constraint as email confirmation —
 * see DEFERRED_TASKS.md), so instead of Supabase's normal phone-OTP signup flow
 * we create the account server-side via the Admin API with phone_confirm: true,
 * which marks it verified without ever sending a code, then sign in normally to
 * establish a real session. Rate-limited the same as email signup.
 *
 * Needs one Supabase dashboard step before it actually works — Authentication ->
 * Providers -> Phone must be enabled, same category of blocker as Google OAuth
 * (see google-signin-button.tsx's comment). Verified live: without it, Supabase
 * returns "Phone logins are disabled" — see DEFERRED_TASKS.md item 10.
 */
async function signUpWithPhone(phone: string, password: string): Promise<void> {
  const allowed = await checkRateLimit(`signup-phone:${phone}`, { windowSeconds: 60, max: 3 });
  if (!allowed) {
    throw new AppError("RATE_LIMITED", "Please wait a moment before trying again.");
  }

  const admin = createSupabaseAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({ phone, password, phone_confirm: true });
  if (createError) {
    throw new AppError("VALIDATION_ERROR", createError.message);
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ phone, password });
  if (signInError) {
    throw new AppError("VALIDATION_ERROR", signInError.message);
  }
}

async function loginWithPhone(phone: string, password: string): Promise<void> {
  const allowed = await checkRateLimit(`login-phone:${phone}`, { windowSeconds: 15 * 60, max: 5 });
  if (!allowed) {
    throw new AppError("RATE_LIMITED", "Too many login attempts. Please try again in a few minutes.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ phone, password });
  if (error) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid phone number or password.");
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
    throw new AppError("RATE_LIMITED", "Please wait a moment before requesting another code.");
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email);
}

/** Confirms the 6-digit password-reset code — establishes a recovery session the reset-password page uses. */
async function verifyRecoveryOtp(email: string, code: string): Promise<void> {
  const allowed = await checkRateLimit(`verify-recovery:${email.toLowerCase()}`, {
    windowSeconds: OTP_VERIFY_WINDOW_SECONDS,
    max: OTP_VERIFY_MAX_ATTEMPTS,
  });
  if (!allowed) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Please request a new code.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
  if (error) {
    throw new AppError("INVALID_OTP", "Invalid or expired code.");
  }
}

export const authService = {
  signUp,
  signUpWithPhone,
  verifySignupOtp,
  resendSignupOtp,
  login,
  loginWithPhone,
  logout,
  requestPasswordReset,
  verifyRecoveryOtp,
};
