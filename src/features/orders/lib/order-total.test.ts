import { describe, expect, it } from "vitest";
import type { OrderItem } from "@/db/schema";
import { orderGrandTotal, orderSubtotal } from "./order-total";

function item(unitPrice: string, quantity: number): OrderItem {
  return {
    id: "item-id",
    orderId: "order-id",
    productId: null,
    variantId: null,
    variantName: null,
    name: "Test item",
    unitPrice,
    quantity,
    createdAt: new Date(),
  };
}

function adjustments(overrides: { discountAmount?: string; taxAmount?: string; deliveryFee?: string } = {}) {
  return {
    discountAmount: overrides.discountAmount ?? "0",
    taxAmount: overrides.taxAmount ?? "0",
    deliveryFee: overrides.deliveryFee ?? "0",
  };
}

describe("orderSubtotal", () => {
  it("sums unitPrice * quantity across items", () => {
    expect(orderSubtotal([item("10.00", 2), item("5.50", 3)])).toBeCloseTo(36.5);
  });

  it("returns 0 for an empty order", () => {
    expect(orderSubtotal([])).toBe(0);
  });

  it("handles a single item", () => {
    expect(orderSubtotal([item("19.99", 1)])).toBeCloseTo(19.99);
  });
});

describe("orderGrandTotal", () => {
  it("equals the subtotal when there is no discount/tax/delivery", () => {
    const items = [item("10.00", 2)];
    expect(orderGrandTotal(items, adjustments())).toBeCloseTo(20);
  });

  it("subtracts the discount and adds tax and delivery", () => {
    const items = [item("100.00", 1)];
    expect(orderGrandTotal(items, adjustments({ discountAmount: "10.00", taxAmount: "5.00", deliveryFee: "3.50" }))).toBeCloseTo(98.5);
  });

  it("never goes negative-checked here — a discount larger than the subtotal is allowed to produce a negative total (caller's responsibility to validate)", () => {
    const items = [item("10.00", 1)];
    expect(orderGrandTotal(items, adjustments({ discountAmount: "50.00" }))).toBeCloseTo(-40);
  });
});
