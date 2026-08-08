"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "../lib/cart-context";

export function CartBadge({ slug }: { slug: string }) {
  const { itemCount } = useCart();

  return (
    <Link href={`/store/${slug}/checkout`} className="relative text-muted-foreground hover:text-foreground">
      <ShoppingCart className="size-5" />
      {itemCount > 0 && (
        <span className="absolute -top-2 -end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
