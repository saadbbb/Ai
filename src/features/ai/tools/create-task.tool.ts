import "server-only";
import { z } from "zod";
import { activityRepository } from "@/features/crm/repository/activity.repository";
import { taskRepository } from "@/features/crm/repository/task.repository";
import type { AiTool, ToolContext } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  dueInDays: z.coerce.number().int().min(0).max(90).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

/**
 * PART 5's "AI Inside CRM" AI-suggested tasks — a follow-up the AI decided a
 * team member needs to do that doesn't warrant a full human handover (e.g.
 * "call back with a quote next week"). No createdByUserId — that column is
 * nullable specifically for this: a task with no human creator is a real,
 * valid state, not an error.
 */
async function execute(context: ToolContext, input: z.infer<typeof schema>): Promise<string> {
  const dueAt = input.dueInDays !== undefined ? new Date(Date.now() + input.dueInDays * DAY_MS) : null;

  const task = await taskRepository.create({
    workspaceId: context.workspaceId,
    contactId: context.contactId,
    title: input.title,
    dueAt,
    priority: input.priority,
  });

  await activityRepository.log({
    workspaceId: context.workspaceId,
    contactId: context.contactId,
    type: "task_created",
    actor: { type: "ai" },
    summary: `AI created a follow-up task: "${task.title}"`,
  });

  return `Created a follow-up task for the team: "${task.title}".`;
}

export const createTaskTool: AiTool<z.infer<typeof schema>> = {
  name: "create_task",
  description:
    "Create a follow-up task for the team when something needs a person to do later — not urgent enough for " +
    "an immediate handover, but shouldn't be forgotten (e.g. \"call back next week with a quote\", \"check stock " +
    "and confirm availability\"). Don't use this for things you can just answer yourself.",
  schema,
  jsonSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "A short, clear description of what needs to be done." },
      dueInDays: { type: "number", description: "How many days from now this is due, if there's a natural deadline." },
      priority: { type: "string", enum: ["low", "medium", "high"], description: "How urgent this follow-up is." },
    },
    required: ["title"],
    additionalProperties: false,
  },
  execute,
};
