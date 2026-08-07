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

const { storefrontRepository } = await import("../repository/storefront.repository");
const { activityRepository } = await import("@/features/crm/repository/activity.repository");
const { leadRepository } = await import("@/features/crm/repository/lead.repository");
const { automationService } = await import("@/features/automation/services/automation.service");
const { contactRepository } = await import("@/features/inbox/repository/contact.repository");
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
