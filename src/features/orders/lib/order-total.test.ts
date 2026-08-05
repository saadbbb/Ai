import { describe, expect, it } from "vitest";
import type { OrderItem } from "@/db/schema";
import { orderTotal } from "./order-total";

function item(unitPrice: string, quantity: number): OrderItem {
  return {
    id: "item-id",
    orderId: "order-id",
    productId: null,
    name: "Test item",
    unitPrice,
    quantity,
    createdAt: new Date(),
  };
}

describe("orderTotal", () => {
  it("sums unitPrice * quantity across items", () => {
    expect(orderTotal([item("10.00", 2), item("5.50", 3)])).toBeCloseTo(36.5);
  });

  it("returns 0 for an empty order", () => {
    expect(orderTotal([])).toBe(0);
  });

  it("handles a single item", () => {
    expect(orderTotal([item("19.99", 1)])).toBeCloseTo(19.99);
  });
});
