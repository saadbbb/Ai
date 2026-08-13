"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "../lib/cart-context";

export function AddToCartButton({
  productId,
  name,
  unitPrice,
  outOfStock,
}: {
  productId: string;
  name: string;
  unitPrice: string;
  outOfStock?: boolean;
}) {
  const t = useTranslations("website.public");
  const { addItem } = useCart();

  if (outOfStock) {
    return (
      <Button type="button" disabled>
        {t("outOfStock")}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        addItem({ productId, name, unitPrice });
        toast.success(t("addedToCart", { product: name }));
      }}
    >
      {t("addToCart")}
    </Button>
  );
}
