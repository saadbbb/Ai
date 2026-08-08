import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Plan, Workspace } from "@/db/schema";

vi.mock("../repository/invoice.repository", () => ({
  invoiceRepository: { countAll: vi.fn(), create: vi.fn(), findByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/notifications/services/notify-owner.service", () => ({
  notifyWorkspaceOwner: vi.fn(),
}));

const { invoiceRepository } = await import("../repository/invoice.repository");
const { notifyWorkspaceOwner } = await import("@/features/notifications/services/notify-owner.service");
const { invoiceService } = await import("./invoice.service");

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "workspace-1",
    name: "Acme",
    slug: "acme",
    businessType: null,
    country: null,
    timezone: "UTC",
    language: "en",
    logoUrl: null,
    onboardingStep: 10,
    onboardingCompletedAt: new Date(),
    subscriptionStatus: "active",
    planId: "plan-1",
    subscriptionExpiresAt: new Date(),
    lastReminderDaysSent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: "plan-1",
    name: "Pro",
    billingCycle: "monthly",
    defaultDurationDays: 30,
    enabledFeatures: [],
    price: "50.00",
    currency: "IQD",
    maxUsers: null,
    maxAiAgents: null,
    maxChannels: null,
    maxConversationsPerMonth: null,
    maxStorageMb: null,
    maxKnowledgeFiles: null,
    maxAutomationWorkflows: null,
    maxApiCallsPerMonth: null,
    maxIntegrations: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("invoiceService.generateForActivation", () => {
  it("creates a paid invoice numbered sequentially from the existing count", async () => {
    vi.mocked(invoiceRepository.countAll).mockResolvedValue(41);
    vi.mocked(invoiceRepository.create).mockImplementation(async (data) => ({ id: "invoice-1", ...data }) as never);

    const invoice = await invoiceService.generateForActivation(makeWorkspace(), makePlan(), 30);

    expect(invoice).not.toBeNull();
    expect(invoiceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace-1",
        planId: "plan-1",
        planName: "Pro",
        invoiceNumber: "INV-000042",
        amount: "50.00",
        currency: "IQD",
        status: "paid",
        periodDays: 30,
      }),
    );
    expect(notifyWorkspaceOwner).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "workspace-1", type: "billing" }),
    );
  });

  it("does not generate an invoice for an unpriced plan", async () => {
    const invoice = await invoiceService.generateForActivation(makeWorkspace(), makePlan({ price: null }), 30);

    expect(invoice).toBeNull();
    expect(invoiceRepository.create).not.toHaveBeenCalled();
    expect(notifyWorkspaceOwner).not.toHaveBeenCalled();
  });
});

describe("invoiceService.listForWorkspace", () => {
  it("delegates straight to the repository", async () => {
    vi.mocked(invoiceRepository.findByWorkspaceId).mockResolvedValue([]);

    await invoiceService.listForWorkspace("workspace-1");

    expect(invoiceRepository.findByWorkspaceId).toHaveBeenCalledWith("workspace-1");
  });
});
