import type { Refund, RefundStatus } from "@/db/schema";
import { notifyWorkspaceOwner } from "@/features/notifications/services/notify-owner.service";
import { AppError } from "@/lib/errors/app-error";
import { invoiceRepository } from "../repository/invoice.repository";
import { refundRepository } from "../repository/refund.repository";
import { canTransitionRefundStatus } from "../lib/refund-status";

const STATUS_MESSAGE: Record<Extract<RefundStatus, "approved" | "rejected" | "completed">, string> = {
  approved: "Your refund request has been approved and will be processed shortly.",
  rejected: "Your refund request was not approved.",
  completed: "Your refund has been completed.",
};

export const refundService = {
  async create(invoiceId: string, amount: string, reason: string): Promise<Refund> {
    const invoice = await invoiceRepository.findByIdAny(invoiceId);
    if (!invoice) throw new AppError("NOT_FOUND", "Invoice not found.");
    if (invoice.status !== "paid") {
      throw new AppError("VALIDATION_ERROR", "Only a paid invoice can be refunded.");
    }

    const existing = await refundRepository.findByInvoiceId(invoiceId);
    const alreadyRefunded = existing
      .filter((refund) => refund.status !== "rejected")
      .reduce((sum, refund) => sum + Number(refund.amount), 0);
    if (alreadyRefunded + Number(amount) > Number(invoice.amount)) {
      throw new AppError("VALIDATION_ERROR", "Refund amount exceeds the invoice's remaining refundable balance.");
    }

    return refundRepository.create({
      workspaceId: invoice.workspaceId,
      invoiceId: invoice.id,
      amount,
      currency: invoice.currency,
      reason,
      status: "requested",
    });
  },

  async decide(id: string, status: Extract<RefundStatus, "approved" | "rejected" | "completed">): Promise<Refund> {
    const refund = await refundRepository.findById(id);
    if (!refund) throw new AppError("NOT_FOUND", "Refund not found.");
    if (!canTransitionRefundStatus(refund.status, status)) {
      throw new AppError("VALIDATION_ERROR", `Cannot move a refund from "${refund.status}" to "${status}".`);
    }

    const updated = await refundRepository.updateStatus(id, status, new Date());
    if (!updated) throw new AppError("NOT_FOUND", "Refund not found.");

    await notifyWorkspaceOwner({
      workspaceId: updated.workspaceId,
      type: "billing",
      title: `Refund ${status}`,
      message: STATUS_MESSAGE[status],
      link: "/dashboard/billing",
    });

    return updated;
  },
};
