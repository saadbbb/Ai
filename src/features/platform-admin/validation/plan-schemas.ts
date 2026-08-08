import { z } from "zod";
import { billingCycleEnum, currencyEnum } from "@/db/schema";
import { FEATURE_KEYS } from "../lib/features";

// Every limit is optional — omitted/empty means "unlimited," matching the nullable
// plans.max* columns (see the schema comment there for why maxStorageMb/maxApiCallsPerMonth
// are collected but not yet enforced).
const usageLimitSchema = z.coerce.number().int().positive().max(1_000_000).optional();

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
  currency: z.enum(currencyEnum.enumValues).optional(),
  maxUsers: usageLimitSchema,
  maxAiAgents: usageLimitSchema,
  maxChannels: usageLimitSchema,
  maxConversationsPerMonth: usageLimitSchema,
  maxStorageMb: usageLimitSchema,
  maxKnowledgeFiles: usageLimitSchema,
  maxAutomationWorkflows: usageLimitSchema,
  maxApiCallsPerMonth: usageLimitSchema,
  maxIntegrations: usageLimitSchema,
});

export const deletePlanSchema = z.object({ id: z.string().uuid() });

export const activateSubscriptionSchema = z.object({
  workspaceId: z.string().uuid(),
  planId: z.string().uuid(),
  days: z.coerce.number().int().positive().max(3650),
  couponCode: z.string().trim().min(1).max(50).optional(),
});

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(50)
      .transform((value) => value.toUpperCase()),
    type: z.enum(["percentage", "fixed"]),
    value: z.coerce.number().positive().max(999_999_999),
    maxRedemptions: z.coerce.number().int().positive().max(1_000_000).optional(),
    expiresAt: z.coerce.date().optional(),
  })
  .refine((data) => data.type !== "percentage" || data.value <= 100, {
    message: "A percentage coupon can't discount more than 100%.",
    path: ["value"],
  })
  .transform((data) => ({ ...data, value: data.value.toFixed(2) }));

export const setCouponActiveSchema = z.object({ id: z.string().uuid(), isActive: z.boolean() });

export const createRefundSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.coerce
    .number()
    .positive()
    .max(999_999_999)
    .transform((value) => value.toFixed(2)),
  reason: z.string().trim().min(1).max(500),
});

export const decideRefundSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected", "completed"]),
});
