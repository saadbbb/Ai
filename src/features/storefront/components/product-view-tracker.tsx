"use client";

import { useEffect } from "react";
import { trackEvent } from "../lib/track-event";

/** Renders nothing — fires a ViewContent pixel event once per product-page visit. */
export function ProductViewTracker({ productName, price }: { productName: string; price?: string | null }) {
  useEffect(() => {
    trackEvent("ViewContent", { contentName: productName, value: price ? Number.parseFloat(price) : undefined });
  }, [productName, price]);

  return null;
}
