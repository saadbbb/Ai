"use client";

import { useState } from "react";
import type { Storefront } from "@/db/schema";
import { StorefrontEditor } from "./storefront-editor";
import { WebsitePreview } from "./website-preview";

/**
 * Owns a single `refreshKey` shared by the editor (bumps it right after a successful save) and
 * the preview iframe (bumps it via its own manual "↻" button too) — so the owner sees their
 * latest saved appearance/layout changes without needing to remember to click refresh.
 */
export function WebsiteEditorPanel({
  storefront,
  storeUrl,
  slug,
  logoUrl,
}: {
  storefront: Storefront;
  storeUrl: string;
  slug: string;
  logoUrl: string | null;
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
      <StorefrontEditor
        storefront={storefront}
        storeUrl={storeUrl}
        slug={slug}
        logoUrl={logoUrl}
        onSaved={() => setRefreshKey((current) => current + 1)}
      />
      <WebsitePreview storeUrl={storeUrl} refreshKey={refreshKey} onManualRefresh={() => setRefreshKey((current) => current + 1)} />
    </div>
  );
}
