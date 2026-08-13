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
const translationSchema = z.object({
  heroTitle: z.string().trim().max(200).optional(),
  heroSubtitle: z.string().trim().max(300).optional(),
  aboutText: z.string().trim().max(2000).optional(),
});

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #2563eb.")
  .optional()
  .or(z.literal(""));

const optionalUrl = z.string().trim().url().max(2000).optional().or(z.literal(""));

const SOCIAL_LINK_KEYS = ["whatsapp", "instagram", "facebook", "tiktok", "youtube", "snapchat", "telegram"] as const;
const TRACKING_ID_KEYS = ["metaPixelId", "googleAnalyticsId", "googleTagManagerId", "tiktokPixelId"] as const;
export const SECTION_KEYS = ["hero", "about", "featured", "products", "services", "testimonials", "contact"] as const;

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
  socialLinks: z.partialRecord(z.enum(SOCIAL_LINK_KEYS), z.string().trim().max(500)).optional(),
  trackingIds: z.partialRecord(z.enum(TRACKING_ID_KEYS), z.string().trim().max(200)).optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(200).optional(),
  heroCtaLabel: z.string().trim().max(50).optional(),
  heroCtaLink: z.string().trim().max(2000).optional(),
  translations: z.partialRecord(z.enum(["ar", "ku"]), translationSchema).optional(),
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
  formType: z.enum(["contact", "quote", "support"]).optional(),
});

export const submitAppointmentRequestSchema = z.object({
  slug: z.string().trim().min(1),
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(3).max(30),
  serviceId: z.string().uuid().optional(),
  preferredAt: z.coerce.date().min(new Date()),
  notes: z.string().trim().max(1000).optional(),
});

export const subscribeNewsletterSchema = z.object({
  slug: z.string().trim().min(1),
  email: z.string().trim().email().max(200),
});

export const saveReviewSchema = z.object({
  id: z.string().uuid().optional(),
  authorName: z.string().trim().min(1).max(200),
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(1).max(2000),
  isFeatured: z.boolean(),
  isPublished: z.boolean(),
});

export const deleteReviewSchema = z.object({
  id: z.string().uuid(),
});

export const saveBlogPostSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(100).optional(),
  excerpt: z.string().trim().max(300).optional(),
  content: z.string().trim().min(1).max(20000),
  coverImageUrl: optionalUrl,
  isPublished: z.boolean(),
});

export const deleteBlogPostSchema = z.object({
  id: z.string().uuid(),
});

export const generateBlogDraftSchema = z.object({
  topic: z.string().trim().min(3).max(300),
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
