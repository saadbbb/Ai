import { z } from "zod";
import { billingCycleEnum } from "@/db/schema";
import { FEATURE_KEYS } from "../lib/features";

export const planFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  billingCycle: z.enum(billingCycleEnum.enumValues),
  defaultDurationDays: z.coerce.number().int().positive().max(3650),
  enabledFeatures: z.array(z.enum(FEATURE_KEYS)),
  // Optional on purpose — a plan can exist unpriced; see the comment on plans.price.
  price: z.coerce
    .number()
    .nonnegative()
    .max(999_999_999)
    .transform((value) => value.toFixed(2))
    .optional(),
});

export const deletePlanSchema = z.object({ id: z.string().uuid() });

export const activateSubscriptionSchema = z.object({
  workspaceId: z.string().uuid(),
  planId: z.string().uuid(),
  days: z.coerce.number().int().positive().max(3650),
});
