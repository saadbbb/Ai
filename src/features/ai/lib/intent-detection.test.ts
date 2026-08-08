import { describe, expect, it } from "vitest";
import { detectIntent } from "./intent-detection";

describe("detectIntent", () => {
  it("classifies a simple greeting", () => {
    expect(detectIntent("Hello, is anyone there?")).toBe("greeting");
  });

  it("classifies a price question", () => {
    expect(detectIntent("How much does the blue dress cost?")).toBe("price_inquiry");
  });

  it("classifies an appointment request", () => {
    expect(detectIntent("Can I book an appointment for tomorrow?")).toBe("appointment_request");
  });

  it("classifies purchase intent", () => {
    expect(detectIntent("I want to buy the large size")).toBe("purchase_intent");
  });

  it("classifies a cancellation/refund request", () => {
    expect(detectIntent("I need to cancel my order and get a refund")).toBe("cancellation");
  });

  it("classifies a complaint", () => {
    expect(detectIntent("This is unacceptable, the product arrived broken")).toBe("complaint");
  });

  it("classifies urgency ahead of other signals", () => {
    expect(detectIntent("URGENT — I need this cancelled right now")).toBe("urgent");
  });

  it("classifies Arabic greetings", () => {
    expect(detectIntent("السلام عليكم، كيفكم؟")).toBe("greeting");
  });

  it("classifies Arabic price inquiries", () => {
    expect(detectIntent("شكرا، بس شكد سعر هذا المنتج؟")).toBe("price_inquiry");
  });

  it("falls back to question for a generic question mark", () => {
    expect(detectIntent("Do you deliver to Basra?")).toBe("question");
  });

  it("falls back to other when nothing matches", () => {
    expect(detectIntent("ok thanks")).toBe("other");
  });
});
