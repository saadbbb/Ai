import "server-only";
import { faqRepository } from "@/features/knowledge-base/repository/faq.repository";
import { policyRepository } from "@/features/knowledge-base/repository/policy.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import { AppError } from "@/lib/errors/app-error";
import { aiAgentRepository } from "../repository/ai-agent.repository";
import { aiUsageRepository } from "../repository/ai-usage.repository";
import { buildSystemPrompt } from "../prompt/prompt-builder";
import { DEFAULT_MODEL, selectProvider } from "../router/ai-router";
import { createToolDispatcher, getToolDefinitions } from "../tools/registry";
import type { ChatMessage, GenerateReplyResult } from "../providers/types";

interface ConversationContext {
  contactId: string;
  conversationId: string;
}

/**
 * `context` is only present when replying inside a real conversation (see
 * inboxService.triggerAiReply) — that's what enables tool-calling (Create
 * Lead/Order/Appointment etc.), since tools need a real contact/conversation
 * to act against. The "test your AI employee" chat screen omits it and stays
 * reply-only; there's no real customer record for a test tool call to touch.
 */
async function generateReply(
  workspaceId: string,
  history: ChatMessage[],
  context?: ConversationContext,
): Promise<GenerateReplyResult> {
  const [agent, faqs, products, services, policy] = await Promise.all([
    aiAgentRepository.findByWorkspaceId(workspaceId),
    faqRepository.findByWorkspaceId(workspaceId),
    productRepository.findByWorkspaceId(workspaceId),
    serviceRepository.findByWorkspaceId(workspaceId),
    policyRepository.findByWorkspaceId(workspaceId),
  ]);

  if (!agent) {
    throw new AppError("VALIDATION_ERROR", "Finish setting up your AI employee before testing it.");
  }

  const systemPrompt = buildSystemPrompt({ agent, faqs, products, services, policy, toolsEnabled: !!context });
  const provider = selectProvider();
  const startedAt = Date.now();

  const dispatcher = context
    ? createToolDispatcher({ workspaceId, contactId: context.contactId, conversationId: context.conversationId })
    : null;

  try {
    const result = await provider.generateReply({
      systemPrompt,
      history,
      ...(dispatcher
        ? { tools: getToolDefinitions(), executeTool: dispatcher.executeTool }
        : {}),
    });
    if (dispatcher?.signals.handoverRequested) {
      result.needsHumanHandover = true;
    }
    await aiUsageRepository.create({
      workspaceId,
      provider: "claude",
      model: DEFAULT_MODEL,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: Date.now() - startedAt,
      success: true,
    });
    return result;
  } catch (error) {
    await aiUsageRepository.create({
      workspaceId,
      provider: "claude",
      model: DEFAULT_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export const aiService = {
  generateReply,
};
