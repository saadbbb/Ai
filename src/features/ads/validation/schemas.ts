import { z } from "zod";

export const createAdCampaignSchema = z.object({
  name: z.string().trim().min(1).max(200),
  utmCampaign: z.string().trim().min(1).max(100),
  budget: z.coerce.number().nonnegative().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const updateAdCampaignStatusSchema = z.object({
  campaignId: z.string().uuid(),
  status: z.enum(["active", "paused", "ended"]),
});

export const updateAdCampaignSpendSchema = z.object({
  campaignId: z.string().uuid(),
  actualSpend: z.coerce.number().nonnegative(),
});
