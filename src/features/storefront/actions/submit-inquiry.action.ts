"use server";

import { workspaceRepository } from "@/features/workspace/repository/workspace.repository";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";
import { checkRateLimit } from "@/lib/rate-limit/rate-limit";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { storefrontAnalyticsService } from "../services/storefront-analytics.service";
import { storefrontService } from "../services/storefront.service";
import { submitInquirySchema } from "../validation/schemas";

/**
 * The one write path in this app reachable with no authentication at all —
 * rate-limited by phone number (not by workspace, so one visitor spamming
 * different stores is still throttled) since there's no account to key on.
 */
export async function submitInquiryAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = submitInquirySchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    const allowed = await checkRateLimit(`storefront-inquiry:${parsed.data.phone}`, { windowSeconds: 60 * 60, max: 5 });
    if (!allowed) {
      throw new AppError("RATE_LIMITED", "Too many inquiries sent. Please try again later.");
    }

    const workspace = await workspaceRepository.findBySlug(parsed.data.slug);
    if (!workspace) throw new AppError("NOT_FOUND", "This store no longer exists.");

    const storefront = await storefrontRepository.findByWorkspaceId(workspace.id);
    if (!storefront?.isPublished) throw new AppError("NOT_FOUND", "This store is not currently open.");

    await storefrontService.submitInquiry(workspace.id, {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      message: parsed.data.message,
      formType: parsed.data.formType,
    });
    await storefrontAnalyticsService.trackFormSubmission(workspace.id, parsed.data.formType ?? "contact");

    return actionOk(null);
  } catch (error) {
    return actionFail(error);
  }
}
