"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "../lib/cart-context";

export function AddToCartButton({
  productId,
  name,
  unitPrice,
}: {
  productId: string;
  name: string;
  unitPrice: string;
}) {
  const t = useTranslations("website.public");
  const { addItem } = useCart();

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
