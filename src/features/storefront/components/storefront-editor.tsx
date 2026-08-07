"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Storefront } from "@/db/schema";
import { updateStorefrontAction } from "../actions/update-storefront.action";

export function StorefrontEditor({ storefront, storeUrl }: { storefront: Storefront; storeUrl: string }) {
  const t = useTranslations("website");
  const [isPublished, setIsPublished] = useState(storefront.isPublished);
  const [heroTitle, setHeroTitle] = useState(storefront.heroTitle ?? "");
  const [heroSubtitle, setHeroSubtitle] = useState(storefront.heroSubtitle ?? "");
  const [aboutText, setAboutText] = useState(storefront.aboutText ?? "");
  const [contactPhone, setContactPhone] = useState(storefront.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(storefront.contactEmail ?? "");
  const [primaryColor, setPrimaryColor] = useState(storefront.primaryColor ?? "#2563eb");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    const result = await updateStorefrontAction({
      isPublished,
      heroTitle: heroTitle || undefined,
      heroSubtitle: heroSubtitle || undefined,
      aboutText: aboutText || undefined,
      contactPhone: contactPhone || undefined,
      contactEmail: contactEmail || undefined,
      primaryColor: primaryColor || undefined,
    });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(t("saved"));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{t("publishLabel")}</p>
            <p className="text-sm text-muted-foreground">
              {isPublished ? t("publishedHint", { url: storeUrl }) : t("unpublishedHint")}
            </p>
          </div>
          <Switch checked={isPublished} onCheckedChange={setIsPublished} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">{t("contentHeading")}</p>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t("heroTitleLabel")}</label>
            <Input value={heroTitle} onChange={(event) => setHeroTitle(event.target.value)} placeholder={t("heroTitlePlaceholder")} />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t("heroSubtitleLabel")}</label>
            <Input value={heroSubtitle} onChange={(event) => setHeroSubtitle(event.target.value)} placeholder={t("heroSubtitlePlaceholder")} />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t("aboutLabel")}</label>
            <Textarea value={aboutText} onChange={(event) => setAboutText(event.target.value)} rows={4} placeholder={t("aboutPlaceholder")} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("contactPhoneLabel")}</label>
              <Input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("contactEmailLabel")}</label>
              <Input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t("colorLabel")}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : "#2563eb"}
                onChange={(event) => setPrimaryColor(event.target.value)}
                className="h-9 w-14 rounded border border-input"
              />
              <Input value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} className="w-32" />
            </div>
          </div>
          <div className="flex justify-end border-t pt-4">
            <Button type="button" disabled={isSaving} onClick={handleSave}>
              {isSaving ? t("saving") : t("save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
