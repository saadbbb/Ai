"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Contact, Product } from "@/db/schema";
import { createOrderAction } from "../actions/create-order.action";

interface ItemDraft {
  productId: string;
  name: string;
  unitPrice: string;
  quantity: string;
}

const emptyItem: ItemDraft = { productId: "", name: "", unitPrice: "", quantity: "1" };

export function NewOrderForm({
  contacts,
  products,
  defaultContactId,
}: {
  contacts: Contact[];
  products: Product[];
  defaultContactId?: string;
}) {
  const router = useRouter();
  const t = useTranslations("orders.new");
  const [contactId, setContactId] = useState(defaultContactId ?? "");
  const [items, setItems] = useState<ItemDraft[]>([{ ...emptyItem }]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateItem(index: number, patch: Partial<ItemDraft>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function handleProductSelect(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    updateItem(index, {
      productId,
      name: product?.name ?? "",
      unitPrice: product?.price ?? "",
    });
  }

  function addItem() {
    setItems((current) => [...current, { ...emptyItem }]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  const total = items.reduce((sum, item) => {
    const price = Number.parseFloat(item.unitPrice) || 0;
    const quantity = Number.parseInt(item.quantity, 10) || 0;
    return sum + price * quantity;
  }, 0);

  async function handleSubmit() {
    if (!contactId) {
      toast.error(t("contactRequired"));
      return;
    }
    const validItems = items.filter((item) => item.name.trim().length > 0);
    if (validItems.length === 0) {
      toast.error(t("itemRequired"));
      return;
    }

    setIsSubmitting(true);
    const result = await createOrderAction({
      contactId,
      notes: notes || undefined,
      items: validItems.map((item) => ({
        productId: item.productId || undefined,
        name: item.name,
        unitPrice: item.unitPrice || "0",
        quantity: item.quantity || "1",
      })),
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push(`/dashboard/orders/${result.data.order.id}`);
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("contactLabel")}</label>
          <Select value={contactId} onValueChange={setContactId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("contactPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">{t("itemsLabel")}</label>
          {items.map((item, index) => (
            <div key={index} className="space-y-2 rounded-lg border border-dashed border-input p-2">
              {products.length > 0 && (
                <Select value={item.productId} onValueChange={(value) => handleProductSelect(index, value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("productPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                        {product.price ? ` — ${product.price}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Input
                value={item.name}
                onChange={(event) => updateItem(index, { name: event.target.value })}
                placeholder={t("itemNamePlaceholder")}
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unitPrice}
                  onChange={(event) => updateItem(index, { unitPrice: event.target.value })}
                  placeholder={t("unitPricePlaceholder")}
                />
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(event) => updateItem(index, { quantity: event.target.value })}
                  placeholder={t("quantityPlaceholder")}
                />
              </div>
              {items.length > 1 && (
                <div className="flex justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                    {t("removeItem")}
                  </Button>
                </div>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            {t("addItem")}
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("notesLabel")}</label>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm font-medium">{t("total", { total: total.toFixed(2) })}</p>
          <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
