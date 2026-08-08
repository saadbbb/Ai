import { describe, expect, it } from "vitest";
import type { AiAgent, Faq, Product, Service } from "@/db/schema";
import { DEFAULT_WORKING_HOURS } from "../constants";
import { buildSystemPrompt } from "./prompt-builder";

function makeAgent(overrides: Partial<AiAgent> = {}): AiAgent {
  return {
    id: "agent-1",
    workspaceId: "workspace-1",
    name: "Sara",
    businessDescription: null,
    language: "en",
    tone: "friendly",
    creativity: "medium",
    workingHours: null,
    handoverEnabled: false,
    handoverInstructions: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const BASE_INPUT = { agent: makeAgent(), faqs: [] as Faq[], products: [] as Product[], services: [] as Service[], policy: null };

describe("buildSystemPrompt — working hours", () => {
  it("says nothing about hours when the agent has none configured", () => {
    const prompt = buildSystemPrompt(BASE_INPUT);
    expect(prompt).not.toContain("currently open");
    expect(prompt).not.toContain("currently closed");
  });

  it("tells the AI the business is open when the current time is within schedule", () => {
    const mondayNoonUtc = new Date("2026-03-16T12:00:00.000Z"); // a Monday
    const agent = makeAgent({ workingHours: DEFAULT_WORKING_HOURS });
    const prompt = buildSystemPrompt({ ...BASE_INPUT, agent }, mondayNoonUtc);
    expect(prompt).toContain("currently open");
  });

  it("tells the AI the business is closed and includes holiday notes when outside schedule", () => {
    const sundayUtc = new Date("2026-03-15T12:00:00.000Z"); // a Sunday, closed in DEFAULT_WORKING_HOURS
    const agent = makeAgent({ workingHours: { ...DEFAULT_WORKING_HOURS, holidayNotes: "Closed for Eid" } });
    const prompt = buildSystemPrompt({ ...BASE_INPUT, agent }, sundayUtc);
    expect(prompt).toContain("currently closed");
    expect(prompt).toContain("Closed for Eid");
  });
});

describe("buildSystemPrompt — catalog size cap", () => {
  it("caps the number of FAQs/products/services injected into the prompt", () => {
    const faqs: Faq[] = Array.from({ length: 80 }, (_, i) => ({
      id: `faq-${i}`,
      workspaceId: "workspace-1",
      question: `Question ${i}`,
      answer: `Answer ${i}`,
      sortOrder: i,
      createdAt: new Date(),
    }));

    const prompt = buildSystemPrompt({ ...BASE_INPUT, faqs });
    expect(prompt).toContain("Question 49");
    expect(prompt).not.toContain("Question 50");
  });
});

describe("buildSystemPrompt — baseline sections", () => {
  it("includes the business description and tone when present", () => {
    const agent = makeAgent({ businessDescription: "We sell handmade soap.", tone: "luxury" });
    const prompt = buildSystemPrompt({ ...BASE_INPUT, agent });
    expect(prompt).toContain("We sell handmade soap.");
    expect(prompt).toContain("Refined, elegant, and upscale.");
  });
});
