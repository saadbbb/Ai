import "server-only";
import type { Plan } from "@/db/schema";
import { conversationRepository } from "@/features/inbox/repository/conversation.repository";
import { channelRepository } from "@/features/inbox/repository/channel.repository";
import { aiAgentRepository } from "@/features/ai/repository/ai-agent.repository";
import { workflowRepository } from "@/features/automation/repository/workflow.repository";
import { faqRepository } from "@/features/knowledge-base/repository/faq.repository";
import { apiKeyRepository } from "@/features/integrations/repository/api-key.repository";
import { webhookSubscriptionRepository } from "@/features/integrations/repository/webhook-subscription.repository";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";

export type UsageDimension =
  | "users"
  | "aiAgents"
  | "channels"
  | "conversationsPerMonth"
  | "knowledgeFiles"
  | "automationWorkflows"
  | "integrations";

export interface UsageMetric {
  used: number;
  /** null = unlimited (no limit set on the plan, or no plan at all). */
  limit: number | null;
  /** 0-100+, null when there's no limit to measure against. */
  percentUsed: number | null;
}

export type UsageSnapshot = Record<UsageDimension, UsageMetric>;

function toMetric(used: number, limit: number | null): UsageMetric {
  return { used, limit, percentUsed: limit ? Math.round((used / limit) * 100) : null };
}

/**
 * Usage is computed live from the actual tables on every call rather than
 * maintained as running counters — correct-by-construction (never drifts)
 * and cheap enough at this scale (see dashboard.service.ts for the same
 * "recompute, don't cache" reasoning). maxStorageMb/maxApiCallsPerMonth are
 * deliberately absent — no file-storage system or per-request API counter
 * exists yet to measure them against (see the plans.ts schema comment and
 * DEFERRED_TASKS.md), so reporting a number for either would be fabricated.
 */
async function getUsageSnapshot(workspaceId: string, plan: Plan | null): Promise<UsageSnapshot> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [members, agent, channels, conversationsThisMonth, faqs, workflows, apiKeys, webhookSubscriptions] = await Promise.all([
    membershipRepository.findMembersByWorkspaceId(workspaceId),
    aiAgentRepository.findByWorkspaceId(workspaceId),
    channelRepository.findByWorkspaceId(workspaceId),
    conversationRepository.countCreatedSince(workspaceId, startOfMonth),
    faqRepository.findByWorkspaceId(workspaceId),
    workflowRepository.findByWorkspaceId(workspaceId),
    apiKeyRepository.findByWorkspaceId(workspaceId),
    webhookSubscriptionRepository.findByWorkspaceId(workspaceId),
  ]);

  const connectedChannels = channels.filter((channel) => channel.status === "connected").length;
  const activeApiKeys = apiKeys.filter((key) => !key.revokedAt).length;
  const activeWebhooks = webhookSubscriptions.filter((subscription) => subscription.isActive).length;

  return {
    users: toMetric(members.length, plan?.maxUsers ?? null),
    aiAgents: toMetric(agent ? 1 : 0, plan?.maxAiAgents ?? null),
    channels: toMetric(connectedChannels, plan?.maxChannels ?? null),
    conversationsPerMonth: toMetric(conversationsThisMonth, plan?.maxConversationsPerMonth ?? null),
    knowledgeFiles: toMetric(faqs.length, plan?.maxKnowledgeFiles ?? null),
    automationWorkflows: toMetric(workflows.length, plan?.maxAutomationWorkflows ?? null),
    integrations: toMetric(activeApiKeys + activeWebhooks, plan?.maxIntegrations ?? null),
  };
}

export const usageService = {
  getUsageSnapshot,
};
