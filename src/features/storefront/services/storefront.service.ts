import "server-only";
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
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { leadRepository } from "@/features/crm/repository/lead.repository";
import { automationService } from "@/features/automation/services/automation.service";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { orderService } from "@/features/orders/services/order.service";
import type { OrderListItem } from "@/features/orders/repository/order.repository";
import { AppError } from "@/lib/errors/app-error";
import { storefrontRepository } from "../repository/storefront.repository";

interface StorefrontInput {
  isPublished: boolean;
  heroTitle?: string;
  heroSubtitle?: string;
  aboutText?: string;
  contactPhone?: string;
  contactEmail?: string;
  primaryColor?: string;
  faviconUrl?: string;
  bannerImageUrl?: string;
  secondaryColor?: string;
  font: StorefrontFont;
  buttonStyle: StorefrontButtonStyle;
  cornerStyle: StorefrontCornerStyle;
  headerStyle: StorefrontHeaderStyle;
  footerStyle: StorefrontFooterStyle;
  darkMode: boolean;
  theme: StorefrontTheme;
  socialLinks?: Record<string, string>;
  trackingIds?: Record<string, string>;
  seoTitle?: string;
  seoDescription?: string;
  sections: string[];
  privacyPolicyText?: string;
  termsText?: string;
  announcementBarText?: string;
  announcementBarLink?: string;
  popupEnabled: boolean;
  popupTitle?: string;
  popupMessage?: string;
  popupButtonText?: string;
  popupButtonLink?: string;
  popupTrigger: StorefrontPopupTrigger;
  popupDelaySeconds: number;
}

interface InquiryInput {
  fullName: string;
  phone: string;
  message: string;
}

/** One row per workspace, created on first visit to the editor — same check-then-create pattern as ai_agents. */
async function getOrCreateForWorkspace(workspaceId: string): Promise<Storefront> {
  const existing = await storefrontRepository.findByWorkspaceId(workspaceId);
  if (existing) return existing;
  return storefrontRepository.create({ workspaceId });
}

/** Drops blank values from a link/tracking-id map so an untouched field never overwrites a real one with "". */
function pruneBlank(map: Record<string, string> | undefined): Record<string, string> {
  if (!map) return {};
  return Object.fromEntries(Object.entries(map).filter(([, value]) => value.trim() !== ""));
}

async function updateStorefront(workspaceId: string, input: StorefrontInput): Promise<Storefront> {
  const existing = await getOrCreateForWorkspace(workspaceId);
  const updated = await storefrontRepository.update(existing.id, workspaceId, {
    isPublished: input.isPublished,
    heroTitle: input.heroTitle || null,
    heroSubtitle: input.heroSubtitle || null,
    aboutText: input.aboutText || null,
    contactPhone: input.contactPhone || null,
    contactEmail: input.contactEmail || null,
    primaryColor: input.primaryColor || null,
    faviconUrl: input.faviconUrl || null,
    bannerImageUrl: input.bannerImageUrl || null,
    secondaryColor: input.secondaryColor || null,
    font: input.font,
    buttonStyle: input.buttonStyle,
    cornerStyle: input.cornerStyle,
    headerStyle: input.headerStyle,
    footerStyle: input.footerStyle,
    darkMode: input.darkMode,
    theme: input.theme,
    socialLinks: pruneBlank(input.socialLinks),
    trackingIds: pruneBlank(input.trackingIds),
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
    sections: input.sections,
    privacyPolicyText: input.privacyPolicyText || null,
    termsText: input.termsText || null,
    announcementBarText: input.announcementBarText || null,
    announcementBarLink: input.announcementBarLink || null,
    popupEnabled: input.popupEnabled,
    popupTitle: input.popupTitle || null,
    popupMessage: input.popupMessage || null,
    popupButtonText: input.popupButtonText || null,
    popupButtonLink: input.popupButtonLink || null,
    popupTrigger: input.popupTrigger,
    popupDelaySeconds: input.popupDelaySeconds,
  });
  return updated ?? existing;
}

/**
 * The only write path in this app reachable with zero authentication — called
 * from a public Server Action on /store/[slug]. Dedupes by phone (the only
 * reliable identifier a public form collects) so a returning visitor doesn't
 * spawn a duplicate contact every time they inquire. Reuses the same
 * lead_created activity/automation wiring crmService.createLeadFromConversation
 * already established, with `source: "Website"` marking where it came from.
 */
async function submitInquiry(workspaceId: string, input: InquiryInput): Promise<void> {
  let contact = await contactRepository.findByPhone(input.phone, workspaceId);
  if (!contact) {
    contact = await contactRepository.create({
      workspaceId,
      fullName: input.fullName,
      phone: input.phone,
      source: "Website",
    });
  }

  const lead = await leadRepository.create({ workspaceId, contactId: contact.id, conversationId: null });

  await activityRepository.log({
    workspaceId,
    contactId: contact.id,
    type: "lead_created",
    actor: { type: "system" },
    summary: `Inquiry submitted via the storefront: "${input.message}"`,
  });

  await automationService.dispatch(workspaceId, { type: "lead_created", contactId: lead.contactId });
}

interface OrderCartItemInput {
  productId: string;
  quantity: number;
}

interface OrderInput {
  fullName: string;
  phone: string;
  deliveryAddress?: string;
  notes?: string;
  items: OrderCartItemInput[];
}

/**
 * The Order System / Order Flow depth (PART 13 gaps #134/#135) — a real Order
 * entity, not just a Lead like submitInquiry above. Never trusts a
 * client-supplied price: every cart line is re-matched against the live,
 * active catalog server-side and priced from there (same rule as the AI's own
 * create_order tool), so a tampered request can't check out at an invented
 * price.
 */
async function submitOrder(workspaceId: string, input: OrderInput): Promise<OrderListItem> {
  if (input.items.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Your cart is empty.");
  }

  const catalog = await productRepository.findByWorkspaceId(workspaceId);
  const orderItems = input.items.map((item) => {
    const product = catalog.find((candidate) => candidate.id === item.productId && candidate.isActive);
    if (!product) {
      throw new AppError("VALIDATION_ERROR", "One of the items in your cart is no longer available.");
    }
    const unitPrice = product.discountedPrice ?? product.price;
    if (!unitPrice) {
      throw new AppError("VALIDATION_ERROR", `"${product.name}" doesn't have a price set yet.`);
    }
    return { productId: product.id, name: product.name, unitPrice, quantity: item.quantity };
  });

  let contact = await contactRepository.findByPhone(input.phone, workspaceId);
  if (!contact) {
    contact = await contactRepository.create({
      workspaceId,
      fullName: input.fullName,
      phone: input.phone,
      source: "Website",
      address: input.deliveryAddress || null,
    });
  }

  return orderService.createOrder(
    workspaceId,
    {
      contactId: contact.id,
      items: orderItems,
      notes: input.notes,
      deliveryAddress: input.deliveryAddress,
      deliveryMethod: "delivery",
    },
    { type: "system" },
  );
}

export const storefrontService = {
  getOrCreateForWorkspace,
  updateStorefront,
  submitInquiry,
  submitOrder,
};
