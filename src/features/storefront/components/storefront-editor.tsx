"use client";

import { LayoutGrid, List, Rows3 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  StorefrontProductDisplayMode,
  StorefrontTheme,
} from "@/db/schema";
import { updateSlugAction } from "@/features/workspace/actions/update-slug.action";
import { connectCustomDomainAction } from "../actions/connect-custom-domain.action";
import { removeCustomDomainAction } from "../actions/remove-custom-domain.action";
import { updateStorefrontAction } from "../actions/update-storefront.action";
import { verifyCustomDomainAction } from "../actions/verify-custom-domain.action";

const THEMES: StorefrontTheme[] = ["modern", "minimal", "classic", "bold"];
const FONTS: StorefrontFont[] = ["inter", "poppins", "playfair", "roboto_mono"];
const BUTTON_STYLES: StorefrontButtonStyle[] = ["rounded", "square", "pill"];
const CORNER_STYLES: StorefrontCornerStyle[] = ["sharp", "soft", "round"];
const HEADER_STYLES: StorefrontHeaderStyle[] = ["standard", "centered", "minimal"];
const FOOTER_STYLES: StorefrontFooterStyle[] = ["standard", "minimal"];
const POPUP_TRIGGERS: StorefrontPopupTrigger[] = ["first_visit", "delay", "exit_intent"];
const SOCIAL_KEYS = ["whatsapp", "instagram", "facebook", "tiktok", "youtube", "snapchat", "telegram", "twitter"] as const;
const ALL_SECTION_KEYS = ["hero", "about", "featured", "products", "services", "testimonials"] as const;
const TRACKING_KEYS = ["metaPixelId", "googleAnalyticsId", "googleTagManagerId", "tiktokPixelId"] as const;
const CONTENT_LOCALES = ["en", "ar", "ku"] as const;
const CONTENT_LOCALE_LABELS: Record<(typeof CONTENT_LOCALES)[number], string> = { en: "English", ar: "العربية", ku: "کوردی" };
const PRODUCT_DISPLAY_MODES: StorefrontProductDisplayMode[] = ["grid", "list", "full"];
const PRODUCT_DISPLAY_MODE_ICONS: Record<StorefrontProductDisplayMode, typeof LayoutGrid> = {
  grid: LayoutGrid,
  list: List,
  full: Rows3,
};
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
  logoUrl,
  onSaved,
}: {
  storefront: Storefront;
  storeUrl: string;
  slug: string;
  logoUrl: string | null;
  onSaved?: () => void;
}) {
  const t = useTranslations("website");
  const [isPublished, setIsPublished] = useState(storefront.isPublished);
  const [heroTitle, setHeroTitle] = useState(storefront.heroTitle ?? "");
  const [heroSubtitle, setHeroSubtitle] = useState(storefront.heroSubtitle ?? "");
  const [heroCtaLabel, setHeroCtaLabel] = useState(storefront.heroCtaLabel ?? "");
  const [heroCtaLink, setHeroCtaLink] = useState(storefront.heroCtaLink ?? "");
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
  const [trackingIds, setTrackingIds] = useState<Record<string, string>>(storefront.trackingIds ?? {});
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
  const [domainInput, setDomainInput] = useState("");
  const [customDomain, setCustomDomain] = useState(storefront.customDomain ?? "");
  const [domainStatus, setDomainStatus] = useState(storefront.customDomainStatus);
  const [dnsRecord, setDnsRecord] = useState<{ type: string; name: string; value: string } | null>(null);
  const [isConnectingDomain, setIsConnectingDomain] = useState(false);
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [isRemovingDomain, setIsRemovingDomain] = useState(false);
  const [contentLocale, setContentLocale] = useState<(typeof CONTENT_LOCALES)[number]>("en");
  const [translations, setTranslations] = useState<StorefrontTranslations>(storefront.translations ?? {});
  const [productDisplayMode, setProductDisplayMode] = useState<StorefrontProductDisplayMode>(storefront.productDisplayMode);
  const [showProductDescription, setShowProductDescription] = useState(storefront.showProductDescription);
  const [showComparePrice, setShowComparePrice] = useState(storefront.showComparePrice);
  const [showCategories, setShowCategories] = useState(storefront.showCategories);
  const [showSearch, setShowSearch] = useState(storefront.showSearch);
  const [showFooter, setShowFooter] = useState(storefront.showFooter);

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
      heroCtaLabel: heroCtaLabel || undefined,
      heroCtaLink: heroCtaLink || undefined,
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
      productDisplayMode,
      showProductDescription,
      showComparePrice,
      showCategories,
      showSearch,
      showFooter,
    });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(t("saved"));
    onSaved?.();
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

  async function handleConnectDomain() {
    setIsConnectingDomain(true);
    const result = await connectCustomDomainAction({ domain: domainInput });
    setIsConnectingDomain(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setCustomDomain(domainInput);
    setDomainStatus(result.data.status as typeof domainStatus);
    setDnsRecord(result.data.record);
    setDomainInput("");
  }

  async function handleVerifyDomain() {
    setIsVerifyingDomain(true);
    const result = await verifyCustomDomainAction();
    setIsVerifyingDomain(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setDomainStatus(result.data.status);
    if (result.data.status === "verified") setDnsRecord(null);
  }

  async function handleRemoveDomain() {
    setIsRemovingDomain(true);
    const result = await removeCustomDomainAction();
    setIsRemovingDomain(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setCustomDomain("");
    setDomainStatus("none");
    setDnsRecord(null);
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="publish">
        <TabsList>
          <TabsTrigger value="publish">{t("subTabs.publish")}</TabsTrigger>
          <TabsTrigger value="appearance">{t("subTabs.appearance")}</TabsTrigger>
          <TabsTrigger value="sections">{t("subTabs.sections")}</TabsTrigger>
          <TabsTrigger value="tracking">{t("subTabs.tracking")}</TabsTrigger>
          <TabsTrigger value="advanced">{t("subTabs.advanced")}</TabsTrigger>
        </TabsList>

        <TabsContent value="publish" className="space-y-4 pt-4">
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
              <div>
                <p className="text-sm font-medium">{t("customDomainLabel")}</p>
                <p className="text-xs text-muted-foreground">{t("customDomainHint")}</p>
              </div>

              {customDomain ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-input p-2">
                    <div>
                      <p className="text-sm font-medium">{customDomain}</p>
                      <p className="text-xs text-muted-foreground">{t(`domainStatus.${domainStatus}`)}</p>
                    </div>
                    <div className="flex gap-1">
                      {domainStatus !== "verified" && (
                        <Button type="button" variant="outline" size="sm" disabled={isVerifyingDomain} onClick={handleVerifyDomain}>
                          {t("verifyDomain")}
                        </Button>
                      )}
                      <Button type="button" variant="ghost" size="sm" disabled={isRemovingDomain} onClick={handleRemoveDomain}>
                        {t("removeDomain")}
                      </Button>
                    </div>
                  </div>
                  {dnsRecord && domainStatus !== "verified" && (
                    <div className="space-y-1 rounded-lg bg-surface-elevated p-3 text-xs">
                      <p className="text-muted-foreground">{t("domainDnsInstructions")}</p>
                      <p className="font-mono">
                        {dnsRecord.type} · {dnsRecord.name} → {dnsRecord.value}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    <Input value={domainInput} onChange={(event) => setDomainInput(event.target.value)} placeholder={t("customDomainPlaceholder")} />
                  </div>
                  <Button type="button" variant="outline" disabled={isConnectingDomain || !domainInput.trim()} onClick={handleConnectDomain}>
                    {t("connectDomain")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4 pt-4">
          <Card>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium">{t("logoLabel")}</p>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="size-12 rounded-lg border border-input object-cover" />
                ) : (
                  <div className="size-12 rounded-lg border border-dashed border-input" />
                )}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("logoManagedHint")}</p>
                  <Link href="/dashboard/workspace-profile" className="text-xs font-medium text-primary hover:underline">
                    {t("manageLogoLink")}
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium">{t("productDisplayModeLabel")}</p>
              <div className="grid grid-cols-3 gap-2">
                {PRODUCT_DISPLAY_MODES.map((mode) => {
                  const Icon = PRODUCT_DISPLAY_MODE_ICONS[mode];
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setProductDisplayMode(mode)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors",
                        productDisplayMode === mode
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-input text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <Icon className="size-5" />
                      {t(`productDisplayModes.${mode}`)}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <ColorField label={t("colorLabel")} value={primaryColor} onChange={setPrimaryColor} />
                <ColorField label={t("accentColorLabel")} value={secondaryColor} onChange={setSecondaryColor} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
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
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">{t("cardShapeLabel")}</label>
                <Select value={cornerStyle} onValueChange={(value) => setCornerStyle(value as StorefrontCornerStyle)}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CORNER_STYLES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {t(`cardShapes.${option}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1">
              <p className="pb-2 text-sm font-medium">{t("displayTogglesHeading")}</p>
              <div className="flex items-center justify-between gap-4 py-2">
                <p className="text-sm text-muted-foreground">{t("showProductDescriptionLabel")}</p>
                <Switch checked={showProductDescription} onCheckedChange={setShowProductDescription} />
              </div>
              <div className="flex items-center justify-between gap-4 border-t py-2">
                <p className="text-sm text-muted-foreground">{t("showComparePriceLabel")}</p>
                <Switch checked={showComparePrice} onCheckedChange={setShowComparePrice} />
              </div>
              <div className="flex items-center justify-between gap-4 border-t py-2">
                <p className="text-sm text-muted-foreground">{t("showCategoriesLabel")}</p>
                <Switch checked={showCategories} onCheckedChange={setShowCategories} />
              </div>
              <div className="flex items-center justify-between gap-4 border-t py-2">
                <p className="text-sm text-muted-foreground">{t("showSearchLabel")}</p>
                <Switch checked={showSearch} onCheckedChange={setShowSearch} />
              </div>
              <div className="flex items-center justify-between gap-4 border-t py-2">
                <p className="text-sm text-muted-foreground">{t("showFooterLabel")}</p>
                <Switch checked={showFooter} onCheckedChange={setShowFooter} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sections" className="space-y-4 pt-4">
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
              {contentLocale === "en" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("heroCtaLabelLabel")}</label>
                    <Input value={heroCtaLabel} onChange={(event) => setHeroCtaLabel(event.target.value)} placeholder={t("heroCtaLabelPlaceholder")} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">{t("heroCtaLinkLabel")}</label>
                    <Input value={heroCtaLink} onChange={(event) => setHeroCtaLink(event.target.value)} placeholder="/products" />
                  </div>
                </div>
              )}
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
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4 pt-4">
          <Card>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium">{t("trackingHeading")}</p>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 pt-4">
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
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium">{t("advancedAppearanceHeading")}</p>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">{t("themeLabel")}</label>
                <Select value={theme} onValueChange={(value) => setTheme(value as StorefrontTheme)}>
                  <SelectTrigger className="w-full sm:w-56">
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
              <div className="grid gap-2 sm:grid-cols-2">
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
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button type="button" disabled={isSaving} onClick={handleSave}>
          {isSaving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
