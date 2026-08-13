"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const WIDTHS = { desktop: "100%", tablet: "768px", mobile: "375px" } as const;
type PreviewSize = keyof typeof WIDTHS;

/**
 * A real iframe of the live/draft storefront (`?preview=1`, see get-storefront-data.ts's
 * owner-bypass) — not a static mockup. Re-mounts the iframe (via `key`) each time "Refresh"
 * fires so the owner sees their latest saved changes without a full page reload.
 */
export function WebsitePreview({ storeUrl }: { storeUrl: string }) {
  const t = useTranslations("website");
  const [size, setSize] = useState<PreviewSize>("desktop");
  const [refreshKey, setRefreshKey] = useState(0);

  const sizes: { key: PreviewSize; label: string; icon: typeof Monitor }[] = [
    { key: "desktop", label: t("previewDesktop"), icon: Monitor },
    { key: "tablet", label: t("previewTablet"), icon: Tablet },
    { key: "mobile", label: t("previewMobile"), icon: Smartphone },
  ];

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{t("previewHeading")}</p>
          <div className="flex gap-1">
            {sizes.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSize(key)}
                aria-label={label}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md",
                  size === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-4" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="rounded-md px-2 text-xs text-muted-foreground hover:bg-muted"
            >
              ↻
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-muted/30 p-3">
          <iframe
            key={refreshKey}
            src={`${storeUrl}?preview=1`}
            title={t("previewHeading")}
            style={{ width: WIDTHS[size], height: 600 }}
            className="mx-auto max-w-full rounded-md border bg-background"
          />
        </div>
      </CardContent>
    </Card>
  );
}
