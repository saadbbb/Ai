import { z } from "zod";
import { subscriptionStatusEnum } from "@/db/schema";

export const updateWorkspaceSubscriptionSchema = z.object({
  workspaceId: z.string().uuid(),
  status: z.enum(subscriptionStatusEnum.enumValues),
});

export const deleteWorkspaceSchema = z.object({
  workspaceId: z.string().uuid(),
  confirmSlug: z.string().trim().min(1),
});
