import { describe, expect, it } from "vitest";
import { calculateLeadScore, leadTemperature } from "./lead-score";

const BASE = {
  messageCount: 0,
  hasOrder: false,
  hasAppointment: false,
  tags: [] as string[],
  stage: "new" as const,
  lastContactAt: null,
};

describe("calculateLeadScore", () => {
  it("scores a brand new lead with no signals at 0", () => {
    expect(calculateLeadScore(BASE)).toBe(0);
  });

  it("caps message-count points instead of rewarding an endless conversation forever", () => {
    const tenMessages = calculateLeadScore({ ...BASE, messageCount: 10 });
    const hundredMessages = calculateLeadScore({ ...BASE, messageCount: 100 });
    expect(tenMessages).toBe(hundredMessages);
    expect(tenMessages).toBe(20);
  });

  it("weighs an actual order above an appointment above a VIP tag", () => {
    const withOrder = calculateLeadScore({ ...BASE, hasOrder: true });
    const withAppointment = calculateLeadScore({ ...BASE, hasAppointment: true });
    const withVip = calculateLeadScore({ ...BASE, tags: ["VIP"] });
    expect(withOrder).toBeGreaterThan(withAppointment);
    expect(withAppointment).toBeGreaterThan(withVip);
  });

  it("matches the VIP tag case-insensitively", () => {
    expect(calculateLeadScore({ ...BASE, tags: ["vip"] })).toBe(calculateLeadScore({ ...BASE, tags: ["VIP"] }));
  });

  it("rewards later pipeline stages and penalizes lost/cancelled", () => {
    expect(calculateLeadScore({ ...BASE, stage: "won" })).toBeGreaterThan(
      calculateLeadScore({ ...BASE, stage: "qualified" }),
    );
    expect(calculateLeadScore({ ...BASE, stage: "lost" })).toBe(0); // clamped — can't go negative
  });

  it("penalizes a lead nobody has contacted in a while", () => {
    const fresh = calculateLeadScore({ ...BASE, hasOrder: true, lastContactAt: new Date() });
    const stale14 = calculateLeadScore({
      ...BASE,
      hasOrder: true,
      lastContactAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    });
    const stale30 = calculateLeadScore({
      ...BASE,
      hasOrder: true,
      lastContactAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    });
    expect(stale14).toBeLessThan(fresh);
    expect(stale30).toBeLessThan(stale14);
  });

  it("never returns a score outside 0-100", () => {
    const maxed = calculateLeadScore({
      messageCount: 999,
      hasOrder: true,
      hasAppointment: true,
      tags: ["VIP"],
      stage: "won",
      lastContactAt: new Date(),
    });
    expect(maxed).toBeLessThanOrEqual(100);
    expect(maxed).toBeGreaterThanOrEqual(0);

    const minned = calculateLeadScore({
      messageCount: 0,
      hasOrder: false,
      hasAppointment: false,
      tags: [],
      stage: "cancelled",
      lastContactAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    });
    expect(minned).toBeGreaterThanOrEqual(0);
  });
});

describe("leadTemperature", () => {
  it.each([
    [0, "cold"],
    [39, "cold"],
    [40, "warm"],
    [69, "warm"],
    [70, "hot"],
    [89, "hot"],
    [90, "priority"],
    [100, "priority"],
  ] as const)("maps score %i to %s", (score, expected) => {
    expect(leadTemperature(score)).toBe(expected);
  });
});
