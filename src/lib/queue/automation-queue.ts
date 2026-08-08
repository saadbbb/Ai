import "server-only";
import { Queue } from "bullmq";
import type { AutomationEvent } from "@/features/automation/services/automation.service";
import { createQueueRedisConnection } from "./connection";

export const AUTOMATION_QUEUE_NAME = "automation-events";

export interface AutomationJobData {
  workspaceId: string;
  event: AutomationEvent;
}

/** How long dispatch() waits for the enqueue itself before giving up and running inline instead. */
const ENQUEUE_TIMEOUT_MS = 2000;

declare global {
  var __automationQueue: Queue<AutomationJobData> | null | undefined;
}

function getQueue(): Queue<AutomationJobData> | null {
  if (globalThis.__automationQueue !== undefined) return globalThis.__automationQueue;

  const connection = createQueueRedisConnection();
  const queue = connection ? new Queue<AutomationJobData>(AUTOMATION_QUEUE_NAME, { connection }) : null;
  if (process.env.NODE_ENV !== "production") globalThis.__automationQueue = queue;
  return queue;
}

/**
 * Enqueues an automation event for the dedicated worker process (see
 * scripts/automation-worker.ts) to pick up, instead of running it inline in
 * the request that triggered it — see PART 2/6 of the spec ("execution must
 * be asynchronous, never block the request that triggered it").
 *
 * Returns false — never throws — when no Redis is configured (see
 * DEFERRED_TASKS.md) or the enqueue doesn't complete within
 * ENQUEUE_TIMEOUT_MS, so automationService.dispatch() can fall back to
 * running the event inline rather than silently dropping it. The timeout
 * race is a deliberate second layer on top of the connection's own
 * connectTimeout/retryStrategy — a real bug in this codebase (2026-08-05,
 * see src/lib/redis/client.ts) came from a "no Redis configured" fallback
 * that didn't actually fail fast, so this doesn't rely on ioredis options
 * alone to guarantee it.
 */
export async function enqueueAutomationEvent(data: AutomationJobData): Promise<boolean> {
  const queue = getQueue();
  if (!queue) return false;

  const attempt = queue
    .add("event", data, { removeOnComplete: true, removeOnFail: 100 })
    .then(() => true)
    .catch((error: unknown) => {
      console.error("[automation-queue] enqueue failed:", error);
      return false;
    });

  const timeout = new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(false), ENQUEUE_TIMEOUT_MS);
  });

  return Promise.race([attempt, timeout]);
}
