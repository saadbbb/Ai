"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  Storefront,
  StorefrontButtonStyle,
  StorefrontCornerStyle,
  StorefrontFont,
  StorefrontFooterStyle,
  StorefrontHeaderStyle,
  StorefrontPopupTrigger,
  StorefrontTheme,
} from "@/db/schema";
import { updateSlugAction } from "@/features/workspace/actions/update-slug.action";
import { updateStorefrontAction } from "../actions/update-storefront.action";

const THEMES: StorefrontTheme[] = ["modern", "minimal", "classic", "bold"];
const FONTS: StorefrontFont[] = ["inter", "poppins", "playfair", "roboto_mono"];
const BUTTON_STYLES: StorefrontButtonStyle[] = ["rounded", "square", "pill"];
const CORNER_STYLES: StorefrontCornerStyle[] = ["sharp", "soft", "round"];
const HEADER_STYLES: StorefrontHeaderStyle[] = ["standard", "centered", "minimal"];
const FOOTER_STYLES: StorefrontFooterStyle[] = ["standard", "minimal"];
const POPUP_TRIGGERS: StorefrontPopupTrigger[] = ["first_visit", "delay", "exit_intent"];
const SOCIAL_KEYS = ["whatsapp", "instagram", "facebook", "tiktok", "youtube", "snapchat", "telegram"] as const;
const ALL_SECTION_KEYS = ["hero", "about", "featured", "products", "services", "testimonials", "contact"] as const;
const CONTENT_LOCALES = ["en", "ar", "ku"] as const;
const CONTENT_LOCALE_LABELS: Record<(typeof CONTENT_LOCALES)[number], string> = { en: "English", ar: "العربية", ku: "کوردی" };
type StorefrontTranslations = Record<string, { heroTitle?: string; heroSubtitle?: string; aboutText?: string }>;

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#2563eb"}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-14 rounded border border-input"
        />
        <Input value={value} onChange={(event) => onChange(event.target.value)} className="w-32" />
      </div>
    </div>
  );
}

export function StorefrontEditor({
  storefront,
  storeUrl,
  slug,
}: {
  storefront: Storefront;
  storeUrl: string;
  slug: string;
}) {
  const t = useTranslations("website");
  const [isPublished, setIsPublished] = useState(storefront.isPublished);
  const [heroTitle, setHeroTitle] = useState(storefront.heroTitle ?? "");
  const [heroSubtitle, setHeroSubtitle] = useState(storefront.heroSubtitle ?? "");
  const [aboutText, setAboutText] = useState(storefront.aboutText ?? "");
  const [contactPhone, setContactPhone] = useState(storefront.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(storefront.contactEmail ?? "");
  const [primaryColor, setPrimaryColor] = useState(storefront.primaryColor ?? "#2563eb");
  const [secondaryColor, setSecondaryColor] = useState(storefront.secondaryColor ?? "#f97316");
  const [faviconUrl, setFaviconUrl] = useState(storefront.faviconUrl ?? "");
  const [bannerImageUrl, setBannerImageUrl] = useState(storefront.bannerImageUrl ?? "");
  const [theme, setTheme] = useState<StorefrontTheme>(storefront.theme);
  const [font, setFont] = useState<StorefrontFont>(storefront.font);
  const [buttonStyle, setButtonStyle] = useState<StorefrontButtonStyle>(storefront.buttonStyle);
  const [cornerStyle, setCornerStyle] = useState<StorefrontCornerStyle>(storefront.cornerStyle);
  const [headerStyle, setHeaderStyle] = useState<StorefrontHeaderStyle>(storefront.headerStyle);
  const [footerStyle, setFooterStyle] = useState<StorefrontFooterStyle>(storefront.footerStyle);
  const [darkMode, setDarkMode] = useState(storefront.darkMode);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(storefront.socialLinks ?? {});
  // Tracking pixel IDs are edited from Ads → Account & Tracking now; carried through unchanged so saving other fields here doesn't wipe them.
  const trackingIds = storefront.trackingIds ?? {};
  const [seoTitle, setSeoTitle] = useState(storefront.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(storefront.seoDescription ?? "");
  const [sections, setSections] = useState<string[]>(storefront.sections);
  const [privacyPolicyText, setPrivacyPolicyText] = useState(storefront.privacyPolicyText ?? "");
  const [termsText, setTermsText] = useState(storefront.termsText ?? "");
  const [announcementBarText, setAnnouncementBarText] = useState(storefront.announcementBarText ?? "");
  const [announcementBarLink, setAnnouncementBarLink] = useState(storefront.announcementBarLink ?? "");
  const [popupEnabled, setPopupEnabled] = useState(storefront.popupEnabled);
  const [popupTitle, setPopupTitle] = useState(storefront.popupTitle ?? "");
  const [popupMessage, setPopupMessage] = useState(storefront.popupMessage ?? "");
  const [popupButtonText, setPopupButtonText] = useState(storefront.popupButtonText ?? "");
  const [popupButtonLink, setPopupButtonLink] = useState(storefront.popupButtonLink ?? "");
  const [popupTrigger, setPopupTrigger] = useState<StorefrontPopupTrigger>(storefront.popupTrigger);
  const [popupDelaySeconds, setPopupDelaySeconds] = useState(storefront.popupDelaySeconds);
  const [isSaving, setIsSaving] = useState(false);
  const [slugValue, setSlugValue] = useState(slug);
  const [isSavingSlug, setIsSavingSlug] = useState(false);
  const [contentLocale, setContentLocale] = useState<(typeof CONTENT_LOCALES)[number]>("en");
  const [translations, setTranslations] = useState<StorefrontTranslations>(storefront.translations ?? {});

  const hiddenSections = ALL_SECTION_KEYS.filter((key) => !sections.includes(key));

  function toggleSection(key: string) {
    setSections((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  }

  function moveSection(index: number, direction: -1 | 1) {
    setSections((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function contentFieldValue(field: "heroTitle" | "heroSubtitle" | "aboutText"): string {
    if (contentLocale === "en") return field === "heroTitle" ? heroTitle : field === "heroSubtitle" ? heroSubtitle : aboutText;
    return translations[contentLocale]?.[field] ?? "";
  }

  function setContentFieldValue(field: "heroTitle" | "heroSubtitle" | "aboutText", value: string) {
    if (contentLocale === "en") {
      if (field === "heroTitle") setHeroTitle(value);
      else if (field === "heroSubtitle") setHeroSubtitle(value);
      else setAboutText(value);
      return;
    }
    setTranslations((current) => ({ ...current, [contentLocale]: { ...current[contentLocale], [field]: value } }));
  }

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
      secondaryColor: secondaryColor || undefined,
      faviconUrl: faviconUrl || undefined,
      bannerImageUrl: bannerImageUrl || undefined,
      theme,
      font,
      buttonStyle,
      cornerStyle,
      headerStyle,
      footerStyle,
      darkMode,
      socialLinks,
      trackingIds,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
      translations,
      sections,
      privacyPolicyText: privacyPolicyText || undefined,
      termsText: termsText || undefined,
      announcementBarText: announcementBarText || undefined,
      announcementBarLink: announcementBarLink || undefined,
      popupEnabled,
      popupTitle: popupTitle || undefined,
      popupMessage: popupMessage || undefined,
      popupButtonText: popupButtonText || undefined,
      popupButtonLink: popupButtonLink || undefined,
      popupTrigger,
      popupDelaySeconds,
    });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(t("saved"));
  }

  async function handleSaveSlug() {
    setIsSavingSlug(true);
    const result = await updateSlugAction({ slug: slugValue });
    setIsSavingSlug(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setSlugValue(result.data.slug);
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
          <p className="text-sm font-medium">{t("urlHeading")}</p>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <label className="text-sm text-muted-foreground">{t("urlLabel")}</label>
              <Input value={slugValue} onChange={(event) => setSlugValue(event.target.value)} />
            </div>
            <Button type="button" variant="outline" disabled={isSavingSlug || slugValue === slug} onClick={handleSaveSlug}>
              {isSavingSlug ? t("saving") : t("save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{t("contentHeading")}</p>
            <div className="flex gap-1">
              {CONTENT_LOCALES.map((locale) => (
                <button
                  key={locale}
                  type="button"
                  onClick={() => setContentLocale(locale)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs",
                    contentLocale === locale ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {CONTENT_LOCALE_LABELS[locale]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t("heroTitleLabel")}</label>
            <Input
              value={contentFieldValue("heroTitle")}
              onChange={(event) => setContentFieldValue("heroTitle", event.target.value)}
              placeholder={t("heroTitlePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t("heroSubtitleLabel")}</label>
            <Input
              value={contentFieldValue("heroSubtitle")}
              onChange={(event) => setContentFieldValue("heroSubtitle", event.target.value)}
              placeholder={t("heroSubtitlePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t("aboutLabel")}</label>
            <Textarea
              value={contentFieldValue("aboutText")}
              onChange={(event) => setContentFieldValue("aboutText", event.target.value)}
              rows={4}
              placeholder={t("aboutPlaceholder")}
            />
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">{t("brandingHeading")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ColorField label={t("colorLabel")} value={primaryColor} onChange={setPrimaryColor} />
            <ColorField label={t("secondaryColorLabel")} value={secondaryColor} onChange={setSecondaryColor} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("faviconLabel")}</label>
              <Input value={faviconUrl} onChange={(event) => setFaviconUrl(event.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("bannerLabel")}</label>
              <Input value={bannerImageUrl} onChange={(event) => setBannerImageUrl(event.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("themeLabel")}</label>
              <Select value={theme} onValueChange={(value) => setTheme(value as StorefrontTheme)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEMES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`themes.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("fontLabel")}</label>
              <Select value={font} onValueChange={(value) => setFont(value as StorefrontFont)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`fonts.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("buttonStyleLabel")}</label>
              <Select value={buttonStyle} onValueChange={(value) => setButtonStyle(value as StorefrontButtonStyle)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUTTON_STYLES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`buttonStyles.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("cornerStyleLabel")}</label>
              <Select value={cornerStyle} onValueChange={(value) => setCornerStyle(value as StorefrontCornerStyle)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CORNER_STYLES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`cornerStyles.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("headerStyleLabel")}</label>
              <Select value={headerStyle} onValueChange={(value) => setHeaderStyle(value as StorefrontHeaderStyle)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HEADER_STYLES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`headerStyles.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("footerStyleLabel")}</label>
              <Select value={footerStyle} onValueChange={(value) => setFooterStyle(value as StorefrontFooterStyle)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOOTER_STYLES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`footerStyles.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-3">
            <p className="text-sm text-muted-foreground">{t("darkModeLabel")}</p>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">{t("socialHeading")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SOCIAL_KEYS.map((key) => (
              <div key={key} className="space-y-2">
                <label className="text-sm text-muted-foreground">{t(`social.${key}`)}</label>
                <Input
                  value={socialLinks[key] ?? ""}
                  onChange={(event) => setSocialLinks((current) => ({ ...current, [key]: event.target.value }))}
                  placeholder="https://..."
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">{t("seoHeading")}</p>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t("seoTitleLabel")}</label>
            <Input value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} maxLength={70} />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t("seoDescriptionLabel")}</label>
            <Textarea value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} rows={2} maxLength={200} />
          </div>
          <p className="text-xs text-muted-foreground">{t("trackingMovedHint")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">{t("sectionsHeading")}</p>
          <p className="text-xs text-muted-foreground">{t("sectionsHint")}</p>
          <div className="divide-y rounded-lg border">
            {sections.map((key, index) => (
              <div key={key} className="flex items-center justify-between gap-2 p-2">
                <span className="text-sm">{t(`sections.${key}`)}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveSection(index, -1)}
                    className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === sections.length - 1}
                    onClick={() => moveSection(index, 1)}
                    className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSection(key)}
                    className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    {t("hideSection")}
                  </button>
                </div>
              </div>
            ))}
            {hiddenSections.map((key) => (
              <div key={key} className="flex items-center justify-between gap-2 p-2 opacity-60">
                <span className="text-sm">{t(`sections.${key}`)}</span>
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className="rounded px-2 py-1 text-xs text-primary hover:underline"
                >
                  {t("showSection")}
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">{t("legalHeading")}</p>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t("privacyLabel")}</label>
            <Textarea value={privacyPolicyText} onChange={(event) => setPrivacyPolicyText(event.target.value)} rows={4} />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t("termsLabel")}</label>
            <Textarea value={termsText} onChange={(event) => setTermsText(event.target.value)} rows={4} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">{t("promotionsHeading")}</p>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t("announcementBarLabel")}</label>
            <Input
              value={announcementBarText}
              onChange={(event) => setAnnouncementBarText(event.target.value)}
              placeholder={t("announcementBarPlaceholder")}
            />
          </div>
          {announcementBarText && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{t("announcementBarLinkLabel")}</label>
              <Input value={announcementBarLink} onChange={(event) => setAnnouncementBarLink(event.target.value)} placeholder="https://..." />
            </div>
          )}

          <div className="flex items-center justify-between gap-4 border-t pt-3">
            <p className="text-sm font-medium">{t("popupHeading")}</p>
            <Switch checked={popupEnabled} onCheckedChange={setPopupEnabled} />
          </div>
          {popupEnabled && (
            <div className="space-y-2">
              <Input value={popupTitle} onChange={(event) => setPopupTitle(event.target.value)} placeholder={t("popupTitlePlaceholder")} />
              <Textarea
                value={popupMessage}
                onChange={(event) => setPopupMessage(event.target.value)}
                rows={2}
                placeholder={t("popupMessagePlaceholder")}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={popupButtonText}
                  onChange={(event) => setPopupButtonText(event.target.value)}
                  placeholder={t("popupButtonTextPlaceholder")}
                />
                <Input
                  value={popupButtonLink}
                  onChange={(event) => setPopupButtonLink(event.target.value)}
                  placeholder={t("popupButtonLinkPlaceholder")}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">{t("popupTriggerLabel")}</label>
                  <Select value={popupTrigger} onValueChange={(value) => setPopupTrigger(value as StorefrontPopupTrigger)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POPUP_TRIGGERS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {t(`popupTriggers.${option}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {popupTrigger === "delay" && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("popupDelayLabel")}</label>
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      value={popupDelaySeconds}
                      onChange={(event) => setPopupDelaySeconds(Number.parseInt(event.target.value, 10) || 0)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" disabled={isSaving} onClick={handleSave}>
          {isSaving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
