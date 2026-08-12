import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS and can call the Admin API
 * (auth.admin.*). Never expose this to the client; only import it from
 * server actions/services. Used for two things today: creating a
 * pre-verified phone account without an SMS provider (see
 * signUpWithPhoneAction — admin.createUser({ phone_confirm: true }) marks
 * the phone verified without ever sending a code), and letting a platform
 * admin reset a phone user's password since they have no self-service
 * recovery path (see reset-user-password.action.ts).
 */
export function createSupabaseAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
