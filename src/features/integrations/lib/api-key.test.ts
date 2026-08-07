import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey } from "./api-key";

describe("generateApiKey", () => {
  it("produces a plaintext key whose prefix matches displayPrefix", () => {
    const key = generateApiKey();

    expect(key.plaintext.startsWith("sk_live_")).toBe(true);
    expect(key.plaintext.startsWith(key.displayPrefix)).toBe(true);
    expect(key.displayPrefix.length).toBeLessThan(key.plaintext.length);
  });

  it("hashes to the same value as hashApiKey(plaintext), for lookup consistency", () => {
    const key = generateApiKey();

    expect(key.hash).toBe(hashApiKey(key.plaintext));
  });

  it("never generates the same key twice", () => {
    const a = generateApiKey();
    const b = generateApiKey();

    expect(a.plaintext).not.toBe(b.plaintext);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("hashApiKey", () => {
  it("is deterministic for the same input", () => {
    expect(hashApiKey("sk_live_abc")).toBe(hashApiKey("sk_live_abc"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashApiKey("sk_live_abc")).not.toBe(hashApiKey("sk_live_xyz"));
  });
});
