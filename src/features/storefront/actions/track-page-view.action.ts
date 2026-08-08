"use server";

import { z } from "zod";
import { workspaceRepository } from "@/features/workspace/repository/workspace.repository";
import { storefrontAnalyticsService } from "../services/storefront-analytics.service";

const trackPageViewSchema = z.object({
  slug: z.string().trim().min(1),
  path: z.string().trim().min(1).max(300),
});

/** Fire-and-forget from the client on every storefront page load — see storefront-analytics.service.ts. */
export async function trackPageViewAction(input: unknown): Promise<void> {
  const parsed = trackPageViewSchema.safeParse(input);
  if (!parsed.success) return;

  const workspace = await workspaceRepository.findBySlug(parsed.data.slug);
  if (!workspace) return;

  await storefrontAnalyticsService.trackPageView(workspace.id, parsed.data.path);
}
