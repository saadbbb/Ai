import "server-only";
import type {
  Storefront,
  StorefrontButtonStyle,
  StorefrontCornerStyle,
  StorefrontCustomDomainStatus,
  StorefrontFont,
  StorefrontFooterStyle,
  StorefrontHeaderStyle,
  StorefrontPopupTrigger,
  StorefrontTheme,
} from "@/db/schema";
import type { Contact } from "@/db/schema";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { leadRepository } from "@/features/crm/repository/lead.repository";
import { aiAgentRepository } from "@/features/ai/repository/ai-agent.repository";
import { automationService } from "@/features/automation/services/automation.service";
import { appointmentService } from "@/features/appointments/services/appointment.service";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import { orderService } from "@/features/orders/services/order.service";
import type { OrderListItem } from "@/features/orders/repository/order.repository";
import { workspaceRepository } from "@/features/workspace/repository/workspace.repository";
import { AppError } from "@/lib/errors/app-error";
import { connectDomain, removeDomain, verifyDomain } from "@/lib/vercel/domains-client";
import { defaultSectionsForBusinessType, generateHeroDefaults } from "../lib/generate-defaults";
import { newsletterSubscriberRepository } from "../repository/newsletter-subscriber.repository";
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
  heroCtaLabel?: string;
  heroCtaLink?: string;
  translations?: Record<string, { heroTitle?: string; heroSubtitle?: string; aboutText?: string }>;
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
  formType?: "contact" | "quote" | "support";
}

/** Shared by every public storefront write path — dedupes a visitor by phone within the workspace. */
async function findOrCreateContactByPhone(
  workspaceId: string,
  input: { fullName: string; phone: string; address?: string },
): Promise<Contact> {
  const existing = await contactRepository.findByPhone(input.phone, workspaceId);
  if (existing) return existing;
  return contactRepository.create({
    workspaceId,
    fullName: input.fullName,
    phone: input.phone,
    source: "Website",
    address: input.address || null,
  });
}

/**
 * One row per workspace, created on first visit to the editor — same check-then-create
 * pattern as ai_agents. Seeds the hero/CTA/section-order defaults from data the system
 * already has (business name/type/description) so a brand-new storefront never opens on
 * an empty page — still 100% editable afterward, this only picks better starting values.
 */
async function getOrCreateForWorkspace(workspaceId: string): Promise<Storefront> {
  const existing = await storefrontRepository.findByWorkspaceId(workspaceId);
  if (existing) return existing;

  const [workspace, agent] = await Promise.all([
    workspaceRepository.findById(workspaceId),
    aiAgentRepository.findByWorkspaceId(workspaceId),
  ]);

  if (!workspace) {
    return storefrontRepository.create({ workspaceId });
  }

  const heroDefaults = generateHeroDefaults(workspace, agent);
  return storefrontRepository.create({
    workspaceId,
    heroTitle: heroDefaults.heroTitle,
    heroSubtitle: heroDefaults.heroSubtitle,
    heroCtaLabel: heroDefaults.heroCtaLabel,
    heroCtaLink: heroDefaults.heroCtaLink,
    sections: defaultSectionsForBusinessType(workspace.businessType),
  });
}

/** Drops blank values from a link/tracking-id map so an untouched field never overwrites a real one with "". */
function pruneBlank(map: Record<string, string> | undefined): Record<string, string> {
  if (!map) return {};
  return Object.fromEntries(Object.entries(map).filter(([, value]) => value.trim() !== ""));
}

/** Drops blank fields within each locale override, then drops any locale left with nothing at all. */
function pruneTranslations(
  translations: StorefrontInput["translations"],
): Record<string, { heroTitle?: string; heroSubtitle?: string; aboutText?: string }> {
  if (!translations) return {};
  const result: Record<string, { heroTitle?: string; heroSubtitle?: string; aboutText?: string }> = {};
  for (const [locale, fields] of Object.entries(translations)) {
    const cleaned = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => typeof value === "string" && value.trim() !== ""),
    );
    if (Object.keys(cleaned).length > 0) result[locale] = cleaned;
  }
  return result;
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
    heroCtaLabel: input.heroCtaLabel || null,
    heroCtaLink: input.heroCtaLink || null,
    translations: pruneTranslations(input.translations),
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
const INQUIRY_LABELS: Record<NonNullable<InquiryInput["formType"]>, string> = {
  contact: "Inquiry",
  quote: "Quote request",
  support: "Support request",
};

async function submitInquiry(workspaceId: string, input: InquiryInput): Promise<void> {
  const contact = await findOrCreateContactByPhone(workspaceId, input);
  const lead = await leadRepository.create({ workspaceId, contactId: contact.id, conversationId: null });

  const label = INQUIRY_LABELS[input.formType ?? "contact"];
  await activityRepository.log({
    workspaceId,
    contactId: contact.id,
    type: "lead_created",
    actor: { type: "system" },
    summary: `${label} submitted via the storefront: "${input.message}"`,
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
    if (product.trackQuantity && (product.quantity ?? 0) < item.quantity) {
      throw new AppError("OUT_OF_STOCK", `"${product.name}" is no longer available in that quantity.`);
    }
    const unitPrice = product.discountedPrice ?? product.price;
    if (!unitPrice) {
      throw new AppError("VALIDATION_ERROR", `"${product.name}" doesn't have a price set yet.`);
    }
    return { productId: product.id, name: product.name, unitPrice, quantity: item.quantity };
  });

  const contact = await findOrCreateContactByPhone(workspaceId, {
    fullName: input.fullName,
    phone: input.phone,
    address: input.deliveryAddress,
  });

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

interface AppointmentRequestInput {
  fullName: string;
  phone: string;
  serviceId?: string;
  preferredAt: Date;
  notes?: string;
}

/**
 * Forms depth (PART 13 gap #140) — a public appointment request creates a
 * real Appointment, not a Lead: appointmentService.createAppointment already
 * does contact validation, activity logging, and automation dispatch, so this
 * is a thin wrapper that resolves the optional serviceId to a name/duration
 * first. Lands in the default "scheduled" status, same as any other
 * appointment — staff confirm or reschedule from there.
 */
async function submitAppointmentRequest(workspaceId: string, input: AppointmentRequestInput) {
  const contact = await findOrCreateContactByPhone(workspaceId, input);

  const service = input.serviceId ? await serviceRepository.findById(input.serviceId, workspaceId) : null;

  return appointmentService.createAppointment(
    workspaceId,
    {
      contactId: contact.id,
      serviceId: service?.id,
      serviceName: service?.name,
      scheduledAt: input.preferredAt,
      durationMinutes: service?.durationMinutes ?? 30,
      notes: input.notes,
    },
    { type: "system" },
  );
}

/**
 * Custom domain connection (Vercel Domains API) — same "code ready, needs an external
 * credential" pattern as every other DEFERRED_TASKS.md item; connectDomain/verifyDomain
 * throw a friendly AppError when VERCEL_API_TOKEN/VERCEL_PROJECT_ID aren't configured yet.
 */
async function connectCustomDomain(
  workspaceId: string,
  domain: string,
): Promise<{ status: string; record: { type: string; name: string; value: string } | null }> {
  const existing = await getOrCreateForWorkspace(workspaceId);

  try {
    const result = await connectDomain(domain);
    const status: StorefrontCustomDomainStatus = result.verified ? "verified" : "pending";
    await storefrontRepository.update(existing.id, workspaceId, {
      customDomain: domain,
      customDomainStatus: status,
      customDomainVerificationToken: result.verificationRecord?.value ?? null,
      customDomainVerifiedAt: result.verified ? new Date() : null,
    });
    return { status, record: result.verificationRecord };
  } catch (error) {
    throw new AppError("VALIDATION_ERROR", error instanceof Error ? error.message : "Couldn't connect that domain.");
  }
}

async function verifyCustomDomain(workspaceId: string): Promise<StorefrontCustomDomainStatus> {
  const existing = await getOrCreateForWorkspace(workspaceId);
  if (!existing.customDomain) {
    throw new AppError("VALIDATION_ERROR", "No custom domain is connected yet.");
  }

  try {
    const verified = await verifyDomain(existing.customDomain);
    const status: StorefrontCustomDomainStatus = verified ? "verified" : "failed";
    await storefrontRepository.update(existing.id, workspaceId, {
      customDomainStatus: status,
      customDomainVerifiedAt: verified ? new Date() : null,
    });
    return status;
  } catch (error) {
    throw new AppError("VALIDATION_ERROR", error instanceof Error ? error.message : "Couldn't verify that domain yet.");
  }
}

async function removeCustomDomain(workspaceId: string): Promise<void> {
  const existing = await getOrCreateForWorkspace(workspaceId);
  if (!existing.customDomain) return;

  await removeDomain(existing.customDomain);
  await storefrontRepository.update(existing.id, workspaceId, {
    customDomain: null,
    customDomainStatus: "none",
    customDomainVerificationToken: null,
    customDomainVerifiedAt: null,
  });
}

/** Idempotent — resubscribing with the same email is a silent no-op, not an error. */
async function subscribeToNewsletter(workspaceId: string, email: string): Promise<void> {
  const existing = await newsletterSubscriberRepository.findByWorkspaceAndEmail(workspaceId, email);
  if (existing) return;
  await newsletterSubscriberRepository.create({ workspaceId, email });
}

export const storefrontService = {
  getOrCreateForWorkspace,
  updateStorefront,
  connectCustomDomain,
  verifyCustomDomain,
  removeCustomDomain,
  submitInquiry,
  submitOrder,
  submitAppointmentRequest,
  subscribeToNewsletter,
};
