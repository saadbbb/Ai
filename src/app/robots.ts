import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

/**
 * This single domain serves both the SaaS app (dashboard/admin/auth — never
 * indexed) and every tenant's public storefront under /store/[slug] (should
 * be indexed). robots.txt only exists at the domain root, so one file has to
 * cover both.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/store",
      disallow: ["/dashboard", "/admin", "/api", "/onboarding", "/login", "/register", "/forgot-password", "/reset-password", "/verify", "/invitations", "/auth"],
    },
    sitemap: `${getAppUrl()}/sitemap.xml`,
    host: getAppUrl(),
  };
}
