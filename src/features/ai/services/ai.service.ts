import "server-only";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
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

const SUMMARY_SYSTEM_PROMPT =
  "You summarize a customer conversation for a business owner's internal CRM notes, based on the transcript " +
  "the user provides. Write 1-3 short, plain, factual sentences covering who the customer is, what they " +
  "wanted, and where things stand. No greeting, no AI/system references, no markdown.";
const SUMMARY_MAX_TOKENS = 200;

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
  const [agent, faqs, products, services, policy, contact] = await Promise.all([
    aiAgentRepository.findByWorkspaceId(workspaceId),
    faqRepository.findByWorkspaceId(workspaceId),
    productRepository.findByWorkspaceId(workspaceId),
    serviceRepository.findByWorkspaceId(workspaceId),
    policyRepository.findByWorkspaceId(workspaceId),
    context ? contactRepository.findById(context.contactId, workspaceId) : Promise.resolve(null),
  ]);

  if (!agent) {
    throw new AppError("VALIDATION_ERROR", "Finish setting up your AI employee before testing it.");
  }

  const systemPrompt = buildSystemPrompt({
    agent,
    faqs,
    products,
    services,
    policy,
    toolsEnabled: !!context,
    customerSummary: contact?.aiSummary,
  });
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

/**
 * Long-term memory (PART 4 Layer 4) — condenses a conversation transcript into a
 * few sentences stored on the contact (contacts.aiSummary) so a returning
 * customer's history can be fed back into the prompt without replaying the
 * whole conversation. Best-effort: failures are logged, never thrown, since
 * this enriches a record after the fact rather than blocking a customer reply.
 */
async function generateSummary(workspaceId: string, transcript: string): Promise<string | null> {
  if (!transcript.trim()) return null;

  const provider = selectProvider();
  const startedAt = Date.now();

  try {
    const result = await provider.generateReply({
      systemPrompt: SUMMARY_SYSTEM_PROMPT,
      history: [{ role: "user", content: transcript }],
      maxTokens: SUMMARY_MAX_TOKENS,
    });
    await aiUsageRepository.create({
      workspaceId,
      provider: "claude",
      model: DEFAULT_MODEL,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: Date.now() - startedAt,
      success: true,
    });
    return result.text.trim() || null;
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
    console.error("[ai] summary generation failed:", error);
    return null;
  }
}

export const aiService = {
  generateReply,
  generateSummary,
};
