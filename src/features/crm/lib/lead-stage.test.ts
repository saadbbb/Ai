import { describe, expect, it } from "vitest";
import { canTransitionLeadStage } from "./lead-stage";

describe("canTransitionLeadStage", () => {
  it("allows free movement between active stages, forward or backward", () => {
    expect(canTransitionLeadStage("new", "negotiation")).toBe(true);
    expect(canTransitionLeadStage("negotiation", "qualified")).toBe(true);
    expect(canTransitionLeadStage("waiting", "proposal_sent")).toBe(true);
  });

  it("allows any active stage to close as won/lost/cancelled", () => {
    expect(canTransitionLeadStage("new", "won")).toBe(true);
    expect(canTransitionLeadStage("negotiation", "lost")).toBe(true);
    expect(canTransitionLeadStage("qualified", "cancelled")).toBe(true);
  });

  it("rejects reopening a closed lead back into an active stage", () => {
    expect(canTransitionLeadStage("won", "new")).toBe(false);
    expect(canTransitionLeadStage("lost", "negotiation")).toBe(false);
    expect(canTransitionLeadStage("cancelled", "qualified")).toBe(false);
  });

  it("rejects moving between two different terminal stages", () => {
    expect(canTransitionLeadStage("won", "lost")).toBe(false);
    expect(canTransitionLeadStage("lost", "cancelled")).toBe(false);
  });

  it("allows a no-op transition to the same stage, even terminal", () => {
    expect(canTransitionLeadStage("negotiation", "negotiation")).toBe(true);
    expect(canTransitionLeadStage("won", "won")).toBe(true);
  });
});
