import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// /reset-password is deliberately excluded — verifyOtp(type: "recovery") grants a real
// session before the user has set their new password, so an authenticated visit there
// must not bounce away like the other auth-only pages do.
const AUTH_PAGES = ["/login", "/register", "/verify", "/forgot-password"];

/**
 * Refreshes the Supabase session cookie on every matched request (the
 * official @supabase/ssr pattern — the auth token is short-lived and this is
 * what keeps it valid) and gates protected/auth-only routes based on it.
 * supabase.auth.getUser() re-validates the JWT against Supabase's Auth
 * server rather than trusting a locally-decoded token — worth the network
 * call here since this is the actual authorization check, not just a
 * presence probe like the old cookie-only version of this file.
 *
 * The validated identity is forwarded to the Server Component render via
 * request headers (x-supabase-user-*) — requireUser() (auth-guard.ts),
 * called in every protected layout, reads these first instead of making its
 * own second network round-trip to re-verify the exact same JWT this
 * middleware just verified. That was a genuine duplicate Supabase Auth call
 * on every single dashboard/onboarding/admin page load before this.
 */
export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  let cookiesToApply: { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        cookiesToApply = cookiesToSet;
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (
    (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding") || pathname.startsWith("/admin")) &&
    !user
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && AUTH_PAGES.some((page) => pathname.startsWith(page))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (user) {
    requestHeaders.set("x-supabase-user-id", user.id);
    if (user.email) requestHeaders.set("x-supabase-user-email", user.email);
    if (user.phone) requestHeaders.set("x-supabase-user-phone", user.phone);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const { name, value, options } of cookiesToApply) {
    response.cookies.set(name, value, options);
  }
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/verify",
    "/forgot-password",
    "/reset-password",
  ],
};
