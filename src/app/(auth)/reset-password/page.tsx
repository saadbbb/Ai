import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface PageProps {
  searchParams: Promise<{ code?: string }>;
}

/**
 * Reached via the link in Supabase's password-recovery email — exchanges the
 * PKCE code for a session server-side (same cookie jar the browser client
 * reads from), then the form itself just calls supabase.auth.updateUser().
 */
export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { code } = await searchParams;
  let validLink = false;

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    validLink = !error;
  }

  return <ResetPasswordForm validLink={validLink} />;
}
