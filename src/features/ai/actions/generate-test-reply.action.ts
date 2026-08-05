"use server";

import { z } from "zod";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import type { GenerateReplyResult } from "../providers/types";
import { aiService } from "../services/ai.service";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1),
});

const inputSchema = z.object({
  history: z.array(chatMessageSchema).min(1).max(50),
});

export async function generateTestReplyAction(input: unknown): Promise<ActionResult<GenerateReplyResult>> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    const result = await aiService.generateReply(workspace.id, parsed.data.history);
    return actionOk(result);
  } catch (error) {
    return actionFail(error);
  }
}
