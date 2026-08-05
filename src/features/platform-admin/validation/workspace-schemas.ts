import { z } from "zod";
import { subscriptionStatusEnum } from "@/db/schema";

export const updateWorkspaceSubscriptionSchema = z.object({
  workspaceId: z.string().uuid(),
  status: z.enum(subscriptionStatusEnum.enumValues),
});
