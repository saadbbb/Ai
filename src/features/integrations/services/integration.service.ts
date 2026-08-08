import "server-only";
import type { ApiKey, Lead, WebhookSubscription } from "@/db/schema";
import { safeWebhookPost } from "@/features/automation/lib/safe-webhook-fetch";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { leadRepository } from "@/features/crm/repository/lead.repository";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { workspaceAuditLogRepository } from "@/features/workspace/repository/workspace-audit-log.repository";
import { AppError } from "@/lib/errors/app-error";
import { apiKeyRepository } from "../repository/api-key.repository";
import { webhookDeliveryRepository } from "../repository/webhook-delivery.repository";
import { webhookSubscriptionRepository } from "../repository/webhook-subscription.repository";
import { generateApiKey, hashApiKey } from "../lib/api-key";
import { generateWebhookSecret, signWebhookPayload } from "../lib/webhook-signature";

interface IntegrationActor {
  userId: string;
  email: string;
}

async function listApiKeys(workspaceId: string): Promise<ApiKey[]> {
  return apiKeyRepository.findByWorkspaceId(workspaceId);
}

/** The plaintext key is returned once, here, and never again — the caller must show it to the user immediately. */
async function createApiKey(workspaceId: string, name: string, actor: IntegrationActor): Promise<{ apiKey: ApiKey; plaintext: string }> {
  const generated = generateApiKey();
  const apiKey = await apiKeyRepository.create({
    workspaceId,
    name,
    keyPrefix: generated.displayPrefix,
    keyHash: generated.hash,
  });

  await workspaceAuditLogRepository.log({
    workspaceId,
    actorUserId: actor.userId,
    actorEmail: actor.email,
    action: "api_key_created",
    targetType: "api_key",
    targetId: apiKey.id,
    summary: `Created API key "${name}".`,
  });

  return { apiKey, plaintext: generated.plaintext };
}

async function revokeApiKey(workspaceId: string, id: string, actor: IntegrationActor): Promise<ApiKey> {
  const revoked = await apiKeyRepository.revoke(id, workspaceId);
  if (!revoked) throw new AppError("NOT_FOUND", "API key not found.");

  await workspaceAuditLogRepository.log({
    workspaceId,
    actorUserId: actor.userId,
    actorEmail: actor.email,
    action: "api_key_revoked",
    targetType: "api_key",
    targetId: id,
    summary: `Revoked API key "${revoked.name}".`,
  });

  return revoked;
}

/** Public-API auth entry point — resolves a workspaceId from the raw `Authorization: Bearer <key>` value, or null if invalid/revoked. */
async function authenticateApiKey(plaintext: string): Promise<string | null> {
  const key = await apiKeyRepository.findActiveByHash(hashApiKey(plaintext));
  if (!key) return null;
  await apiKeyRepository.touchLastUsed(key.id);
  return key.workspaceId;
}

async function listWebhookSubscriptions(workspaceId: string): Promise<WebhookSubscription[]> {
  return webhookSubscriptionRepository.findByWorkspaceId(workspaceId);
}

async function createWebhookSubscription(
  workspaceId: string,
  url: string,
  eventTypes: string[],
  actor: IntegrationActor,
): Promise<WebhookSubscription> {
  if (!url.startsWith("https://")) {
    throw new AppError("VALIDATION_ERROR", "Webhook URL must use https://.");
  }
  const subscription = await webhookSubscriptionRepository.create({ workspaceId, url, eventTypes, secret: generateWebhookSecret() });

  await workspaceAuditLogRepository.log({
    workspaceId,
    actorUserId: actor.userId,
    actorEmail: actor.email,
    action: "webhook_created",
    targetType: "webhook_subscription",
    targetId: subscription.id,
    summary: `Created a webhook subscription to ${url}.`,
  });

  return subscription;
}

async function setWebhookSubscriptionActive(workspaceId: string, id: string, isActive: boolean): Promise<WebhookSubscription> {
  const updated = await webhookSubscriptionRepository.setActive(id, workspaceId, isActive);
  if (!updated) throw new AppError("NOT_FOUND", "Webhook subscription not found.");
  return updated;
}

async function deleteWebhookSubscription(workspaceId: string, id: string, actor: IntegrationActor): Promise<void> {
  await webhookSubscriptionRepository.delete(id, workspaceId);

  await workspaceAuditLogRepository.log({
    workspaceId,
    actorUserId: actor.userId,
    actorEmail: actor.email,
    action: "webhook_revoked",
    targetType: "webhook_subscription",
    targetId: id,
    summary: "Removed a webhook subscription.",
  });
}

/** Recent delivery attempts for one subscription, newest first — Integrations Monitoring depth (PART 13 gap #165). */
async function listWebhookDeliveries(subscriptionId: string) {
  return webhookDeliveryRepository.findBySubscriptionId(subscriptionId);
}

/**
 * Called from automationService.dispatch() for every event that already
 * flows through the automation engine — piggybacking on that single existing
 * chokepoint means every workflow trigger type is automatically also a valid
 * webhook subscription event, with no new call sites scattered across the
 * app. Best-effort per subscription: one failing endpoint never blocks
 * delivery to the others, and never propagates back to automation dispatch.
 * Every attempt (success or failure) is logged to `webhook_deliveries` so
 * Monitoring (#165) has something real to show — no automatic retries yet,
 * a real, contained follow-up once this log surfaces a need for one.
 */
async function notifyWebhookSubscribers(workspaceId: string, event: { type: string; [key: string]: unknown }): Promise<void> {
  const subscriptions = await webhookSubscriptionRepository.findActiveByWorkspaceAndEvent(workspaceId, event.type);
  if (subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const payload = { event: event.type, data: event, timestamp: new Date().toISOString() };
      try {
        await safeWebhookPost(subscription.url, payload, {
          "X-Webhook-Signature": signWebhookPayload(subscription.secret, payload),
        });
        await webhookDeliveryRepository.create({
          workspaceId,
          subscriptionId: subscription.id,
          eventType: event.type,
          success: true,
        });
      } catch (error) {
        console.error(`[integrations] webhook delivery to ${subscription.url} failed:`, error);
        await webhookDeliveryRepository.create({
          workspaceId,
          subscriptionId: subscription.id,
          eventType: event.type,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),
  );
}

interface CreateLeadViaApiInput {
  fullName: string;
  phone?: string;
  email?: string;
}

/**
 * The public /api/v1/leads endpoint's handler. Dynamically imports
 * automationService — a static top-level import here would create a
 * circular module graph, since automation.service.ts's dispatch() already
 * calls back into this file's notifyWebhookSubscribers (see that function's
 * own comment). Same resolution already used by automation's send_ai_reply
 * action for the equivalent problem with ai.service.ts.
 */
async function createLeadViaApi(workspaceId: string, input: CreateLeadViaApiInput): Promise<{ contactId: string; leadId: string }> {
  const contact = await contactRepository.create({
    workspaceId,
    fullName: input.fullName,
    phone: input.phone || null,
    email: input.email || null,
    source: "API",
  });

  const lead: Lead = await leadRepository.create({ workspaceId, contactId: contact.id, conversationId: null });

  await activityRepository.log({
    workspaceId,
    contactId: contact.id,
    type: "lead_created",
    actor: { type: "system" },
    summary: "Lead created via the public API.",
  });

  const { automationService } = await import("@/features/automation/services/automation.service");
  await automationService.dispatch(workspaceId, { type: "lead_created", contactId: contact.id });

  return { contactId: contact.id, leadId: lead.id };
}

export const integrationService = {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  authenticateApiKey,
  listWebhookSubscriptions,
  createWebhookSubscription,
  setWebhookSubscriptionActive,
  deleteWebhookSubscription,
  listWebhookDeliveries,
  notifyWebhookSubscribers,
  createLeadViaApi,
};
