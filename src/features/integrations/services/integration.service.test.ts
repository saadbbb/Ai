import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiKey, WebhookSubscription } from "@/db/schema";

vi.mock("../repository/api-key.repository", () => ({
  apiKeyRepository: {
    findByWorkspaceId: vi.fn(),
    create: vi.fn(),
    revoke: vi.fn(),
    findActiveByHash: vi.fn(),
    touchLastUsed: vi.fn(),
  },
}));

vi.mock("../repository/webhook-subscription.repository", () => ({
  webhookSubscriptionRepository: {
    findByWorkspaceId: vi.fn(),
    create: vi.fn(),
    setActive: vi.fn(),
    delete: vi.fn(),
    findActiveByWorkspaceAndEvent: vi.fn(),
  },
}));

vi.mock("../repository/webhook-delivery.repository", () => ({
  webhookDeliveryRepository: {
    create: vi.fn(),
    findBySubscriptionId: vi.fn(),
  },
}));

vi.mock("@/features/workspace/repository/workspace-audit-log.repository", () => ({
  workspaceAuditLogRepository: { log: vi.fn() },
}));

vi.mock("@/features/automation/lib/safe-webhook-fetch", () => ({
  safeWebhookPost: vi.fn(),
}));

vi.mock("@/features/crm/repository/activity.repository", () => ({
  activityRepository: { log: vi.fn() },
}));

vi.mock("@/features/crm/repository/lead.repository", () => ({
  leadRepository: { create: vi.fn() },
}));

vi.mock("@/features/inbox/repository/contact.repository", () => ({
  contactRepository: { create: vi.fn() },
}));

vi.mock("@/features/automation/services/automation.service", () => ({
  automationService: { dispatch: vi.fn() },
}));

const { apiKeyRepository } = await import("../repository/api-key.repository");
const { webhookSubscriptionRepository } = await import("../repository/webhook-subscription.repository");
const { webhookDeliveryRepository } = await import("../repository/webhook-delivery.repository");
const { workspaceAuditLogRepository } = await import("@/features/workspace/repository/workspace-audit-log.repository");
const { safeWebhookPost } = await import("@/features/automation/lib/safe-webhook-fetch");
const { activityRepository } = await import("@/features/crm/repository/activity.repository");
const { leadRepository } = await import("@/features/crm/repository/lead.repository");
const { contactRepository } = await import("@/features/inbox/repository/contact.repository");
const { automationService } = await import("@/features/automation/services/automation.service");
const { integrationService } = await import("./integration.service");

const WORKSPACE_ID = "workspace-1";
const ACTOR = { userId: "user-1", name: null, email: "owner@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("integrationService.createApiKey", () => {
  it("stores only the hash and prefix, and returns the plaintext exactly once", async () => {
    vi.mocked(apiKeyRepository.create).mockImplementation(async (data) => ({
      id: "key-1",
      workspaceId: WORKSPACE_ID,
      name: data.name,
      keyPrefix: data.keyPrefix,
      keyHash: data.keyHash,
      lastUsedAt: null,
      revokedAt: null,
      createdAt: new Date(),
    }));

    const result = await integrationService.createApiKey(WORKSPACE_ID, "Zapier", ACTOR);

    expect(result.plaintext.startsWith("sk_live_")).toBe(true);
    expect(apiKeyRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, name: "Zapier" }),
    );
    // The stored hash must never equal the plaintext itself.
    expect(result.apiKey.keyHash).not.toBe(result.plaintext);
    expect(workspaceAuditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, action: "api_key_created" }),
    );
  });
});

describe("integrationService.revokeApiKey", () => {
  it("throws NOT_FOUND when the key doesn't belong to this workspace", async () => {
    vi.mocked(apiKeyRepository.revoke).mockResolvedValue(null);

    await expect(integrationService.revokeApiKey(WORKSPACE_ID, "key-1", ACTOR)).rejects.toThrow(/not found/i);
  });

  it("logs an audit entry when a key is revoked", async () => {
    vi.mocked(apiKeyRepository.revoke).mockResolvedValue({ id: "key-1", name: "Zapier" } as ApiKey);

    await integrationService.revokeApiKey(WORKSPACE_ID, "key-1", ACTOR);

    expect(workspaceAuditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, action: "api_key_revoked" }),
    );
  });
});

describe("integrationService.authenticateApiKey", () => {
  it("returns null for an unknown or revoked key", async () => {
    vi.mocked(apiKeyRepository.findActiveByHash).mockResolvedValue(null);

    const result = await integrationService.authenticateApiKey("sk_live_bogus");

    expect(result).toBeNull();
    expect(apiKeyRepository.touchLastUsed).not.toHaveBeenCalled();
  });

  it("returns the workspaceId and touches lastUsedAt for a valid key", async () => {
    vi.mocked(apiKeyRepository.findActiveByHash).mockResolvedValue({ id: "key-1", workspaceId: WORKSPACE_ID } as ApiKey);

    const result = await integrationService.authenticateApiKey("sk_live_real");

    expect(result).toBe(WORKSPACE_ID);
    expect(apiKeyRepository.touchLastUsed).toHaveBeenCalledWith("key-1");
  });
});

describe("integrationService.createWebhookSubscription", () => {
  it("rejects a non-https URL", async () => {
    await expect(
      integrationService.createWebhookSubscription(WORKSPACE_ID, "http://example.com/hook", ["lead_created"], ACTOR),
    ).rejects.toThrow(/https/);
    expect(webhookSubscriptionRepository.create).not.toHaveBeenCalled();
  });

  it("generates a secret, stores the subscription for an https URL, and logs an audit entry", async () => {
    vi.mocked(webhookSubscriptionRepository.create).mockResolvedValue({ id: "sub-1" } as WebhookSubscription);

    await integrationService.createWebhookSubscription(WORKSPACE_ID, "https://example.com/hook", ["lead_created"], ACTOR);

    expect(webhookSubscriptionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, url: "https://example.com/hook", eventTypes: ["lead_created"] }),
    );
    expect(workspaceAuditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, action: "webhook_created" }),
    );
  });
});

describe("integrationService.deleteWebhookSubscription", () => {
  it("logs an audit entry after deleting", async () => {
    await integrationService.deleteWebhookSubscription(WORKSPACE_ID, "sub-1", ACTOR);

    expect(webhookSubscriptionRepository.delete).toHaveBeenCalledWith("sub-1", WORKSPACE_ID);
    expect(workspaceAuditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, action: "webhook_revoked" }),
    );
  });
});

describe("integrationService.notifyWebhookSubscribers", () => {
  it("does nothing when there are no matching subscriptions", async () => {
    vi.mocked(webhookSubscriptionRepository.findActiveByWorkspaceAndEvent).mockResolvedValue([]);

    await integrationService.notifyWebhookSubscribers(WORKSPACE_ID, { type: "lead_created", contactId: "c1" });

    expect(safeWebhookPost).not.toHaveBeenCalled();
  });

  it("signs and posts to every matching subscription, logging a successful delivery each", async () => {
    vi.mocked(webhookSubscriptionRepository.findActiveByWorkspaceAndEvent).mockResolvedValue([
      { id: "sub-1", url: "https://a.example.com/hook", secret: "secret-a" } as WebhookSubscription,
      { id: "sub-2", url: "https://b.example.com/hook", secret: "secret-b" } as WebhookSubscription,
    ]);

    await integrationService.notifyWebhookSubscribers(WORKSPACE_ID, { type: "lead_created", contactId: "c1" });

    expect(safeWebhookPost).toHaveBeenCalledTimes(2);
    expect(safeWebhookPost).toHaveBeenCalledWith(
      "https://a.example.com/hook",
      expect.objectContaining({ event: "lead_created" }),
      expect.objectContaining({ "X-Webhook-Signature": expect.any(String) }),
    );
    expect(webhookDeliveryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: "sub-1", eventType: "lead_created", success: true }),
    );
  });

  it("never throws when a delivery fails — one bad endpoint doesn't block the others, and the failure is logged", async () => {
    vi.mocked(webhookSubscriptionRepository.findActiveByWorkspaceAndEvent).mockResolvedValue([
      { id: "sub-1", url: "https://a.example.com/hook", secret: "secret-a" } as WebhookSubscription,
    ]);
    vi.mocked(safeWebhookPost).mockRejectedValue(new Error("endpoint down"));

    await expect(
      integrationService.notifyWebhookSubscribers(WORKSPACE_ID, { type: "lead_created", contactId: "c1" }),
    ).resolves.toBeUndefined();

    expect(webhookDeliveryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: "sub-1", success: false, error: "endpoint down" }),
    );
  });
});

describe("integrationService.createLeadViaApi", () => {
  it("creates a contact with source API, a lead, and dispatches lead_created", async () => {
    vi.mocked(contactRepository.create).mockResolvedValue({ id: "contact-1" } as never);
    vi.mocked(leadRepository.create).mockResolvedValue({ id: "lead-1", contactId: "contact-1" } as never);

    const result = await integrationService.createLeadViaApi(WORKSPACE_ID, { fullName: "Jane", phone: "+123" });

    expect(contactRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, fullName: "Jane", phone: "+123", source: "API" }),
    );
    expect(leadRepository.create).toHaveBeenCalledWith({ workspaceId: WORKSPACE_ID, contactId: "contact-1", conversationId: null });
    expect(activityRepository.log).toHaveBeenCalledWith(expect.objectContaining({ contactId: "contact-1", type: "lead_created" }));
    expect(automationService.dispatch).toHaveBeenCalledWith(WORKSPACE_ID, { type: "lead_created", contactId: "contact-1" });
    expect(result).toEqual({ contactId: "contact-1", leadId: "lead-1" });
  });
});
