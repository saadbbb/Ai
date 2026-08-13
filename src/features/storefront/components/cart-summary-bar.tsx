"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCart } from "../lib/cart-context";
import { isCartOverlayRoute } from "../lib/cart-routes";

export function CartSummaryBar({ slug }: { slug: string }) {
  const t = useTranslations("website.public");
  const { items, itemCount } = useCart();
  const pathname = usePathname();
  const router = useRouter();

  if (itemCount === 0 || isCartOverlayRoute(pathname, slug)) return null;

  const total = items.reduce((sum, item) => sum + Number.parseFloat(item.unitPrice || "0") * item.quantity, 0);

  return (
    <>
      {/* Reserves scroll space so the fixed bar never covers the last bit of page content. */}
      <div aria-hidden className="h-20" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShoppingBag className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{t("cartSummaryLabel")}</p>
              <p className="truncate text-xs text-muted-foreground">
                {t("cartSummaryItems", { count: itemCount })} — {total.toFixed(2)}
              </p>
            </div>
          </div>
          <Button type="button" onClick={() => router.push(`/store/${slug}/cart`)} className="shrink-0">
            {t("cartSummaryCta")}
          </Button>
        </div>
      </div>
    </>
  );
}
