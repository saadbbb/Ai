import { Worker } from "bullmq";
import type { AutomationJobData } from "../src/lib/queue/automation-queue";
import { AUTOMATION_QUEUE_NAME } from "../src/lib/queue/automation-queue";
import { createQueueRedisConnection } from "../src/lib/queue/connection";
import { automationService } from "../src/features/automation/services/automation.service";

/**
 * The dedicated worker process PART 2 of the spec calls for — "a single
 * dedicated worker service (outside Vercel's serverless functions) runs the
 * BullMQ consumers." Run it with `pnpm run worker` (same --env-file
 * convention as `pnpm run db:seed`). Needs its own always-on host once
 * deployed (Vercel serverless can't run a long-lived process) — that's a
 * deployment decision for later, not something this script itself needs.
 */
const connection = createQueueRedisConnection();
if (!connection) {
  console.error("[automation-worker] REDIS_URL is not set — nothing to consume. Exiting.");
  process.exit(1);
}

const worker = new Worker<AutomationJobData>(
  AUTOMATION_QUEUE_NAME,
  async (job) => {
    await automationService.processEvent(job.data.workspaceId, job.data.event);
  },
  { connection },
);

worker.on("failed", (job, error) => {
  console.error(`[automation-worker] job ${job?.id} failed:`, error);
});

worker.on("ready", () => {
  console.log("[automation-worker] connected, listening for automation events...");
});

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
