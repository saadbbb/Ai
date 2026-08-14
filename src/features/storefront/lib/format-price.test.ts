import { describe, expect, it } from "vitest";
import { formatPrice } from "./format-price";

describe("formatPrice", () => {
  it("drops a trailing .00 and appends the locale-appropriate suffix", () => {
    expect(formatPrice("15000.00", "ar")).toBe("15,000 د.ع");
    expect(formatPrice("15000.00", "en")).toBe("15,000 IQD");
    expect(formatPrice("15000.00", "ku")).toBe("15,000 د.ع");
  });

  it("keeps real cents", () => {
    expect(formatPrice("15000.50", "ar")).toBe("15,000.5 د.ع");
  });

  it("groups large numbers with thousands separators", () => {
    expect(formatPrice("1250000.00", "ar")).toBe("1,250,000 د.ع");
  });

  it("accepts a plain number", () => {
    expect(formatPrice(15000, "en")).toBe("15,000 IQD");
  });

  it("falls back to the raw value for non-numeric input rather than crashing", () => {
    expect(formatPrice("not-a-price", "ar")).toBe("not-a-price");
  });
});
