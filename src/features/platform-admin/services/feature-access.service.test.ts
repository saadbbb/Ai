import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Plan, Workspace } from "@/db/schema";

vi.mock("../repository/plan.repository", () => ({
  planRepository: { findById: vi.fn() },
}));

const { planRepository } = await import("../repository/plan.repository");
const { featureAccessService } = await import("./feature-access.service");

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "workspace-1",
    name: "Acme",
    slug: "acme",
    businessType: null,
    language: "ar",
    logoUrl: null,
    onboardingStep: 10,
    onboardingCompletedAt: new Date(),
    subscriptionStatus: "trial",
    planId: null,
    subscriptionExpiresAt: null,
    lastReminderDaysSent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const PLAN = { enabledFeatures: ["inbox", "contacts"] } as Plan;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("featureAccessService.getEnabledFeatures", () => {
  it("gives a trial workspace full access regardless of planId", async () => {
    const enabled = await featureAccessService.getEnabledFeatures(makeWorkspace({ subscriptionStatus: "trial" }));

    expect(enabled).toContain("inbox");
    expect(enabled).toContain("ads");
    expect(planRepository.findById).not.toHaveBeenCalled();
  });

  it("restricts an active workspace to its plan's enabled features", async () => {
    vi.mocked(planRepository.findById).mockResolvedValue(PLAN);

    const enabled = await featureAccessService.getEnabledFeatures(
      makeWorkspace({ subscriptionStatus: "active", planId: "plan-1" }),
    );

    expect(enabled).toEqual(["inbox", "contacts"]);
  });

  it("still restricts to the plan while past_due — overdue but not yet blocked", async () => {
    vi.mocked(planRepository.findById).mockResolvedValue(PLAN);

    const enabled = await featureAccessService.getEnabledFeatures(
      makeWorkspace({ subscriptionStatus: "past_due", planId: "plan-1" }),
    );

    expect(enabled).toEqual(["inbox", "contacts"]);
  });

  it("still restricts to the plan while in grace", async () => {
    vi.mocked(planRepository.findById).mockResolvedValue(PLAN);

    const enabled = await featureAccessService.getEnabledFeatures(
      makeWorkspace({ subscriptionStatus: "grace", planId: "plan-1" }),
    );

    expect(enabled).toEqual(["inbox", "contacts"]);
  });

  it("falls back to full access for a blocked status (defense in depth — layout.tsx should never even call this)", async () => {
    const enabled = await featureAccessService.getEnabledFeatures(
      makeWorkspace({ subscriptionStatus: "suspended", planId: "plan-1" }),
    );

    expect(enabled).toContain("ads");
  });

  it("falls back to full access when the plan no longer exists", async () => {
    vi.mocked(planRepository.findById).mockResolvedValue(null);

    const enabled = await featureAccessService.getEnabledFeatures(
      makeWorkspace({ subscriptionStatus: "active", planId: "missing-plan" }),
    );

    expect(enabled).toContain("ads");
  });
});

describe("featureAccessService.hasFeature", () => {
  it("checks membership in the resolved enabled-features list", async () => {
    vi.mocked(planRepository.findById).mockResolvedValue(PLAN);
    const workspace = makeWorkspace({ subscriptionStatus: "active", planId: "plan-1" });

    expect(await featureAccessService.hasFeature(workspace, "inbox")).toBe(true);
    expect(await featureAccessService.hasFeature(workspace, "ads")).toBe(false);
  });
});
