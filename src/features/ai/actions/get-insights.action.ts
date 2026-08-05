"use server";

import { z } from "zod";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, type ActionResult } from "@/lib/errors/app-error";
import { insightsService, type InsightsResult } from "../services/insights.service";

const inputSchema = z.object({ forceRefresh: z.boolean().optional() });

export async function getInsightsAction(input: unknown): Promise<ActionResult<InsightsResult>> {
  const parsed = inputSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  try {
    const result = await insightsService.getInsights(workspace.id, parsed.data.forceRefresh);
    return actionOk(result);
  } catch (error) {
    return actionFail(error);
  }
}
