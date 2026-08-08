import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Plan } from "@/db/schema";

vi.mock("@/features/workspace/repository/membership.repository", () => ({
  membershipRepository: { findMembersByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/ai/repository/ai-agent.repository", () => ({
  aiAgentRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/inbox/repository/channel.repository", () => ({
  channelRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/inbox/repository/conversation.repository", () => ({
  conversationRepository: { countCreatedSince: vi.fn() },
}));

vi.mock("@/features/knowledge-base/repository/faq.repository", () => ({
  faqRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/automation/repository/workflow.repository", () => ({
  workflowRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/integrations/repository/api-key.repository", () => ({
  apiKeyRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/integrations/repository/webhook-subscription.repository", () => ({
  webhookSubscriptionRepository: { findByWorkspaceId: vi.fn() },
}));

const { membershipRepository } = await import("@/features/workspace/repository/membership.repository");
const { aiAgentRepository } = await import("@/features/ai/repository/ai-agent.repository");
const { channelRepository } = await import("@/features/inbox/repository/channel.repository");
const { conversationRepository } = await import("@/features/inbox/repository/conversation.repository");
const { faqRepository } = await import("@/features/knowledge-base/repository/faq.repository");
const { workflowRepository } = await import("@/features/automation/repository/workflow.repository");
const { apiKeyRepository } = await import("@/features/integrations/repository/api-key.repository");
const { webhookSubscriptionRepository } = await import("@/features/integrations/repository/webhook-subscription.repository");
const { usageService } = await import("./usage.service");

const WORKSPACE_ID = "workspace-1";

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: "plan-1",
    name: "Pro",
    billingCycle: "monthly",
    defaultDurationDays: 30,
    enabledFeatures: [],
    price: null,
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
  vi.mocked(membershipRepository.findMembersByWorkspaceId).mockResolvedValue([{}, {}] as never);
  vi.mocked(aiAgentRepository.findByWorkspaceId).mockResolvedValue({ id: "agent-1" } as never);
  vi.mocked(channelRepository.findByWorkspaceId).mockResolvedValue([
    { status: "connected" },
    { status: "connected" },
    { status: "not_connected" },
  ] as never);
  vi.mocked(conversationRepository.countCreatedSince).mockResolvedValue(5);
  vi.mocked(faqRepository.findByWorkspaceId).mockResolvedValue([{}, {}, {}] as never);
  vi.mocked(workflowRepository.findByWorkspaceId).mockResolvedValue([{}] as never);
  vi.mocked(apiKeyRepository.findByWorkspaceId).mockResolvedValue([{ revokedAt: null }, { revokedAt: new Date() }] as never);
  vi.mocked(webhookSubscriptionRepository.findByWorkspaceId).mockResolvedValue([{ isActive: true }] as never);
});

describe("usageService.getUsageSnapshot", () => {
  it("computes used counts from the actual data, unlimited (null percent) with no plan", async () => {
    const snapshot = await usageService.getUsageSnapshot(WORKSPACE_ID, null);

    expect(snapshot.users).toEqual({ used: 2, limit: null, percentUsed: null });
    expect(snapshot.aiAgents).toEqual({ used: 1, limit: null, percentUsed: null });
    expect(snapshot.channels).toEqual({ used: 2, limit: null, percentUsed: null });
    expect(snapshot.conversationsPerMonth).toEqual({ used: 5, limit: null, percentUsed: null });
    expect(snapshot.knowledgeFiles).toEqual({ used: 3, limit: null, percentUsed: null });
    expect(snapshot.automationWorkflows).toEqual({ used: 1, limit: null, percentUsed: null });
    // 1 active api key (the revoked one is excluded) + 1 active webhook subscription
    expect(snapshot.integrations).toEqual({ used: 2, limit: null, percentUsed: null });
  });

  it("computes percentUsed against the plan's limits", async () => {
    const plan = makePlan({ maxUsers: 4, maxChannels: 2, maxConversationsPerMonth: 10 });

    const snapshot = await usageService.getUsageSnapshot(WORKSPACE_ID, plan);

    expect(snapshot.users).toEqual({ used: 2, limit: 4, percentUsed: 50 });
    expect(snapshot.channels).toEqual({ used: 2, limit: 2, percentUsed: 100 });
    expect(snapshot.conversationsPerMonth).toEqual({ used: 5, limit: 10, percentUsed: 50 });
  });

  it("excludes revoked API keys and inactive webhook subscriptions from the integrations count", async () => {
    vi.mocked(apiKeyRepository.findByWorkspaceId).mockResolvedValue([
      { revokedAt: null },
      { revokedAt: null },
      { revokedAt: new Date() },
    ] as never);
    vi.mocked(webhookSubscriptionRepository.findByWorkspaceId).mockResolvedValue([
      { isActive: true },
      { isActive: false },
    ] as never);

    const snapshot = await usageService.getUsageSnapshot(WORKSPACE_ID, null);

    expect(snapshot.integrations.used).toBe(3);
  });
});
