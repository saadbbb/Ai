"use client";

import { ImageOff, Minus, Plus, ShoppingCart, SlidersHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ProductVariant, StorefrontProductDisplayMode } from "@/db/schema";
import { cn } from "@/lib/utils";
import { useCart } from "../lib/cart-context";
import { formatPrice } from "../lib/format-price";

export interface ProductCardProduct {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  discountedPrice: string | null;
  imageUrl: string | null;
  category: string | null;
  trackQuantity: boolean;
  quantity: number | null;
  variants: ProductVariant[];
}

interface ProductCardProps {
  slug: string;
  product: ProductCardProduct;
  mode: StorefrontProductDisplayMode;
  secondaryColor: string;
  cornerClass: string;
  buttonClass: string;
  showDescription: boolean;
  showComparePrice: boolean;
  /** Overlay slot for e.g. a promotion countdown — kept catalog-agnostic here. */
  badge?: ReactNode;
  /** Denser rendering for recommendation rails (related products) — always grid layout regardless of `mode`. */
  size?: "sm" | "default";
}

function discountPercent(price: string | null, discountedPrice: string | null): number | null {
  if (!price || !discountedPrice) return null;
  const original = Number.parseFloat(price);
  const discounted = Number.parseFloat(discountedPrice);
  if (!original || original <= 0 || discounted >= original) return null;
  return Math.round((1 - discounted / original) * 100);
}

function ProductImage({
  imageUrl,
  name,
  className,
  sizes,
}: {
  imageUrl: string | null;
  name: string;
  className?: string;
  sizes: string;
}) {
  return (
    <div className={cn("relative w-full shrink-0 overflow-hidden bg-muted", className)}>
      {imageUrl ? (
        <Image src={imageUrl} alt={name} fill sizes={sizes} className="object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageOff className="size-6 text-muted-foreground/40" aria-hidden />
        </div>
      )}
    </div>
  );
}

function PriceBlock({
  price,
  discountedPrice,
  showComparePrice,
  size,
}: {
  price: string | null;
  discountedPrice: string | null;
  showComparePrice: boolean;
  size: "sm" | "default";
}) {
  const locale = useLocale();
  const priceTextClass = size === "sm" ? "text-sm" : "text-base";
  if (discountedPrice) {
    return (
      <div className="flex flex-wrap items-baseline gap-1.5">
        <p className={cn("font-semibold text-primary", priceTextClass)}>{formatPrice(discountedPrice, locale)}</p>
        {showComparePrice && price && <p className="text-xs text-muted-foreground line-through">{formatPrice(price, locale)}</p>}
      </div>
    );
  }
  if (price) {
    return <p className={cn("font-semibold text-primary", priceTextClass)}>{formatPrice(price, locale)}</p>;
  }
  return null;
}

/**
 * Also used directly by the product detail page's larger, standalone CTA — same add/stepper
 * behavior everywhere a product can be added to cart. Only handles variant *selection* when not
 * `compact` (i.e. the PDP) — card-grid contexts never render this when a product has variants at
 * all (see `ProductCard`'s `ViewOptionsCta` below), since a quick-add from a grid can't know which
 * variant the customer wants.
 */
export function CartControl({
  product,
  buttonClass,
  compact,
}: {
  product: ProductCardProduct;
  buttonClass: string;
  compact?: boolean;
}) {
  const t = useTranslations("website.public");
  const { items, addItem, updateQuantity } = useCart();
  const outOfStock = product.trackQuantity && (product.quantity ?? 0) <= 0;
  const hasVariants = !compact && product.variants.length > 0;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId) ?? null;

  const line = hasVariants && !selectedVariantId
    ? undefined
    : items.find((item) => item.productId === product.id && item.variantId === (selectedVariantId ?? undefined));

  function stop(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  const variantPicker = hasVariants && (
    <div className="flex flex-wrap gap-2" onClick={stop} role="group">
      {product.variants.map((variant) => (
        <button
          key={variant.id}
          type="button"
          onClick={(event) => {
            stop(event);
            setSelectedVariantId(variant.id);
          }}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            selectedVariantId === variant.id
              ? "border-primary bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {variant.name}
        </button>
      ))}
    </div>
  );

  if (outOfStock) {
    return (
      <div className="space-y-2">
        {variantPicker}
        <Button type="button" size={compact ? "sm" : "default"} disabled className={buttonClass} onClick={stop}>
          {t("outOfStock")}
        </Button>
      </div>
    );
  }

  if (line) {
    return (
      <div className="space-y-2">
        {variantPicker}
        <div className={cn("flex items-center gap-2", buttonClass, "border px-1")} onClick={stop} role="group">
          <button
            type="button"
            aria-label={t("quantityDecrease")}
            className="flex size-7 items-center justify-center rounded-[inherit] text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(event) => {
              stop(event);
              updateQuantity(product.id, line.quantity - 1, line.variantId);
            }}
          >
            <Minus className="size-3.5" />
          </button>
          <span className="min-w-4 text-center text-sm font-medium tabular-nums">{line.quantity}</span>
          <button
            type="button"
            aria-label={t("quantityIncrease")}
            className="flex size-7 items-center justify-center rounded-[inherit] text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(event) => {
              stop(event);
              updateQuantity(product.id, line.quantity + 1, line.variantId);
            }}
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {variantPicker}
      {hasVariants && !selectedVariantId && <p className="text-xs text-muted-foreground">{t("selectVariantHint")}</p>}
      <Button
        type="button"
        size={compact ? "sm" : "default"}
        className={buttonClass}
        disabled={hasVariants && !selectedVariantId}
        onClick={(event) => {
          stop(event);
          addItem({
            productId: product.id,
            name: product.name,
            unitPrice: selectedVariant?.priceOverride ?? product.discountedPrice ?? product.price ?? "0",
            imageUrl: product.imageUrl ?? undefined,
            variantId: selectedVariant?.id,
            variantName: selectedVariant?.name,
          });
          toast.success(t("addedToCart", { product: product.name }));
        }}
      >
        <ShoppingCart className="size-3.5" />
        {compact ? null : t("addToCart")}
      </Button>
    </div>
  );
}

/** Card-grid stand-in for `CartControl` when a product has variants — quick-add can't know which variant, so the CTA routes to the PDP (the card is already a `<Link>` there) instead of adding anything. */
function ViewOptionsCta({ buttonClass, compact }: { buttonClass: string; compact?: boolean }) {
  const t = useTranslations("website.public");
  return (
    <Button type="button" variant="outline" size={compact ? "sm" : "default"} className={buttonClass} tabIndex={-1}>
      <SlidersHorizontal className="size-3.5" />
      {compact ? null : t("multipleOptions")}
    </Button>
  );
}

export function ProductCard({
  slug,
  product,
  mode,
  secondaryColor,
  cornerClass,
  buttonClass,
  showDescription,
  showComparePrice,
  badge,
  size = "default",
}: ProductCardProps) {
  const href = `/store/${slug}/products/${product.id}`;
  const percentOff = discountPercent(product.price, product.discountedPrice);
  const topRoundedClass = cornerClass.replace("rounded-", "rounded-t-");
  const effectiveMode = size === "sm" ? "grid" : mode;
  const hasVariants = product.variants.length > 0;

  if (effectiveMode === "list") {
    return (
      <Link href={href} className="group block">
        <Card className={cn("flex-row items-center gap-3 border-border/60 p-2 transition-colors hover:bg-muted/40", cornerClass)}>
          <ProductImage imageUrl={product.imageUrl} name={product.name} className={cn("size-20 sm:size-24", cornerClass)} sizes="96px" />
          <CardContent className="min-w-0 flex-1 space-y-1 px-1 py-0">
            {product.category && <p className="truncate text-xs text-muted-foreground">{product.category}</p>}
            <p className="truncate text-sm font-medium">{product.name}</p>
            {showDescription && product.description && (
              <p className="line-clamp-1 text-xs text-muted-foreground">{product.description}</p>
            )}
            <PriceBlock price={product.price} discountedPrice={product.discountedPrice} showComparePrice={showComparePrice} size="sm" />
          </CardContent>
          <div className="shrink-0 pe-1">
            {hasVariants ? (
              <ViewOptionsCta buttonClass={buttonClass} compact />
            ) : (
              <CartControl product={product} buttonClass={buttonClass} compact />
            )}
          </div>
        </Card>
      </Link>
    );
  }

  if (effectiveMode === "full") {
    return (
      <Link href={href} className="group block">
        <Card className={cn("overflow-hidden border-border/60 p-0 transition-shadow hover:shadow-md", cornerClass)}>
          <div className="flex flex-col sm:grid sm:grid-cols-[minmax(240px,320px)_1fr]">
            <div className="relative">
              <ProductImage imageUrl={product.imageUrl} name={product.name} className={cn("aspect-[4/3] sm:h-full", topRoundedClass, "sm:rounded-t-none")} sizes="(max-width: 640px) 100vw, 320px" />
              {badge && <div className="absolute start-2 top-2">{badge}</div>}
              {percentOff && (
                <span className="absolute end-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: secondaryColor }}>
                  -{percentOff}%
                </span>
              )}
            </div>
            <CardContent className="flex flex-1 flex-col justify-center gap-2 p-4 sm:p-6">
              {product.category && <p className="text-xs text-muted-foreground">{product.category}</p>}
              <p className="text-lg font-medium">{product.name}</p>
              {showDescription && product.description && (
                <p className="line-clamp-3 text-sm text-muted-foreground">{product.description}</p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <PriceBlock price={product.price} discountedPrice={product.discountedPrice} showComparePrice={showComparePrice} size="default" />
                {hasVariants ? <ViewOptionsCta buttonClass={buttonClass} /> : <CartControl product={product} buttonClass={buttonClass} />}
              </div>
            </CardContent>
          </div>
        </Card>
      </Link>
    );
  }

  // grid (default)
  return (
    <Link href={href} className="group block h-full">
      <Card className={cn("h-full overflow-hidden border-border/60 p-0 transition-all hover:-translate-y-0.5 hover:shadow-md", cornerClass)}>
        <div className="relative">
          <ProductImage imageUrl={product.imageUrl} name={product.name} className={cn("aspect-[4/3]", topRoundedClass)} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
          {badge && <div className="absolute start-2 top-2">{badge}</div>}
          {percentOff && (
            <span className="absolute end-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: secondaryColor }}>
              -{percentOff}%
            </span>
          )}
        </div>
        <CardContent className={cn("flex flex-1 flex-col gap-1.5", size === "sm" ? "p-2" : "p-3")}>
          {size !== "sm" && product.category && <p className="text-xs text-muted-foreground">{product.category}</p>}
          <p className={cn("line-clamp-1 font-medium", size === "sm" ? "text-xs" : "text-sm")}>{product.name}</p>
          {showDescription && product.description && size !== "sm" && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
          )}
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <PriceBlock price={product.price} discountedPrice={product.discountedPrice} showComparePrice={showComparePrice} size="sm" />
          </div>
          {hasVariants ? (
            <ViewOptionsCta buttonClass={buttonClass} compact={size === "sm"} />
          ) : (
            <CartControl product={product} buttonClass={buttonClass} compact={size === "sm"} />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
