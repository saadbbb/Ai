"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { RefundStatus } from "@/db/schema";
import type { InvoiceWithWorkspace } from "../repository/invoice.repository";
import type { RefundWithWorkspace } from "../repository/refund.repository";
import { createRefundAction } from "../actions/create-refund.action";
import { decideRefundAction } from "../actions/decide-refund.action";

const NEXT_STATUS: Record<RefundStatus, RefundStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["completed", "rejected"],
  rejected: [],
  completed: [],
};

export function RefundManager({
  initialRefunds,
  invoices,
}: {
  initialRefunds: RefundWithWorkspace[];
  invoices: InvoiceWithWorkspace[];
}) {
  const t = useTranslations("platformAdmin.refunds");
  const [refunds, setRefunds] = useState(initialRefunds);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const paidInvoices = invoices.filter((row) => row.invoice.status === "paid");

  async function handleCreate() {
    if (!invoiceId || !amount.trim() || !reason.trim()) return;

    setIsSaving(true);
    const result = await createRefundAction({ invoiceId, amount, reason });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    const workspaceName = invoices.find((row) => row.invoice.id === invoiceId)?.workspaceName ?? "";
    setRefunds((current) => [{ refund: result.data, workspaceName }, ...current]);
    setInvoiceId("");
    setAmount("");
    setReason("");
  }

  async function handleDecide(id: string, status: RefundStatus) {
    setDecidingId(id);
    const result = await decideRefundAction({ id, status });
    setDecidingId(null);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setRefunds((current) => current.map((row) => (row.refund.id === id ? { ...row, refund: result.data } : row)));
  }

  return (
    <div className="space-y-4">
      {refunds.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {refunds.map(({ refund, workspaceName }) => (
            <div key={refund.id} className="flex items-center justify-between gap-2 p-3 text-sm">
              <div>
                <p className="font-medium">
                  {workspaceName} · {refund.amount} {refund.currency}
                </p>
                <p className="text-xs text-muted-foreground">
                  {refund.reason} · {t(`status.${refund.status}`)}
                </p>
              </div>
              <div className="flex gap-2">
                {NEXT_STATUS[refund.status].map((next) => (
                  <Button
                    key={next}
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={decidingId === refund.id}
                    onClick={() => handleDecide(refund.id, next)}
                  >
                    {t(`action.${next}`)}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-dashed p-4">
        <Select value={invoiceId} onValueChange={setInvoiceId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("invoicePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {paidInvoices.map((row) => (
              <SelectItem key={row.invoice.id} value={row.invoice.id}>
                {row.workspaceName} · {row.invoice.invoiceNumber} · {row.invoice.amount} {row.invoice.currency}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={t("amountPlaceholder")}
          />
        </div>
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t("reasonPlaceholder")} />
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={handleCreate}>
            {t("createRefund")}
          </Button>
        </div>
      </div>
    </div>
  );
}
