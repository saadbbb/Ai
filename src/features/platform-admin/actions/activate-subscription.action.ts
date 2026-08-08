"use server";

import type { Workspace } from "@/db/schema";
import { requireWritePlatformAdmin } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { auditLogRepository } from "../repository/audit-log.repository";
import { planRepository } from "../repository/plan.repository";
import { workspaceAdminRepository } from "../repository/workspace-admin.repository";
import { couponService } from "../services/coupon.service";
import { invoiceService } from "../services/invoice.service";
import { activateSubscriptionSchema } from "../validation/plan-schemas";

export async function activateSubscriptionAction(input: unknown): Promise<ActionResult<Workspace>> {
  const parsed = activateSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const admin = await requireWritePlatformAdmin();

  try {
    const workspace = await workspaceAdminRepository.activateSubscription(
      parsed.data.workspaceId,
      parsed.data.planId,
      parsed.data.days,
    );
    if (!workspace) throw new AppError("NOT_FOUND", "Workspace not found.");

    const plan = await planRepository.findById(parsed.data.planId);
    if (plan) {
      // Validated (and, on success, redeemed) here rather than earlier â€” a coupon
      // should never be consumed for an activation that ends up failing.
      const application = plan.price && parsed.data.couponCode ? await couponService.validate(parsed.data.couponCode, plan.price) : null;

      await invoiceService.generateForActivation(workspace, plan, parsed.data.days, application?.discountedAmount);

      if (application) {
        await couponService.redeem(application.coupon.id);
      }
    }

    await auditLogRepository.log({
      actorUserId: admin.id,
      actorEmail: admin.email,
      action: "subscription_activated",
      targetType: "workspace",
      targetId: workspace.id,
      summary: `Activated a ${parsed.data.days}-day subscription for "${workspace.name}".`,
      metadata: { planId: parsed.data.planId, days: parsed.data.days, couponCode: parsed.data.couponCode },
    });

    return actionOk(workspace);
  } catch (error) {
    return actionFail(error);
  }
}
