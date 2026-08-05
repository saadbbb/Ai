"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrderStatus } from "@/db/schema";
import { updateOrderStatusAction } from "../actions/update-order-status.action";

const STATUSES: OrderStatus[] = [
  "draft",
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
];

export function OrderStatusSelect({ orderId, initialStatus }: { orderId: string; initialStatus: OrderStatus }) {
  const t = useTranslations("orders");
  const [status, setStatus] = useState(initialStatus);

  async function handleChange(next: OrderStatus) {
    const previous = status;
    setStatus(next);

    const result = await updateOrderStatusAction({ orderId, status: next });
    if (!result.success) {
      toast.error(result.error.message);
      setStatus(previous);
    }
  }

  return (
    <Select value={status} onValueChange={(value) => handleChange(value as OrderStatus)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((option) => (
          <SelectItem key={option} value={option}>
            {t(`statuses.${option}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
