"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Order } from "@/db/schema";
import { updateOrderShippingAction } from "../actions/update-order-shipping.action";

export function ShippingForm({ order }: { order: Order }) {
  const t = useTranslations("orders.shipping");
  const [shippingCarrier, setShippingCarrier] = useState(order.shippingCarrier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    const result = await updateOrderShippingAction({
      orderId: order.id,
      shippingCarrier: shippingCarrier || undefined,
      trackingNumber: trackingNumber || undefined,
      trackingUrl: trackingUrl || undefined,
    });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success(t("saved"));
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium">{t("heading")}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={shippingCarrier} onChange={(event) => setShippingCarrier(event.target.value)} placeholder={t("carrierPlaceholder")} />
        <Input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder={t("trackingNumberPlaceholder")} />
      </div>
      <Input value={trackingUrl} onChange={(event) => setTrackingUrl(event.target.value)} placeholder={t("trackingUrlPlaceholder")} />
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={handleSave}>
          {isSaving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
