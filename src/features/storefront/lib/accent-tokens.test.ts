import { describe, expect, it } from "vitest";
import { resolveAccentTokens } from "./accent-tokens";

function tokens(primaryColor: string | null) {
  return resolveAccentTokens(primaryColor) as unknown as Record<string, string>;
}

describe("resolveAccentTokens", () => {
  it("falls back to the default blue for a missing/invalid color", () => {
    expect(tokens(null)["--primary"]).toBe("#2563eb");
    expect(tokens("not-a-color")["--primary"]).toBe("#2563eb");
    expect(tokens("#zzz")["--primary"]).toBe("#2563eb");
  });

  it("uses the merchant's valid hex as-is for --primary", () => {
    expect(tokens("#e11d48")["--primary"]).toBe("#e11d48");
  });

  it("picks a dark foreground for a light color and a light foreground for a dark color", () => {
    expect(tokens("#fef08a")["--primary-foreground"]).toBe("#0a0c11");
    expect(tokens("#1e1b4b")["--primary-foreground"]).toBe("#ffffff");
  });

  it("returns every expected token", () => {
    const tokens = resolveAccentTokens("#2563eb");
    for (const key of ["--primary", "--primary-hover", "--primary-active", "--primary-foreground", "--primary-soft", "--primary-glow", "--ring", "--elevation-glow"]) {
      expect(tokens).toHaveProperty(key);
    }
  });
});
