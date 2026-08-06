import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Reached after the OTP step in ForgotPasswordForm — verifyRecoveryOtpAction
 * already established a recovery session (see auth.service.ts) before
 * redirecting here, so this page just checks that session exists; the form
 * itself calls supabase.auth.updateUser().
 */
export default async function ResetPasswordPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <ResetPasswordForm validLink={!!user} />;
}
