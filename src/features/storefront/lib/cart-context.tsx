"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface CartItem {
  productId: string;
  name: string;
  unitPrice: string;
  quantity: number;
  /** Optional — old localStorage carts won't have this; the cart page falls back to a placeholder. */
  imageUrl?: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(slug: string): string {
  return `storefront-cart-${slug}`;
}

/** localStorage-backed, per-store cart — no account/session needed for an anonymous storefront visitor. */
export function CartProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  // Every full page navigation remounts this provider from scratch (it isn't in a persistent
  // layout), so the read-from-localStorage effect below and the write effect further down both
  // fire on the very same mount. Without this guard, the write effect's first run captures the
  // *initial* `items = []` closure (the read's `setItems` hasn't been applied to state yet) and
  // immediately overwrites the just-restored cart with an empty array — a real data-loss bug
  // caught by testing the products→cart navigation live, not a hypothetical. `hasHydrated` and
  // `items` are set together (batched) once the read completes, so the write effect only ever
  // sees them change in sync — never a stale-empty `items` paired with "go ahead and persist."
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey(slug));
    if (raw) {
      try {
        setItems(JSON.parse(raw));
      } catch {
        // Corrupt/old cart data — start fresh rather than crash the page.
      }
    }
    setHasHydrated(true);
  }, [slug]);

  useEffect(() => {
    if (!hasHydrated) return;
    localStorage.setItem(storageKey(slug), JSON.stringify(items));
  }, [slug, items, hasHydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((line) => line.productId === item.productId);
      if (existing) {
        return current.map((line) =>
          line.productId === item.productId ? { ...line, quantity: line.quantity + quantity } : line,
        );
      }
      return [...current, { ...item, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((line) => line.productId !== productId)
        : current.map((line) => (line.productId === productId ? { ...line, quantity } : line)),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((line) => line.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clear, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider.");
  return context;
}
