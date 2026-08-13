import { describe, expect, it } from "vitest";
import { computeSetupScore } from "./setup-score";

const ALL_DONE = { hasBusinessDescription: true, hasLogo: true, hasCatalog: true, hasContactInfo: true, hasTracking: true };

describe("computeSetupScore", () => {
  it("is ready when every blocking item is done, regardless of tracking", () => {
    expect(computeSetupScore(ALL_DONE).ready).toBe(true);
    expect(computeSetupScore({ ...ALL_DONE, hasTracking: false }).ready).toBe(true);
  });

  it("is not ready when any blocking item is missing", () => {
    expect(computeSetupScore({ ...ALL_DONE, hasLogo: false }).ready).toBe(false);
    expect(computeSetupScore({ ...ALL_DONE, hasCatalog: false }).ready).toBe(false);
  });

  it("marks tracking as non-blocking", () => {
    const score = computeSetupScore({ ...ALL_DONE, hasTracking: false });
    const trackingItem = score.items.find((item) => item.key === "hasTracking");
    expect(trackingItem?.blocking).toBe(false);
    expect(trackingItem?.done).toBe(false);
  });
});
