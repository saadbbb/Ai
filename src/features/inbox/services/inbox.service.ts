import "server-only";
import { detectIntent } from "@/features/ai/lib/intent-detection";
import type { ChatMessage } from "@/features/ai/providers/types";
import { aiService } from "@/features/ai/services/ai.service";
import { automationService } from "@/features/automation/services/automation.service";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { userRepository } from "@/features/auth/repository/user.repository";
import { notificationRepository } from "@/features/notifications/repository/notification.repository";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { AppError } from "@/lib/errors/app-error";
import { channelRepository } from "../repository/channel.repository";
import { contactRepository } from "../repository/contact.repository";
import { conversationRepository, type ConversationFilters, type ConversationListItem } from "../repository/conversation.repository";
import { messageRepository } from "../repository/message.repository";
import type { ConversationPriority, Message } from "@/db/schema";

const AI_HISTORY_LIMIT = 30;

function previewOf(content: string): string {
  return content.length > 140 ? `${content.slice(0, 140)}…` : content;
}

function toChatHistory(history: Message[]): ChatMessage[] {
  return history
    .filter((message) => message.senderType !== "system")
    .slice(-AI_HISTORY_LIMIT)
    .map((message) => ({
      role: message.senderType === "customer" ? "user" : "assistant",
      content: message.content,
    }));
}

const SENDER_LABEL: Partial<Record<Message["senderType"], string>> = {
  customer: "Customer",
  ai: "Employee",
  agent: "Employee",
};

/** Flattened plain-text transcript for summarization — see aiService.generateSummary. */
function toTranscript(history: Message[]): string {
  return history
    .filter((message) => message.senderType !== "system")
    .slice(-AI_HISTORY_LIMIT)
    .map((message) => `${SENDER_LABEL[message.senderType] ?? message.senderType}: ${message.content}`)
    .join("\n");
}

/**
 * Runs after any customer message on a conversation whose AI is still active.
 * Never lets an AI failure block the customer's message from being saved —
 * it logs the reply attempt as a system note and hands the conversation over
 * instead of throwing back through the caller (see claude.provider.ts, which
 * throws AppError today because ANTHROPIC_API_KEY isn't set yet).
 */
async function triggerAiReply(workspaceId: string, conversationId: string, contactId: string, contactName: string): Promise<Message> {
  const history = await messageRepository.findByConversationId(conversationId, workspaceId);

  try {
    const result = await aiService.generateReply(workspaceId, toChatHistory(history), { contactId, conversationId });

    const message = await messageRepository.create({
      workspaceId,
      conversationId,
      senderType: "ai",
      content: result.text,
    });
    await conversationRepository.touchLastMessage(conversationId, workspaceId, previewOf(result.text), "ai");
    await automationService.dispatch(workspaceId, { type: "message_replied", contactId });

    if (result.needsHumanHandover) {
      await conversationRepository.updateAiStatus(conversationId, workspaceId, "handed_over");
      await automationService.dispatch(workspaceId, { type: "conversation_handed_over", contactId });
      await activityRepository.log({
        workspaceId,
        contactId,
        type: "conversation_handed_over",
        actor: { type: "ai" },
        summary: result.handoverReason
          ? `AI handed the conversation to a human (${result.handoverCategory ?? "other"}): ${result.handoverReason}`
          : "AI handed the conversation to a human.",
        link: `/dashboard/inbox/${conversationId}`,
      });
      await notificationRepository.create({
        workspaceId,
        type: "human_handover",
        title: `Handover: ${contactName}`,
        message: result.handoverReason
          ? `The AI handed ${contactName}'s conversation to a human: ${result.handoverReason}`
          : `The AI handed ${contactName}'s conversation to a human.`,
        link: `/dashboard/inbox/${conversationId}`,
      });

      const summary = await aiService.generateSummary(workspaceId, toTranscript([...history, message]));
      if (summary) {
        await contactRepository.updateAiSummary(contactId, workspaceId, summary);
      }
    }

    return message;
  } catch (error) {
    console.error("[inbox] AI reply failed, handing conversation to a human:", error);
    const message = await messageRepository.create({
      workspaceId,
      conversationId,
      senderType: "system",
      content: "The AI employee couldn't generate a reply. This conversation needs a human.",
    });
    await conversationRepository.updateAiStatus(conversationId, workspaceId, "handed_over");
    await automationService.dispatch(workspaceId, { type: "ai_failed", contactId });
    await automationService.dispatch(workspaceId, { type: "conversation_handed_over", contactId });
    await activityRepository.log({
      workspaceId,
      contactId,
      type: "conversation_handed_over",
      actor: { type: "system" },
      summary: "Conversation handed to a human — the AI employee failed to generate a reply.",
      link: `/dashboard/inbox/${conversationId}`,
    });
    await notificationRepository.create({
      workspaceId,
      type: "human_handover",
      title: `Handover: ${contactName}`,
      message: `The AI employee failed to reply to ${contactName} and handed the conversation to a human.`,
      link: `/dashboard/inbox/${conversationId}`,
    });
    return message;
  }
}

async function listConversations(workspaceId: string, filters?: ConversationFilters): Promise<ConversationListItem[]> {
  await channelRepository.ensureDefaultChannels(workspaceId);
  return conversationRepository.findByWorkspaceId(workspaceId, filters);
}

async function getConversation(workspaceId: string, conversationId: string) {
  const item = await conversationRepository.findById(conversationId, workspaceId);
  if (!item) return null;

  const messages = await messageRepository.findByConversationId(conversationId, workspaceId);
  return { ...item, messages };
}

interface StartConversationInput {
  contactName: string;
  phone?: string;
  initialMessage: string;
}

/**
 * Logs a conversation as if a customer just reached out on the manual channel —
 * the only channel that works before WhatsApp/Instagram OAuth exists. Creates a
 * fresh contact every time; matching against existing contacts is CRM territory,
 * not the Inbox's job.
 */
async function startConversation(workspaceId: string, input: StartConversationInput): Promise<{ id: string }> {
  await channelRepository.ensureDefaultChannels(workspaceId);
  const manualChannel = await channelRepository.findByType(workspaceId, "manual");
  if (!manualChannel) {
    throw new AppError("INTERNAL_ERROR", "Manual channel is not set up for this workspace.");
  }

  const contact = await contactRepository.create({
    workspaceId,
    fullName: input.contactName,
    phone: input.phone || null,
    lastContactAt: new Date(),
  });

  const conversation = await conversationRepository.create({
    workspaceId,
    contactId: contact.id,
    channelId: manualChannel.id,
  });

  await messageRepository.create({
    workspaceId,
    conversationId: conversation.id,
    senderType: "customer",
    content: input.initialMessage,
    detectedIntent: detectIntent(input.initialMessage),
  });
  await conversationRepository.touchLastMessage(conversation.id, workspaceId, previewOf(input.initialMessage), "customer");
  await automationService.dispatch(workspaceId, { type: "message_received", contactId: contact.id });

  await triggerAiReply(workspaceId, conversation.id, contact.id, contact.fullName);

  return { id: conversation.id };
}

/**
 * Logs a follow-up message from the customer's side of a manual-channel
 * conversation (e.g. staff recording what a customer said on a phone call).
 */
async function logCustomerMessage(workspaceId: string, conversationId: string, content: string): Promise<Message[]> {
  const item = await conversationRepository.findById(conversationId, workspaceId);
  if (!item) throw new AppError("NOT_FOUND", "Conversation not found.");

  const customerMessage = await messageRepository.create({
    workspaceId,
    conversationId,
    senderType: "customer",
    content,
    detectedIntent: detectIntent(content),
  });
  await conversationRepository.touchLastMessage(conversationId, workspaceId, previewOf(content), "customer");
  await contactRepository.touchLastContact(item.contact.id, workspaceId);
  await automationService.dispatch(workspaceId, { type: "message_received", contactId: item.contact.id });

  if (item.conversation.aiStatus === "active") {
    const replyMessage = await triggerAiReply(workspaceId, conversationId, item.contact.id, item.contact.fullName);
    return [customerMessage, replyMessage];
  }

  // AI isn't handling this conversation (paused/handed over) — a human needs to see this directly.
  await notificationRepository.create({
    workspaceId,
    type: "new_message",
    title: `New message: ${item.contact.fullName}`,
    message: previewOf(content),
    link: `/dashboard/inbox/${conversationId}`,
  });

  return [customerMessage];
}

/**
 * A human agent taking over — pauses the AI so it doesn't also reply to the
 * same message a person just answered.
 */
async function sendAgentReply(
  workspaceId: string,
  conversationId: string,
  userId: string,
  content: string,
): Promise<Message> {
  const item = await conversationRepository.findById(conversationId, workspaceId);
  if (!item) throw new AppError("NOT_FOUND", "Conversation not found.");

  const message = await messageRepository.create({
    workspaceId,
    conversationId,
    senderType: "agent",
    senderUserId: userId,
    content,
  });
  await conversationRepository.touchLastMessage(conversationId, workspaceId, previewOf(content), "agent");
  await conversationRepository.assignIfUnassigned(conversationId, workspaceId, userId);
  await automationService.dispatch(workspaceId, { type: "message_replied", contactId: item.contact.id });

  if (item.conversation.aiStatus === "active") {
    await conversationRepository.updateAiStatus(conversationId, workspaceId, "paused");
  }

  return message;
}

async function resumeAi(workspaceId: string, conversationId: string): Promise<void> {
  const item = await conversationRepository.findById(conversationId, workspaceId);
  if (!item) throw new AppError("NOT_FOUND", "Conversation not found.");

  await conversationRepository.updateAiStatus(conversationId, workspaceId, "active");
}

async function pauseAi(workspaceId: string, conversationId: string): Promise<void> {
  const item = await conversationRepository.findById(conversationId, workspaceId);
  if (!item) throw new AppError("NOT_FOUND", "Conversation not found.");

  await conversationRepository.updateAiStatus(conversationId, workspaceId, "paused");
}

async function closeConversation(workspaceId: string, conversationId: string): Promise<void> {
  const item = await conversationRepository.findById(conversationId, workspaceId);
  if (!item) throw new AppError("NOT_FOUND", "Conversation not found.");

  await conversationRepository.updateStatus(conversationId, workspaceId, "closed");
}

/** The un-archive counterpart to closeConversation — brings a closed conversation back into the active list. */
async function reopenConversation(workspaceId: string, conversationId: string): Promise<void> {
  const item = await conversationRepository.findById(conversationId, workspaceId);
  if (!item) throw new AppError("NOT_FOUND", "Conversation not found.");

  await conversationRepository.updateStatus(conversationId, workspaceId, "open");
}

async function setPinned(workspaceId: string, conversationId: string, pinned: boolean): Promise<void> {
  const item = await conversationRepository.findById(conversationId, workspaceId);
  if (!item) throw new AppError("NOT_FOUND", "Conversation not found.");

  await conversationRepository.setPinned(conversationId, workspaceId, pinned);
}

async function setPriority(workspaceId: string, conversationId: string, priority: ConversationPriority): Promise<void> {
  const item = await conversationRepository.findById(conversationId, workspaceId);
  if (!item) throw new AppError("NOT_FOUND", "Conversation not found.");

  await conversationRepository.setPriority(conversationId, workspaceId, priority);
}

/**
 * A human assigning a conversation to a teammate — the manual counterpart to
 * automation's own "assign_agent" action. Closes PART 5's automation-events
 * gap: previously only an AI/automation-driven assignment dispatched
 * anything, so a workflow could never react to a person doing the same thing.
 */
async function assignConversation(workspaceId: string, conversationId: string, userId: string): Promise<void> {
  const item = await conversationRepository.findById(conversationId, workspaceId);
  if (!item) throw new AppError("NOT_FOUND", "Conversation not found.");

  const member = await membershipRepository.findByUserAndWorkspace(userId, workspaceId);
  if (!member) throw new AppError("NOT_FOUND", "That team member is no longer part of this workspace.");

  const assignedUser = await userRepository.findById(userId);
  await conversationRepository.assign(conversationId, workspaceId, userId);
  await activityRepository.log({
    workspaceId,
    contactId: item.contact.id,
    type: "conversation_assigned",
    actor: { type: "human", userId },
    summary: `Conversation assigned to ${assignedUser?.email ?? "a team member"}.`,
    link: `/dashboard/inbox/${conversationId}`,
  });
  await automationService.dispatch(workspaceId, { type: "conversation_assigned", contactId: item.contact.id });
  await notificationRepository.create({
    workspaceId,
    type: "assignment",
    title: `Assigned: ${item.contact.fullName}`,
    message: `${item.contact.fullName}'s conversation was assigned to ${assignedUser?.email ?? "a team member"}.`,
    link: `/dashboard/inbox/${conversationId}`,
  });
}

/**
 * Drafts a reply for a human agent to review/edit before sending — never
 * auto-sent and never runs tools (same "no context = no tool-calling" path
 * as the test-your-AI-employee screen), unlike triggerAiReply's autonomous
 * send. Closes the Message Composer's "AI suggestion" gap.
 */
async function suggestReply(workspaceId: string, conversationId: string): Promise<string> {
  const item = await conversationRepository.findById(conversationId, workspaceId);
  if (!item) throw new AppError("NOT_FOUND", "Conversation not found.");

  const history = await messageRepository.findByConversationId(conversationId, workspaceId);
  const result = await aiService.generateReply(workspaceId, toChatHistory(history));
  return result.text;
}

/**
 * An explicit, immediate handover — distinct from pauseAi (a human is just
 * temporarily taking over but the AI could resume) and from the AI's own
 * needsHumanHandover path. Closes the Message Composer's "explicit hand to
 * human" gap: previously the only manual control was pause/resume.
 */
async function handToHuman(workspaceId: string, conversationId: string, userId: string): Promise<void> {
  const item = await conversationRepository.findById(conversationId, workspaceId);
  if (!item) throw new AppError("NOT_FOUND", "Conversation not found.");

  await conversationRepository.updateAiStatus(conversationId, workspaceId, "handed_over");
  await automationService.dispatch(workspaceId, { type: "conversation_handed_over", contactId: item.contact.id });
  await activityRepository.log({
    workspaceId,
    contactId: item.contact.id,
    type: "conversation_handed_over",
    actor: { type: "human", userId },
    summary: "A team member took the conversation over from the AI.",
    link: `/dashboard/inbox/${conversationId}`,
  });
  await notificationRepository.create({
    workspaceId,
    type: "human_handover",
    title: `Handover: ${item.contact.fullName}`,
    message: `A team member took ${item.contact.fullName}'s conversation over from the AI.`,
    link: `/dashboard/inbox/${conversationId}`,
  });
}

export const inboxService = {
  listConversations,
  getConversation,
  startConversation,
  logCustomerMessage,
  sendAgentReply,
  resumeAi,
  pauseAi,
  closeConversation,
  reopenConversation,
  setPinned,
  setPriority,
  assignConversation,
  suggestReply,
  handToHuman,
};
