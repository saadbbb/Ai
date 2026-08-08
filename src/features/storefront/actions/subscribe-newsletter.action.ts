"use server";

import { workspaceRepository } from "@/features/workspace/repository/workspace.repository";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";
import { checkRateLimit } from "@/lib/rate-limit/rate-limit";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { storefrontAnalyticsService } from "../services/storefront-analytics.service";
import { storefrontService } from "../services/storefront.service";
import { subscribeNewsletterSchema } from "../validation/schemas";

/** Same zero-auth shape as submitInquiryAction, rate-limited by email since there's no phone here. */
export async function subscribeNewsletterAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = subscribeNewsletterSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    const allowed = await checkRateLimit(`storefront-newsletter:${parsed.data.email}`, {
      windowSeconds: 60 * 60,
      max: 5,
    });
    if (!allowed) {
      throw new AppError("RATE_LIMITED", "Too many attempts. Please try again later.");
    }

    const workspace = await workspaceRepository.findBySlug(parsed.data.slug);
    if (!workspace) throw new AppError("NOT_FOUND", "This store no longer exists.");

    const storefront = await storefrontRepository.findByWorkspaceId(workspace.id);
    if (!storefront?.isPublished) throw new AppError("NOT_FOUND", "This store is not currently open.");

    await storefrontService.subscribeToNewsletter(workspace.id, parsed.data.email);
    await storefrontAnalyticsService.trackFormSubmission(workspace.id, "newsletter");

    return actionOk(null);
  } catch (error) {
    return actionFail(error);
  }
}
