import { describe, expect, it } from "vitest";
import { generateWebhookSecret, signWebhookPayload } from "./webhook-signature";

describe("generateWebhookSecret", () => {
  it("never generates the same secret twice", () => {
    expect(generateWebhookSecret()).not.toBe(generateWebhookSecret());
  });
});

describe("signWebhookPayload", () => {
  it("is deterministic for the same secret and payload", () => {
    const payload = { event: "lead_created", data: { contactId: "1" } };

    expect(signWebhookPayload("secret", payload)).toBe(signWebhookPayload("secret", payload));
  });

  it("changes when the secret changes", () => {
    const payload = { event: "lead_created" };

    expect(signWebhookPayload("secret-a", payload)).not.toBe(signWebhookPayload("secret-b", payload));
  });

  it("changes when the payload changes", () => {
    expect(signWebhookPayload("secret", { a: 1 })).not.toBe(signWebhookPayload("secret", { a: 2 }));
  });
});
