import { describe, expect, it } from "vitest";
import type { AiAgent, Faq, Product, Service } from "@/db/schema";
import { buildSystemPrompt } from "./prompt-builder";

function makeAgent(overrides: Partial<AiAgent> = {}): AiAgent {
  return {
    id: "agent-1",
    workspaceId: "workspace-1",
    name: "Sara",
    businessDescription: null,
    tone: "friendly",
    handoverEnabled: false,
    handoverInstructions: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const BASE_INPUT = {
  agent: makeAgent(),
  faqs: [] as Faq[],
  products: [] as Product[],
  services: [] as Service[],
  policy: null,
  creativity: "medium" as const,
};

describe("buildSystemPrompt — language", () => {
  it("always instructs the AI to match the customer's language rather than a fixed one", () => {
    const prompt = buildSystemPrompt(BASE_INPUT);
    expect(prompt).toContain("Always reply in the same language the customer's most recent message is written in");
  });
});

describe("buildSystemPrompt — creativity", () => {
  it("uses the platform-wide creativity passed in, not a per-agent value", () => {
    const prompt = buildSystemPrompt({ ...BASE_INPUT, creativity: "high" });
    expect(prompt).toContain("more conversational, expressive, and varied");
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
