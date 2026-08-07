import { describe, expect, it } from "vitest";
import { calculateChurnRisk } from "./churn-risk";

describe("calculateChurnRisk", () => {
  it("returns high risk (score 100) for a customer with no order and no contact history at all", () => {
    const result = calculateChurnRisk({ daysSinceLastOrder: null, daysSinceLastContact: null });

    expect(result.score).toBe(100);
    expect(result.level).toBe("high");
  });

  it("returns low risk for a customer who ordered and was contacted very recently", () => {
    const result = calculateChurnRisk({ daysSinceLastOrder: 2, daysSinceLastContact: 1 });

    expect(result.level).toBe("low");
  });

  it("caps staleness at 180 days rather than growing unbounded for very old activity", () => {
    const cappedAt180 = calculateChurnRisk({ daysSinceLastOrder: 180, daysSinceLastContact: 180 });
    const wayOlder = calculateChurnRisk({ daysSinceLastOrder: 5000, daysSinceLastContact: 5000 });

    expect(wayOlder.score).toBe(cappedAt180.score);
    expect(wayOlder.score).toBe(100);
  });

  it("stays at risk when one axis is stale even if the other is fresh", () => {
    const result = calculateChurnRisk({ daysSinceLastOrder: 175, daysSinceLastContact: 1 });

    expect(result.level).not.toBe("low");
  });

  it("classifies the medium band correctly", () => {
    const result = calculateChurnRisk({ daysSinceLastOrder: 90, daysSinceLastContact: 90 });

    expect(result.level).toBe("medium");
  });
});
