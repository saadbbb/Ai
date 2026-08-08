import { describe, expect, it } from "vitest";
import { canTransitionOrderStatus } from "./order-status";

describe("canTransitionOrderStatus", () => {
  it("allows the normal forward flow", () => {
    expect(canTransitionOrderStatus("draft", "pending")).toBe(true);
    expect(canTransitionOrderStatus("pending", "confirmed")).toBe(true);
    expect(canTransitionOrderStatus("confirmed", "preparing")).toBe(true);
    expect(canTransitionOrderStatus("preparing", "ready")).toBe(true);
    expect(canTransitionOrderStatus("ready", "delivered")).toBe(true);
    expect(canTransitionOrderStatus("delivered", "completed")).toBe(true);
  });

  it("allows cancelling from any non-terminal status", () => {
    expect(canTransitionOrderStatus("draft", "cancelled")).toBe(true);
    expect(canTransitionOrderStatus("preparing", "cancelled")).toBe(true);
    expect(canTransitionOrderStatus("ready", "cancelled")).toBe(true);
  });

  it("allows refunding a delivered or completed order", () => {
    expect(canTransitionOrderStatus("delivered", "refunded")).toBe(true);
    expect(canTransitionOrderStatus("completed", "refunded")).toBe(true);
  });

  it("rejects skipping stages forward", () => {
    expect(canTransitionOrderStatus("pending", "delivered")).toBe(false);
    expect(canTransitionOrderStatus("draft", "completed")).toBe(false);
  });

  it("rejects moving backward", () => {
    expect(canTransitionOrderStatus("delivered", "confirmed")).toBe(false);
    expect(canTransitionOrderStatus("cancelled", "pending")).toBe(false);
  });

  it("treats cancelled and refunded as terminal", () => {
    expect(canTransitionOrderStatus("cancelled", "pending")).toBe(false);
    expect(canTransitionOrderStatus("refunded", "delivered")).toBe(false);
  });

  it("allows a no-op transition to the same status", () => {
    expect(canTransitionOrderStatus("confirmed", "confirmed")).toBe(true);
  });
});
