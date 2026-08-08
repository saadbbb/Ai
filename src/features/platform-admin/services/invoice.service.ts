import "server-only";
import type { Invoice, Plan, Workspace } from "@/db/schema";
import { notifyWorkspaceOwner } from "@/features/notifications/services/notify-owner.service";
import { invoiceRepository } from "../repository/invoice.repository";

async function nextInvoiceNumber(): Promise<string> {
  const existing = await invoiceRepository.countAll();
  return `INV-${String(existing + 1).padStart(6, "0")}`;
}

/**
 * Called right after workspaceAdminRepository.activateSubscription() —
 * an admin activating a subscription in this manual-billing model (see
 * DEFERRED_TASKS.md) IS the recorded payment confirmation, so the invoice is
 * created already "paid," not "pending." Deliberately creates nothing when
 * the plan has no price set (see plans.price's schema comment) — inventing
 * an amount to bill would be worse than not generating an invoice at all.
 * amountOverride carries a coupon-discounted amount (see coupon.service.ts)
 * when one was applied — the invoice always reflects what was actually billed.
 */
async function generateForActivation(workspace: Workspace, plan: Plan, days: number, amountOverride?: string): Promise<Invoice | null> {
  if (!plan.price) return null;

  const invoiceNumber = await nextInvoiceNumber();
  const now = new Date();
  const amount = amountOverride ?? plan.price;

  const invoice = await invoiceRepository.create({
    workspaceId: workspace.id,
    planId: plan.id,
    planName: plan.name,
    invoiceNumber,
    amount,
    currency: plan.currency,
    status: "paid",
    periodDays: days,
    issuedAt: now,
    paidAt: now,
    dueAt: null,
  });

  await notifyWorkspaceOwner({
    workspaceId: workspace.id,
    type: "billing",
    title: `Invoice ${invoiceNumber} generated`,
    message: `Your subscription to "${plan.name}" was activated for ${days} days. Invoice ${invoiceNumber} for ${amount} ${plan.currency} has been generated.`,
    link: "/dashboard/billing",
  });

  return invoice;
}

async function listForWorkspace(workspaceId: string): Promise<Invoice[]> {
  return invoiceRepository.findByWorkspaceId(workspaceId);
}

export const invoiceService = {
  generateForActivation,
  listForWorkspace,
};
