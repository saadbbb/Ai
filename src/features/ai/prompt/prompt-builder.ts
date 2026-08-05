import "server-only";
import type { AiAgent, BusinessPolicy, Faq, Product, Service } from "@/db/schema";

const TONE_DESCRIPTIONS: Record<string, string> = {
  friendly: "Friendly and warm.",
  professional: "Professional and polished.",
  luxury: "Refined, elegant, and upscale.",
  formal: "Formal and respectful.",
  casual: "Casual and relaxed.",
  medical: "Calm, precise, and reassuring, appropriate for a medical context.",
  corporate: "Polished and corporate.",
};

/**
 * There is no temperature/sampling parameter on current Claude models — "Creativity"
 * has to be a prompt instruction instead of an API knob.
 */
const CREATIVITY_DESCRIPTIONS: Record<string, string> = {
  low: "Stick closely to the facts and the information provided below. Prefer clear, consistent, predictable phrasing over variety.",
  medium: "Be natural and personable while staying accurate to the information provided below.",
  high: "Be more conversational, expressive, and varied in phrasing, while staying accurate to the information provided below.",
};

const LANGUAGE_NAMES: Record<string, string> = {
  ar: "Arabic",
  en: "English",
  ku: "Kurdish",
};

interface BuildSystemPromptInput {
  agent: AiAgent;
  faqs: Faq[];
  products: Product[];
  services: Service[];
  policy: BusinessPolicy | null;
}

export function buildSystemPrompt({ agent, faqs, products, services, policy }: BuildSystemPromptInput): string {
  const sections: string[] = [];

  sections.push(
    `You are ${agent.name}, an AI employee representing this business, talking directly with a customer.`,
  );

  if (agent.businessDescription) {
    sections.push(`About the business:\n${agent.businessDescription}`);
  }

  sections.push(
    `Always reply in ${LANGUAGE_NAMES[agent.language] ?? agent.language}, regardless of what language the customer writes in.`,
  );
  sections.push(`Tone: ${TONE_DESCRIPTIONS[agent.tone] ?? agent.tone}`);
  sections.push(`Style: ${CREATIVITY_DESCRIPTIONS[agent.creativity] ?? agent.creativity}`);

  if (faqs.length > 0) {
    const faqText = faqs.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`).join("\n\n");
    sections.push(`Frequently asked questions:\n${faqText}`);
  }

  if (products.length > 0) {
    const productText = products
      .map((product) => {
        const price = product.price ? ` — ${product.price}` : "";
        const description = product.description ? `: ${product.description}` : "";
        return `- ${product.name}${price}${description}`;
      })
      .join("\n");
    sections.push(`Products:\n${productText}`);
  }

  if (services.length > 0) {
    const serviceText = services
      .map((service) => {
        const price = service.price ? ` — ${service.price}` : "";
        const duration = service.durationMinutes ? ` (${service.durationMinutes} min)` : "";
        const description = service.description ? `: ${service.description}` : "";
        return `- ${service.name}${price}${duration}${description}`;
      })
      .join("\n");
    sections.push(`Services:\n${serviceText}`);
  }

  const policyLines: string[] = [];
  if (policy?.shippingPolicy) policyLines.push(`Shipping: ${policy.shippingPolicy}`);
  if (policy?.returnsPolicy) policyLines.push(`Returns: ${policy.returnsPolicy}`);
  if (policy?.paymentsPolicy) policyLines.push(`Payments: ${policy.paymentsPolicy}`);
  if (policyLines.length > 0) {
    sections.push(`Policies:\n${policyLines.join("\n")}`);
  }

  sections.push(
    "Only answer using the information above. Never invent details about the business, products, services, pricing, or policies. If you don't know something, say so politely and offer to have a team member follow up.",
  );

  if (agent.handoverEnabled) {
    const instructions = agent.handoverInstructions ? ` Specifically: ${agent.handoverInstructions}` : "";
    sections.push(
      `If the customer has a complaint, requests a refund, asks something outside what you know, or otherwise needs a human, say a team member will follow up shortly rather than trying to resolve it yourself.${instructions}`,
    );
  }

  return sections.join("\n\n");
}
