"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Storefront } from "@/db/schema";
import { updateStorefrontAction } from "@/features/storefront/actions/update-storefront.action";

const TRACKING_KEYS = ["metaPixelId", "googleAnalyticsId", "googleTagManagerId", "tiktokPixelId"] as const;

/**
 * Ad-platform tracking pixels live on the storefront record (they fire from the storefront
 * pages), but the brief keeps them out of the Website builder — a business owner configuring
 * ad tracking thinks of it as an Ads task, not a website-content task. Saving here round-trips
 * every other storefront field unchanged so it doesn't clobber the Website builder's settings.
 */
export function TrackingSettingsForm({ storefront }: { storefront: Storefront }) {
  const t = useTranslations("website");
  const tAds = useTranslations("ads");
  const [trackingIds, setTrackingIds] = useState<Record<string, string>>(storefront.trackingIds ?? {});
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    const result = await updateStorefrontAction({
      isPublished: storefront.isPublished,
      heroTitle: storefront.heroTitle ?? undefined,
      heroSubtitle: storefront.heroSubtitle ?? undefined,
      aboutText: storefront.aboutText ?? undefined,
      contactPhone: storefront.contactPhone ?? undefined,
      contactEmail: storefront.contactEmail ?? undefined,
      primaryColor: storefront.primaryColor ?? undefined,
      secondaryColor: storefront.secondaryColor ?? undefined,
      faviconUrl: storefront.faviconUrl ?? undefined,
      bannerImageUrl: storefront.bannerImageUrl ?? undefined,
      theme: storefront.theme,
      font: storefront.font,
      buttonStyle: storefront.buttonStyle,
      cornerStyle: storefront.cornerStyle,
      headerStyle: storefront.headerStyle,
      footerStyle: storefront.footerStyle,
      darkMode: storefront.darkMode,
      socialLinks: storefront.socialLinks ?? undefined,
      trackingIds,
      seoTitle: storefront.seoTitle ?? undefined,
      seoDescription: storefront.seoDescription ?? undefined,
      translations: storefront.translations ?? undefined,
      sections: storefront.sections,
      privacyPolicyText: storefront.privacyPolicyText ?? undefined,
      termsText: storefront.termsText ?? undefined,
      announcementBarText: storefront.announcementBarText ?? undefined,
      announcementBarLink: storefront.announcementBarLink ?? undefined,
      popupEnabled: storefront.popupEnabled,
      popupTitle: storefront.popupTitle ?? undefined,
      popupMessage: storefront.popupMessage ?? undefined,
      popupButtonText: storefront.popupButtonText ?? undefined,
      popupButtonLink: storefront.popupButtonLink ?? undefined,
      popupTrigger: storefront.popupTrigger,
      popupDelaySeconds: storefront.popupDelaySeconds,
    });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(t("saved"));
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium">{t("trackingHeading")}</p>
          <p className="text-xs text-muted-foreground">{tAds("tracking.description")}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {TRACKING_KEYS.map((key) => (
            <div key={key} className="space-y-2">
              <label className="text-sm text-muted-foreground">{t(`tracking.${key}`)}</label>
              <Input
                value={trackingIds[key] ?? ""}
                onChange={(event) => setTrackingIds((current) => ({ ...current, [key]: event.target.value }))}
              />
            </div>
          ))}
        </div>
        <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? t("saving") : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
