"use server";

import { workspaceRepository } from "@/features/workspace/repository/workspace.repository";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";
import { checkRateLimit } from "@/lib/rate-limit/rate-limit";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { storefrontAnalyticsService } from "../services/storefront-analytics.service";
import { storefrontService } from "../services/storefront.service";
import { submitOrderSchema } from "../validation/schemas";

/** Same zero-auth, rate-limited-by-phone shape as submitInquiryAction — see that file's own comment. */
export async function submitOrderAction(input: unknown): Promise<ActionResult<{ orderId: string }>> {
  const parsed = submitOrderSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    const allowed = await checkRateLimit(`storefront-order:${parsed.data.phone}`, { windowSeconds: 60 * 60, max: 5 });
    if (!allowed) {
      throw new AppError("RATE_LIMITED", "Too many orders submitted. Please try again later.");
    }

    const workspace = await workspaceRepository.findBySlug(parsed.data.slug);
    if (!workspace) throw new AppError("NOT_FOUND", "This store no longer exists.");

    const storefront = await storefrontRepository.findByWorkspaceId(workspace.id);
    if (!storefront?.isPublished) throw new AppError("NOT_FOUND", "This store is not currently open.");

    const result = await storefrontService.submitOrder(workspace.id, {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      deliveryAddress: parsed.data.deliveryAddress,
      notes: parsed.data.notes,
      items: parsed.data.items,
    });

    await storefrontAnalyticsService.trackFormSubmission(workspace.id, "order");

    return actionOk({ orderId: result.order.id });
  } catch (error) {
    return actionFail(error);
  }
}
