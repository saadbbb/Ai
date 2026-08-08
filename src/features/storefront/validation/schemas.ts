import { z } from "zod";
import {
  storefrontButtonStyleEnum,
  storefrontCornerStyleEnum,
  storefrontFontEnum,
  storefrontFooterStyleEnum,
  storefrontHeaderStyleEnum,
  storefrontPopupTriggerEnum,
  storefrontThemeEnum,
} from "@/db/schema";

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #2563eb.")
  .optional()
  .or(z.literal(""));

const optionalUrl = z.string().trim().url().max(2000).optional().or(z.literal(""));

const SOCIAL_LINK_KEYS = ["whatsapp", "instagram", "facebook", "tiktok", "youtube", "snapchat", "telegram"] as const;
const TRACKING_ID_KEYS = ["metaPixelId", "googleAnalyticsId", "googleTagManagerId", "tiktokPixelId"] as const;
export const SECTION_KEYS = ["hero", "about", "featured", "products", "services", "contact"] as const;

export const updateStorefrontSchema = z.object({
  isPublished: z.boolean(),
  heroTitle: z.string().trim().max(200).optional(),
  heroSubtitle: z.string().trim().max(300).optional(),
  aboutText: z.string().trim().max(2000).optional(),
  contactPhone: z.string().trim().max(30).optional(),
  contactEmail: z.string().trim().email().max(200).optional().or(z.literal("")),
  primaryColor: hexColor,
  faviconUrl: optionalUrl,
  bannerImageUrl: optionalUrl,
  secondaryColor: hexColor,
  font: z.enum(storefrontFontEnum.enumValues),
  buttonStyle: z.enum(storefrontButtonStyleEnum.enumValues),
  cornerStyle: z.enum(storefrontCornerStyleEnum.enumValues),
  headerStyle: z.enum(storefrontHeaderStyleEnum.enumValues),
  footerStyle: z.enum(storefrontFooterStyleEnum.enumValues),
  darkMode: z.boolean(),
  theme: z.enum(storefrontThemeEnum.enumValues),
  socialLinks: z.record(z.enum(SOCIAL_LINK_KEYS), z.string().trim().max(500)).optional(),
  trackingIds: z.record(z.enum(TRACKING_ID_KEYS), z.string().trim().max(200)).optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(200).optional(),
  sections: z.array(z.enum(SECTION_KEYS)),
  privacyPolicyText: z.string().trim().max(20000).optional(),
  termsText: z.string().trim().max(20000).optional(),
  announcementBarText: z.string().trim().max(200).optional(),
  announcementBarLink: optionalUrl,
  popupEnabled: z.boolean(),
  popupTitle: z.string().trim().max(100).optional(),
  popupMessage: z.string().trim().max(500).optional(),
  popupButtonText: z.string().trim().max(50).optional(),
  popupButtonLink: optionalUrl,
  popupTrigger: z.enum(storefrontPopupTriggerEnum.enumValues),
  popupDelaySeconds: z.coerce.number().int().min(0).max(120),
});

export const submitInquirySchema = z.object({
  slug: z.string().trim().min(1),
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(3).max(30),
  message: z.string().trim().min(1).max(2000),
});

export const submitOrderSchema = z.object({
  slug: z.string().trim().min(1),
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(3).max(30),
  deliveryAddress: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .max(50),
});
