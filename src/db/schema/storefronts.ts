import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

/** A curated, real (not exhaustive-11-theme) set of visually distinct storefront layouts — see the public store page's theme components. */
export const storefrontThemeEnum = pgEnum("storefront_theme", ["modern", "minimal", "classic", "bold"]);
export const storefrontFontEnum = pgEnum("storefront_font", ["inter", "poppins", "playfair", "roboto_mono"]);
export const storefrontButtonStyleEnum = pgEnum("storefront_button_style", ["rounded", "square", "pill"]);
export const storefrontCornerStyleEnum = pgEnum("storefront_corner_style", ["sharp", "soft", "round"]);
export const storefrontHeaderStyleEnum = pgEnum("storefront_header_style", ["standard", "centered", "minimal"]);
export const storefrontFooterStyleEnum = pgEnum("storefront_footer_style", ["standard", "minimal"]);
/** Popup Builder depth (PART 13 gap #139), scoped to a single configurable popup rather than a full multi-popup builder. */
export const storefrontPopupTriggerEnum = pgEnum("storefront_popup_trigger", ["first_visit", "delay", "exit_intent"]);
/** How the public store lays out its product grids/sections — merchant-controlled, see storefront-editor.tsx's appearance tab. */
export const storefrontProductDisplayModeEnum = pgEnum("storefront_product_display_mode", ["grid", "list", "full"]);
/** "none" until a domain is entered; "pending" until Vercel's DNS check passes; "failed" is surfaced so the owner can re-check. */
export const storefrontCustomDomainStatusEnum = pgEnum("storefront_custom_domain_status", [
  "none",
  "pending",
  "verified",
  "failed",
]);

/**
 * One published storefront per workspace, reachable at /store/[workspaces.slug]
 * with zero auth (see src/middleware.ts's matcher — /store isn't in it, so it's
 * public by omission, same as /invitations/accept). Reads products/services
 * live from the existing catalog tables rather than duplicating them — a
 * storefront is a public *view* onto data that already exists, not a second
 * source of truth. One row per workspace, enforced app-side (check-then-create,
 * same pattern as ai_agents) rather than a DB unique constraint, so a future
 * multi-page/multi-theme site doesn't need a breaking migration.
 */
export const storefronts = pgTable(
  "storefronts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    isPublished: boolean("is_published").notNull().default(false),
    heroTitle: text("hero_title"),
    heroSubtitle: text("hero_subtitle"),
    aboutText: text("about_text"),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    primaryColor: text("primary_color"),
    // Website Customization depth (PART 13 gap #126) — logo/business name/slug
    // stay on `workspaces` (already editable at workspace-profile / this
    // storefront's own "Store URL" section), everything storefront-specific
    // lives here.
    faviconUrl: text("favicon_url"),
    bannerImageUrl: text("banner_image_url"),
    secondaryColor: text("secondary_color"),
    font: storefrontFontEnum("font").notNull().default("inter"),
    buttonStyle: storefrontButtonStyleEnum("button_style").notNull().default("rounded"),
    cornerStyle: storefrontCornerStyleEnum("corner_style").notNull().default("soft"),
    headerStyle: storefrontHeaderStyleEnum("header_style").notNull().default("standard"),
    footerStyle: storefrontFooterStyleEnum("footer_style").notNull().default("standard"),
    darkMode: boolean("dark_mode").notNull().default(false),
    theme: storefrontThemeEnum("theme").notNull().default("modern"),
    // { whatsapp?, instagram?, facebook?, tiktok?, youtube?, snapchat?, telegram? } —
    // phone/email already exist above as contactPhone/contactEmail, covering
    // the reference spec's 8 social-link types without 7 more flat columns.
    socialLinks: jsonb("social_links").$type<Record<string, string>>().notNull().default({}),
    // { metaPixelId?, googleAnalyticsId?, googleTagManagerId?, tiktokPixelId? } —
    // pasted in by the workspace owner, no external account needed on this
    // app's side (see #142 in FEATURE_COMPARISON — config fields only, actual
    // pixel verification is the owner's own Meta/Google/TikTok account).
    trackingIds: jsonb("tracking_ids").$type<Record<string, string>>().notNull().default({}),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    // Auto-generated on storefront creation from business type/name (see
    // generate-defaults.ts) — the hero previously had no CTA at all.
    heroCtaLabel: text("hero_cta_label"),
    heroCtaLink: text("hero_cta_link"),
    // Custom domain connection (Vercel Domains API) — app-enforced unique like slug.
    // verificationToken is the TXT record value Vercel issues on connect.
    customDomain: text("custom_domain"),
    customDomainStatus: storefrontCustomDomainStatusEnum("custom_domain_status").notNull().default("none"),
    customDomainVerificationToken: text("custom_domain_verification_token"),
    customDomainVerifiedAt: timestamp("custom_domain_verified_at", { withTimezone: true }),
    // Multi-language storefront content (PART 13 gap #145) — heroTitle/
    // heroSubtitle/aboutText above are the default-locale ("en") copy; this
    // holds per-locale overrides for every OTHER configured locale (ar/ku),
    // keyed by locale code. Scoped to the storefront's own editorial text —
    // product/service names and legal pages stay single-locale, since making
    // the whole catalog multi-locale would ripple into orders, the AI tools,
    // and every place a product name is stored as a plain string snapshot.
    translations: jsonb("translations")
      .$type<Record<string, { heroTitle?: string; heroSubtitle?: string; aboutText?: string }>>()
      .notNull()
      .default({}),
    // Ordered, visible section keys for the home page (Section Builder depth,
    // scoped to a curated real subset with up/down reordering in the editor
    // rather than a full drag-and-drop 14-section builder — see
    // storefront-editor.tsx). A key's absence means hidden.
    sections: jsonb("sections").$type<string[]>().notNull().default(["hero", "about", "products", "services", "contact"]),
    privacyPolicyText: text("privacy_policy_text"),
    termsText: text("terms_text"),
    // Promotions depth (PART 13 gap #138) — a single dismissible top bar, e.g.
    // "Free shipping over $50" or a sale announcement. Optional link makes it
    // clickable (e.g. to the on-sale filter).
    announcementBarText: text("announcement_bar_text"),
    announcementBarLink: text("announcement_bar_link"),
    popupEnabled: boolean("popup_enabled").notNull().default(false),
    popupTitle: text("popup_title"),
    popupMessage: text("popup_message"),
    popupButtonText: text("popup_button_text"),
    popupButtonLink: text("popup_button_link"),
    popupTrigger: storefrontPopupTriggerEnum("popup_trigger").notNull().default("delay"),
    popupDelaySeconds: integer("popup_delay_seconds").notNull().default(5),
    // Modern-storefront redesign — merchant-controlled product layout + visibility toggles,
    // deliberately kept to this short list (see storefront-editor.tsx's appearance tab).
    productDisplayMode: storefrontProductDisplayModeEnum("product_display_mode").notNull().default("grid"),
    showProductDescription: boolean("show_product_description").notNull().default(true),
    showComparePrice: boolean("show_compare_price").notNull().default(true),
    showCategories: boolean("show_categories").notNull().default(true),
    showSearch: boolean("show_search").notNull().default(true),
    showFooter: boolean("show_footer").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("storefronts_workspace_id_idx").on(table.workspaceId)],
);

export type Storefront = typeof storefronts.$inferSelect;
export type NewStorefront = typeof storefronts.$inferInsert;
export type StorefrontTheme = (typeof storefrontThemeEnum.enumValues)[number];
export type StorefrontFont = (typeof storefrontFontEnum.enumValues)[number];
export type StorefrontButtonStyle = (typeof storefrontButtonStyleEnum.enumValues)[number];
export type StorefrontCornerStyle = (typeof storefrontCornerStyleEnum.enumValues)[number];
export type StorefrontHeaderStyle = (typeof storefrontHeaderStyleEnum.enumValues)[number];
export type StorefrontFooterStyle = (typeof storefrontFooterStyleEnum.enumValues)[number];
export type StorefrontPopupTrigger = (typeof storefrontPopupTriggerEnum.enumValues)[number];
export type StorefrontCustomDomainStatus = (typeof storefrontCustomDomainStatusEnum.enumValues)[number];
export type StorefrontProductDisplayMode = (typeof storefrontProductDisplayModeEnum.enumValues)[number];
