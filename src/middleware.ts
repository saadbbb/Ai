import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env";

// /reset-password is deliberately excluded — verifyOtp(type: "recovery") grants a real
// session before the user has set their new password, so an authenticated visit there
// must not bounce away like the other auth-only pages do.
const AUTH_PAGES = ["/login", "/register", "/verify", "/forgot-password"];

const GATED_PREFIXES = ["/dashboard", "/onboarding", "/admin"];

/**
 * Custom-domain routing (Website Settings → Publishing & domain). A workspace can point its
 * own domain at this app; any request arriving on a host that isn't this deployment's own
 * primary domain gets rewritten to that workspace's /store/[slug] tree. Resolved via a Node-
 * runtime API route rather than a direct DB call here, since middleware defaults to the Edge
 * runtime and this app's Postgres client isn't Edge-compatible.
 */
function isPrimaryHost(host: string): boolean {
  const hostname = host.split(":")[0];
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (hostname.endsWith(".vercel.app")) return true;
  try {
    return new URL(getAppUrl()).hostname === hostname;
  } catch {
    return false;
  }
}

async function resolveCustomDomainSlug(host: string, request: NextRequest): Promise<string | null> {
  try {
    const url = new URL("/api/internal/resolve-store-domain", request.url);
    url.searchParams.set("host", host.split(":")[0]);
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as { slug: string | null };
    return data.slug;
  } catch {
    return null;
  }
}

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
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  if (!isPrimaryHost(host)) {
    const slug = await resolveCustomDomainSlug(host, request);
    if (slug) {
      const suffix = pathname === "/" ? "" : pathname;
      return NextResponse.rewrite(new URL(`/store/${slug}${suffix}${search}`, request.url));
    }
  }

  const needsAuthCheck =
    GATED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    AUTH_PAGES.some((page) => pathname.startsWith(page)) ||
    pathname.startsWith("/reset-password");
  if (!needsAuthCheck) {
    return NextResponse.next();
  }

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
  // Broadened from a curated path list so a custom domain's request (any path, unknown host)
  // still reaches the rewrite check above — excludes Next internals, static assets, and API
  // routes, none of which need the custom-domain rewrite or the Supabase session refresh.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.[\\w]+$).*)"],
};
