"use client";

import { ImageOff, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCart } from "../lib/cart-context";
import { formatPrice } from "../lib/format-price";

interface CartPageContentProps {
  slug: string;
  cornerClass: string;
  buttonClass: string;
}

export function CartPageContent({ slug, cornerClass, buttonClass }: CartPageContentProps) {
  const t = useTranslations("website.public");
  const locale = useLocale();
  const { items, updateQuantity, removeItem } = useCart();
  const router = useRouter();

  if (items.length === 0) {
    return (
      <Card className={cn("border-dashed", cornerClass)}>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShoppingBag className="size-5" />
          </span>
          <p className="text-sm text-muted-foreground">{t("cartPageEmpty")}</p>
          <Button asChild variant="outline" className={buttonClass}>
            <Link href={`/store/${slug}/products`}>{t("browseProducts")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const total = items.reduce((sum, item) => sum + Number.parseFloat(item.unitPrice || "0") * item.quantity, 0);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {items.map((item) => {
          const lineTotal = Number.parseFloat(item.unitPrice || "0") * item.quantity;
          return (
            <Card key={`${item.productId}-${item.variantId ?? ""}`} className={cn("flex-row items-center gap-3 border-border/60 p-3", cornerClass)}>
              <div className={cn("relative size-16 shrink-0 overflow-hidden bg-muted", cornerClass)}>
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.name} fill sizes="64px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageOff className="size-4 text-muted-foreground/40" aria-hidden />
                  </div>
                )}
              </div>
              <CardContent className="min-w-0 flex-1 space-y-1 p-0">
                <p className="truncate text-sm font-medium">{item.name}</p>
                {item.variantName && <p className="truncate text-xs text-muted-foreground">{item.variantName}</p>}
                <p className="text-xs text-muted-foreground">{formatPrice(item.unitPrice, locale)}</p>
                <div className="flex items-center gap-2 pt-1">
                  <div className={cn("flex items-center gap-1 border", buttonClass)}>
                    <button
                      type="button"
                      aria-label={t("quantityDecrease")}
                      className="flex size-7 items-center justify-center rounded-[inherit] text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="min-w-4 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label={t("quantityIncrease")}
                      className="flex size-7 items-center justify-center rounded-[inherit] text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label={t("removeFromCart")}
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="ms-auto flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </CardContent>
              <p className="shrink-0 self-start text-sm font-semibold text-primary">{formatPrice(lineTotal, locale)}</p>
            </Card>
          );
        })}
      </div>

      <Card className={cornerClass}>
        <CardContent className="flex items-center justify-between p-4">
          <span className="text-sm font-medium">{t("cartGrandTotal")}</span>
          <span className="text-lg font-semibold text-primary">{formatPrice(total, locale)}</span>
        </CardContent>
      </Card>

      <Button type="button" className={cn("w-full", buttonClass)} onClick={() => router.push(`/store/${slug}/checkout`)}>
        {t("continueToCheckout")}
      </Button>
    </div>
  );
}
