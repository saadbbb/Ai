import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Landing point for Google OAuth and sign-up email confirmation (see
 * emailRedirectTo/redirectTo in auth.service.ts and google-signin-button.tsx).
 * Just exchanges the code for a session — requireUser() on the /dashboard
 * request that follows creates the local profile/workspace on first sight
 * (see profileSyncService), so this route doesn't need to know or care
 * whether the signed-in user is brand new or returning.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
