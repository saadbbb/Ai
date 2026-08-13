/** Routes with their own cart/order CTA already on screen — the floating Cart Summary Bar (and the assistant widget's bottom offset) stay out of the way there. */
export function isCartOverlayRoute(pathname: string, slug: string): boolean {
  const base = `/store/${slug}`;
  return pathname === `${base}/cart` || pathname.startsWith(`${base}/checkout`);
}
