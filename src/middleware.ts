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
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
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
