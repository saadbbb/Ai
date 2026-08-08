import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Contact, Storefront } from "@/db/schema";

vi.mock("../repository/storefront.repository", () => ({
  storefrontRepository: {
    findByWorkspaceId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/features/crm/repository/activity.repository", () => ({
  activityRepository: { log: vi.fn() },
}));

vi.mock("@/features/crm/repository/lead.repository", () => ({
  leadRepository: { create: vi.fn() },
}));

vi.mock("@/features/automation/services/automation.service", () => ({
  automationService: { dispatch: vi.fn() },
}));

vi.mock("@/features/inbox/repository/contact.repository", () => ({
  contactRepository: { findByPhone: vi.fn(), create: vi.fn() },
}));

vi.mock("@/features/knowledge-base/repository/product.repository", () => ({
  productRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/orders/services/order.service", () => ({
  orderService: { createOrder: vi.fn() },
}));

const { storefrontRepository } = await import("../repository/storefront.repository");
const { activityRepository } = await import("@/features/crm/repository/activity.repository");
const { leadRepository } = await import("@/features/crm/repository/lead.repository");
const { automationService } = await import("@/features/automation/services/automation.service");
const { contactRepository } = await import("@/features/inbox/repository/contact.repository");
const { productRepository } = await import("@/features/knowledge-base/repository/product.repository");
const { orderService } = await import("@/features/orders/services/order.service");
const { storefrontService } = await import("./storefront.service");

const WORKSPACE_ID = "workspace-1";

function makeStorefront(overrides: Partial<Storefront> = {}): Storefront {
  return {
    id: "storefront-1",
    workspaceId: WORKSPACE_ID,
    isPublished: false,
    heroTitle: null,
    heroSubtitle: null,
    aboutText: null,
    contactPhone: null,
    contactEmail: null,
    primaryColor: null,
    faviconUrl: null,
    bannerImageUrl: null,
    secondaryColor: null,
    font: "inter",
    buttonStyle: "rounded",
    cornerStyle: "soft",
    headerStyle: "standard",
    footerStyle: "standard",
    darkMode: false,
    theme: "modern",
    socialLinks: {},
    trackingIds: {},
    seoTitle: null,
    seoDescription: null,
    sections: ["hero", "about", "products", "services", "contact"],
    privacyPolicyText: null,
    termsText: null,
    announcementBarText: null,
    announcementBarLink: null,
    popupEnabled: false,
    popupTitle: null,
    popupMessage: null,
    popupButtonText: null,
    popupButtonLink: null,
    popupTrigger: "delay",
    popupDelaySeconds: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("storefrontService.getOrCreateForWorkspace", () => {
  it("returns the existing storefront without creating a new one", async () => {
    const existing = makeStorefront();
    vi.mocked(storefrontRepository.findByWorkspaceId).mockResolvedValue(existing);

    const result = await storefrontService.getOrCreateForWorkspace(WORKSPACE_ID);

    expect(result).toBe(existing);
    expect(storefrontRepository.create).not.toHaveBeenCalled();
  });

  it("creates a storefront on first visit when none exists yet", async () => {
    vi.mocked(storefrontRepository.findByWorkspaceId).mockResolvedValue(null);
    const created = makeStorefront();
    vi.mocked(storefrontRepository.create).mockResolvedValue(created);

    const result = await storefrontService.getOrCreateForWorkspace(WORKSPACE_ID);

    expect(storefrontRepository.create).toHaveBeenCalledWith({ workspaceId: WORKSPACE_ID });
    expect(result).toBe(created);
  });
});

describe("storefrontService.updateStorefront", () => {
  const BASE_INPUT = {
    isPublished: true,
    font: "inter" as const,
    buttonStyle: "rounded" as const,
    cornerStyle: "soft" as const,
    headerStyle: "standard" as const,
    footerStyle: "standard" as const,
    darkMode: false,
    theme: "modern" as const,
    sections: ["hero", "about", "products", "services", "contact"],
    popupEnabled: false,
    popupTrigger: "delay" as const,
    popupDelaySeconds: 5,
  };

  it("drops blank entries from socialLinks and trackingIds before persisting", async () => {
    const existing = makeStorefront();
    vi.mocked(storefrontRepository.findByWorkspaceId).mockResolvedValue(existing);
    vi.mocked(storefrontRepository.update).mockResolvedValue(existing);

    await storefrontService.updateStorefront(WORKSPACE_ID, {
      ...BASE_INPUT,
      socialLinks: { whatsapp: "https://wa.me/123", instagram: "" },
      trackingIds: { metaPixelId: "" },
    });

    expect(storefrontRepository.update).toHaveBeenCalledWith(
      existing.id,
      WORKSPACE_ID,
      expect.objectContaining({
        socialLinks: { whatsapp: "https://wa.me/123" },
        trackingIds: {},
      }),
    );
  });

  it("passes every style field straight through", async () => {
    const existing = makeStorefront();
    vi.mocked(storefrontRepository.findByWorkspaceId).mockResolvedValue(existing);
    vi.mocked(storefrontRepository.update).mockResolvedValue(existing);

    await storefrontService.updateStorefront(WORKSPACE_ID, { ...BASE_INPUT, theme: "bold", darkMode: true });

    expect(storefrontRepository.update).toHaveBeenCalledWith(
      existing.id,
      WORKSPACE_ID,
      expect.objectContaining({ theme: "bold", darkMode: true }),
    );
  });
});

describe("storefrontService.submitInquiry", () => {
  it("reuses an existing contact found by phone instead of creating a duplicate", async () => {
    const existingContact = { id: "contact-1", fullName: "Jane" } as Contact;
    vi.mocked(contactRepository.findByPhone).mockResolvedValue(existingContact);
    vi.mocked(leadRepository.create).mockResolvedValue({ id: "lead-1", contactId: "contact-1" } as never);

    await storefrontService.submitInquiry(WORKSPACE_ID, { fullName: "Jane", phone: "+9647701234567", message: "Interested" });

    expect(contactRepository.create).not.toHaveBeenCalled();
    expect(leadRepository.create).toHaveBeenCalledWith({ workspaceId: WORKSPACE_ID, contactId: "contact-1", conversationId: null });
    expect(activityRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: "contact-1", type: "lead_created", actor: { type: "system" } }),
    );
    expect(automationService.dispatch).toHaveBeenCalledWith(WORKSPACE_ID, { type: "lead_created", contactId: "contact-1" });
  });

  it("creates a new contact with source Website when no match by phone exists", async () => {
    vi.mocked(contactRepository.findByPhone).mockResolvedValue(null);
    vi.mocked(contactRepository.create).mockResolvedValue({ id: "contact-2" } as Contact);
    vi.mocked(leadRepository.create).mockResolvedValue({ id: "lead-2", contactId: "contact-2" } as never);

    await storefrontService.submitInquiry(WORKSPACE_ID, { fullName: "New Visitor", phone: "+9647701234568", message: "Hi" });

    expect(contactRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, fullName: "New Visitor", phone: "+9647701234568", source: "Website" }),
    );
  });
});

describe("storefrontService.submitOrder", () => {
  function makeProduct(overrides: Partial<import("@/db/schema").Product> = {}) {
    return {
      id: "product-1",
      workspaceId: WORKSPACE_ID,
      name: "Widget",
      description: null,
      price: "19.99",
      discountedPrice: null,
      category: null,
      imageUrl: null,
      galleryImageUrls: [],
      variants: [],
      isActive: true,
      aiVisible: true,
      featured: false,
      promotionEndsAt: null,
      createdAt: new Date(),
      ...overrides,
    };
  }

  it("re-prices every cart line from the live catalog, never trusting a client-supplied price", async () => {
    vi.mocked(productRepository.findByWorkspaceId).mockResolvedValue([makeProduct({ discountedPrice: "14.99" })]);
    vi.mocked(contactRepository.findByPhone).mockResolvedValue(null);
    vi.mocked(contactRepository.create).mockResolvedValue({ id: "contact-1" } as Contact);
    vi.mocked(orderService.createOrder).mockResolvedValue({ order: { id: "order-1" } } as never);

    await storefrontService.submitOrder(WORKSPACE_ID, {
      fullName: "Jane",
      phone: "+9647701234567",
      items: [{ productId: "product-1", quantity: 2 }],
    });

    expect(orderService.createOrder).toHaveBeenCalledWith(
      WORKSPACE_ID,
      expect.objectContaining({
        contactId: "contact-1",
        items: [{ productId: "product-1", name: "Widget", unitPrice: "14.99", quantity: 2 }],
      }),
      { type: "system" },
    );
  });

  it("rejects a cart item that isn't an active product in this workspace", async () => {
    vi.mocked(productRepository.findByWorkspaceId).mockResolvedValue([]);

    await expect(
      storefrontService.submitOrder(WORKSPACE_ID, {
        fullName: "Jane",
        phone: "+9647701234567",
        items: [{ productId: "ghost-product", quantity: 1 }],
      }),
    ).rejects.toThrow("One of the items in your cart is no longer available.");
    expect(orderService.createOrder).not.toHaveBeenCalled();
  });

  it("rejects an empty cart", async () => {
    await expect(
      storefrontService.submitOrder(WORKSPACE_ID, { fullName: "Jane", phone: "+9647701234567", items: [] }),
    ).rejects.toThrow("Your cart is empty.");
  });

  it("reuses an existing contact found by phone", async () => {
    vi.mocked(productRepository.findByWorkspaceId).mockResolvedValue([makeProduct()]);
    vi.mocked(contactRepository.findByPhone).mockResolvedValue({ id: "contact-2" } as Contact);
    vi.mocked(orderService.createOrder).mockResolvedValue({ order: { id: "order-2" } } as never);

    await storefrontService.submitOrder(WORKSPACE_ID, {
      fullName: "Jane",
      phone: "+9647701234567",
      items: [{ productId: "product-1", quantity: 1 }],
    });

    expect(contactRepository.create).not.toHaveBeenCalled();
    expect(orderService.createOrder).toHaveBeenCalledWith(WORKSPACE_ID, expect.objectContaining({ contactId: "contact-2" }), {
      type: "system",
    });
  });
});
