import { NextResponse, type NextRequest } from "next/server";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";

/**
 * Edge middleware can't talk to Postgres directly (this app's `pg`-based db client needs the
 * Node runtime, middleware defaults to Edge) — so custom-domain routing proxies through this
 * plain Node-runtime API route instead of flipping on Next's experimental Node middleware
 * runtime for the whole app. Only ever returns a workspace slug, which is already public
 * (it's the storefront's own URL segment) — nothing sensitive here.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const host = request.nextUrl.searchParams.get("host");
  if (!host) {
    return NextResponse.json({ slug: null }, { status: 400 });
  }

  const match = await storefrontRepository.findPublishedByCustomDomain(host);
  return NextResponse.json({ slug: match?.slug ?? null });
}
