import { type NextRequest, NextResponse } from "next/server";

const AUTH_PAGES = ["/login", "/register", "/verify", "/forgot-password", "/reset-password"];

/**
 * Cheap, edge-safe presence check only (no DB/Redis calls here — node-postgres and ioredis
 * aren't edge-compatible). The authoritative check (secret verification, expiry) happens in
 * requireUser()/getCurrentSession() inside the dashboard layout.
 */
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has("session");
  const { pathname } = request.nextUrl;

  if ((pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && AUTH_PAGES.some((page) => pathname.startsWith(page))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/login",
    "/register",
    "/verify",
    "/forgot-password",
    "/reset-password",
  ],
};
