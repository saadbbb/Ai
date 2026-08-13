"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCart } from "../lib/cart-context";
import { submitOrderAction } from "../actions/submit-order.action";
import { trackEvent } from "../lib/track-event";

export function CheckoutForm({ slug, buttonClass }: { slug: string; buttonClass?: string }) {
  const t = useTranslations("website.public");
  const router = useRouter();
  const { items, clear } = useCart();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = items.reduce((sum, item) => sum + Number.parseFloat(item.unitPrice || "0") * item.quantity, 0);

  async function handleSubmit() {
    if (!fullName.trim() || !phone.trim() || !deliveryAddress.trim() || items.length === 0) {
      toast.error(t("checkoutRequiredHint"));
      return;
    }

    setIsSubmitting(true);
    const result = await submitOrderAction({
      slug,
      fullName,
      phone,
      deliveryAddress,
      notes: notes || undefined,
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    trackEvent("Purchase", { value: total });
    clear();
    router.push(`/store/${slug}/checkout/success/${result.data.orderId}`);
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <p className="text-sm text-muted-foreground">{t("cartPageEmpty")}</p>
          <Button asChild variant="outline">
            <Link href={`/store/${slug}/products`}>{t("browseProducts")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-2 p-4">
          <p className="text-sm font-medium">{t("orderSummaryHeading")}</p>
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate text-muted-foreground">
                  {item.name} × {item.quantity}
                </span>
                <span className="shrink-0 font-medium">{(Number.parseFloat(item.unitPrice || "0") * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
            <span>{t("cartTotal")}</span>
            <span>{total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={t("namePlaceholder")} />
        <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={t("phonePlaceholder")} />
        <Input
          value={deliveryAddress}
          onChange={(event) => setDeliveryAddress(event.target.value)}
          placeholder={t("addressPlaceholder")}
        />
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder={t("notesPlaceholder")} />
        <Button type="button" size="lg" disabled={isSubmitting} onClick={handleSubmit} className={cn("w-full", buttonClass)}>
          {isSubmitting ? t("submitting") : t("placeOrder")}
        </Button>
      </div>
    </div>
  );
}
