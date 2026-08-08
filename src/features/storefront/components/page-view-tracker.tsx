"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackPageViewAction } from "../actions/track-page-view.action";

/** Renders nothing — fires one best-effort pageview per navigation. See storefront-analytics.service.ts. */
export function PageViewTracker({ slug }: { slug: string }) {
  const pathname = usePathname();

  useEffect(() => {
    void trackPageViewAction({ slug, path: pathname });
  }, [slug, pathname]);

  return null;
}
