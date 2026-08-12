import "server-only";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { faqRepository } from "@/features/knowledge-base/repository/faq.repository";
import { policyRepository } from "@/features/knowledge-base/repository/policy.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import { platformSettingsRepository } from "@/features/platform-admin/repository/platform-settings.repository";
import { AppError } from "@/lib/errors/app-error";
import { aiAgentRepository } from "../repository/ai-agent.repository";
import { aiUsageRepository } from "../repository/ai-usage.repository";
import { buildSystemPrompt } from "../prompt/prompt-builder";
import { DEFAULT_MODEL, selectModel, selectProvider } from "../router/ai-router";
import { containsUnsafeDisclosure, SAFE_FALLBACK_REPLY } from "../safety/output-filter";
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
 * PART 6's AI Workflow Generator: "parses the prompt into the existing
 * Workflow JSON schema... produces the same workflow objects a user would
 * build manually, it does not introduce a new execution model." This system
 * prompt is deliberately NOT built via buildSystemPrompt (that's the
 * business-persona prompt for customer-facing replies) — this is an internal
 * JSON-extraction task with its own fixed instructions.
 */
const WORKFLOW_GENERATOR_SYSTEM_PROMPT = `You convert a business owner's plain-language description of an
automation into a single JSON object. Output ONLY the JSON object, no markdown fences, no commentary.

Valid "triggerType" values: lead_stage_changed, order_status_changed, conversation_handed_over,
order_created, lead_created, appointment_created, appointment_status_changed, tag_added,
message_received, message_replied, ai_failed.
If triggerType is "lead_stage_changed", include "triggerStage" as one of: new, qualified, contacted,
negotiation, waiting, appointment, proposal_sent, won, lost, cancelled.
If triggerType is "order_status_changed" or "appointment_status_changed", include "triggerStatus".

Valid "actionType" values: add_contact_tag, remove_contact_tag, notify_owner_email, create_task,
create_note, update_contact_language, create_lead, close_conversation, assign_agent, webhook_call,
send_ai_reply, create_order, book_appointment, request_approval.
Include only the config fields relevant to the chosen actionType, using these exact key names:
actionTag (add_contact_tag/remove_contact_tag), actionSubject + actionMessage (notify_owner_email),
actionTaskTitle + actionTaskPriority[low|medium|high] + actionTaskDueInDays (create_task),
actionNoteContent (create_note), actionContactLanguage[ar|en|ku] (update_contact_language),
actionWebhookUrl (webhook_call), actionQuantity (create_order — a product will be picked separately by
the user, do not invent a productId), actionDaysFromNow (book_appointment — a service will be picked
separately by the user, do not invent a serviceId), actionMessage (request_approval — instructions for
the approver).

Always include "name" (a short human-readable title for the automation) and, if the description
mentions a delay ("after N days", "wait a week"), "delayDays" as an integer.

Example output: {"name":"Notify me of new orders","triggerType":"order_created","actionType":"notify_owner_email","actionSubject":"New order","actionMessage":"A new order came in from {{contactName}}."}`;
const WORKFLOW_GENERATOR_MAX_TOKENS = 500;

export interface GeneratedWorkflowFields {
  name?: string;
  triggerType?: string;
  triggerStage?: string;
  triggerStatus?: string;
  actionType?: string;
  actionTag?: string;
  actionSubject?: string;
  actionMessage?: string;
  actionTaskTitle?: string;
  actionTaskPriority?: string;
  actionTaskDueInDays?: number;
  actionNoteContent?: string;
  actionContactLanguage?: string;
  actionWebhookUrl?: string;
  actionQuantity?: number;
  actionDaysFromNow?: number;
  delayDays?: number;
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
  const platformSettings = await platformSettingsRepository.get();
  if (platformSettings && !platformSettings.aiEnabled) {
    // Caught by inboxService.triggerAiReply, which hands the conversation to a
    // human instead of crashing — see that function's own doc comment. This is
    // the AI Operations console's platform-wide kill switch (src/app/admin/ai-operations).
    throw new AppError("SERVICE_UNAVAILABLE", "AI replies are temporarily disabled by the platform administrator.");
  }

  const [agent, faqs, products, services, policy, contact] = await Promise.all([
    aiAgentRepository.findByWorkspaceId(workspaceId),
    faqRepository.findByWorkspaceId(workspaceId),
    productRepository.findVisibleToAi(workspaceId),
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
    creativity: platformSettings?.defaultCreativity ?? "medium",
  });
  const model = selectModel(history);
  const provider = selectProvider(model);
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
      result.handoverCategory = dispatcher.signals.handoverCategory;
      result.handoverReason = dispatcher.signals.handoverReason;
    }

    if (containsUnsafeDisclosure(result.text)) {
      result.text = SAFE_FALLBACK_REPLY;
      result.needsHumanHandover = true;
      result.handoverCategory = "other";
      result.handoverReason = "AI safety filter caught a disclosure in the generated reply before it was sent.";
    }

    await aiUsageRepository.create({
      workspaceId,
      provider: "claude",
      model,
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
      model,
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

/** Strips markdown code fences if the model wraps its JSON output in them despite instructions not to. */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

async function generateWorkflowFromDescription(workspaceId: string, description: string): Promise<GeneratedWorkflowFields> {
  const provider = selectProvider();
  const startedAt = Date.now();

  try {
    const result = await provider.generateReply({
      systemPrompt: WORKFLOW_GENERATOR_SYSTEM_PROMPT,
      history: [{ role: "user", content: description }],
      maxTokens: WORKFLOW_GENERATOR_MAX_TOKENS,
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

    try {
      const parsed = JSON.parse(stripCodeFences(result.text)) as GeneratedWorkflowFields;
      if (!parsed.triggerType || !parsed.actionType) {
        throw new AppError("VALIDATION_ERROR", "Couldn't work out a trigger and action from that description — try rephrasing it.");
      }
      return parsed;
    } catch (parseError) {
      if (parseError instanceof AppError) throw parseError;
      throw new AppError("VALIDATION_ERROR", "Couldn't understand that description as an automation — try rephrasing it.");
    }
  } catch (error) {
    if (!(error instanceof AppError)) {
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
    }
    throw error;
  }
}

export const aiService = {
  generateReply,
  generateSummary,
  generateWorkflowFromDescription,
};
