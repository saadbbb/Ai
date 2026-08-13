"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "../lib/cart-context";
import { submitOrderAction } from "../actions/submit-order.action";
import { trackEvent } from "../lib/track-event";

export function CheckoutForm({ slug }: { slug: string }) {
  const t = useTranslations("website.public");
  const { items, updateQuantity, removeItem, clear } = useCart();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const total = items.reduce((sum, item) => sum + Number.parseFloat(item.unitPrice || "0") * item.quantity, 0);

  async function handleSubmit() {
    if (!fullName.trim() || !phone.trim() || items.length === 0) {
      toast.error(t("checkoutRequiredHint"));
      return;
    }

    setIsSubmitting(true);
    const result = await submitOrderAction({
      slug,
      fullName,
      phone,
      deliveryAddress: deliveryAddress || undefined,
      notes: notes || undefined,
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setOrderId(result.data.orderId);
    trackEvent("Purchase", { value: total });
    clear();
  }

  if (orderId) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-lg font-medium">{t("orderPlacedHeading")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("orderPlacedHint")}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t("cartEmpty")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="divide-y rounded-lg border">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.unitPrice}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={item.quantity}
                onChange={(event) => updateQuantity(item.productId, Number.parseInt(event.target.value, 10) || 1)}
                className="h-8 w-16 rounded border bg-transparent px-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeItem(item.productId)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                {t("removeFromCart")}
              </button>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between p-3 text-sm font-medium">
          <span>{t("cartTotal")}</span>
          <span>{total.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-3">
        <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={t("namePlaceholder")} />
        <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={t("phonePlaceholder")} />
        <Input
          value={deliveryAddress}
          onChange={(event) => setDeliveryAddress(event.target.value)}
          placeholder={t("addressPlaceholder")}
        />
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder={t("notesPlaceholder")} />
        <Button type="button" disabled={isSubmitting} onClick={handleSubmit} className="w-full">
          {isSubmitting ? t("submitting") : t("placeOrder")}
        </Button>
      </div>
    </div>
  );
}
