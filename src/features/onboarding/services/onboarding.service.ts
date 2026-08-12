import "server-only";
import type { AiAgent, BusinessPolicy, Faq, Product, Service, Workspace } from "@/db/schema";
import { aiAgentRepository } from "@/features/ai/repository/ai-agent.repository";
import type { handoverSchema, toneEnumSchema } from "@/features/ai/validation/schemas";
import { faqRepository } from "@/features/knowledge-base/repository/faq.repository";
import { parseGalleryImageUrls, parseVariantNames } from "@/features/knowledge-base/lib/product-input";
import { policyRepository } from "@/features/knowledge-base/repository/policy.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import type { knowledgeBaseSchema } from "@/features/knowledge-base/validation/schemas";
import { userRepository } from "@/features/auth/repository/user.repository";
import { workspaceRepository } from "@/features/workspace/repository/workspace.repository";
import { AppError } from "@/lib/errors/app-error";
import type { Locale } from "@/i18n/config";
import type { z } from "zod";

export interface OnboardingState {
  workspace: Workspace;
  agent: AiAgent | null;
  faqs: Faq[];
  products: Product[];
  services: Service[];
  policy: BusinessPolicy | null;
}

/** Blank onboarding "AI employee name" step falls back to this — editable later in AI Employee settings. */
const DEFAULT_AGENT_NAME = "المساعد الذكي";

const DEFAULT_KNOWLEDGE_BASE_FAQS: Record<Locale, { question: string; answer: string }[]> = {
  ar: [
    {
      question: "ما هي ساعات العمل لديكم؟",
      answer: "نحن هنا للمساعدة على مدار الساعة عبر هذه المحادثة.",
    },
    {
      question: "كيف يمكنني التواصل مع فريقكم؟",
      answer: "يمكنك إرسال رسالة هنا مباشرة وسنقوم بالرد عليك في أقرب وقت.",
    },
    {
      question: "هل تقدمون التوصيل داخل العراق؟",
      answer: "تواصل معنا وسنخبرك بتفاصيل التوصيل الخاصة بمنطقتك.",
    },
  ],
  en: [
    { question: "What are your business hours?", answer: "We're here to help around the clock through this chat." },
    { question: "How can I reach your team?", answer: "Send a message here and we'll get back to you shortly." },
    { question: "Do you deliver within Iraq?", answer: "Reach out and we'll share delivery details for your area." },
  ],
  ku: [
    { question: "کاتەکانی کارکردنتان چۆنە؟", answer: "ئێمە لێرەین بۆ یارمەتیدان لە هەموو کاتێکدا لەسەر ئەم چاتە." },
    { question: "چۆن دەتوانم پەیوەندی بە تیمەکەتانەوە بکەم؟", answer: "پەیامێک لێرە بنێرە و ئێمە بە زووترین کات وەڵامت دەدەینەوە." },
    { question: "گەیاندن بۆ ناو عێراق دەکەن؟", answer: "پەیوەندیمان پێوە بکە و وردەکارییەکانی گەیاندن بۆ ناوچەکەت پێت دەڵێین." },
  ],
};

async function bumpStep(workspaceId: string, workspace: Workspace, step: number): Promise<void> {
  if (workspace.onboardingStep >= step) return;
  await workspaceRepository.update(workspaceId, { onboardingStep: step });
}

async function requireAgent(workspaceId: string): Promise<AiAgent> {
  const agent = await aiAgentRepository.findByWorkspaceId(workspaceId);
  if (!agent) {
    throw new AppError("VALIDATION_ERROR", "Please complete the previous onboarding step first.");
  }
  return agent;
}

async function getOnboardingState(workspaceId: string): Promise<OnboardingState> {
  const workspace = await workspaceRepository.findById(workspaceId);
  if (!workspace) {
    throw new AppError("NOT_FOUND", "Workspace not found.");
  }

  const [agent, faqs, products, services, policy] = await Promise.all([
    aiAgentRepository.findByWorkspaceId(workspaceId),
    faqRepository.findByWorkspaceId(workspaceId),
    productRepository.findByWorkspaceId(workspaceId),
    serviceRepository.findByWorkspaceId(workspaceId),
    policyRepository.findByWorkspaceId(workspaceId),
  ]);

  return { workspace, agent, faqs, products, services, policy };
}

/** Step 1 — owner's name lives on the user row, not the workspace, so no bumpStep call needs a re-fetched workspace here. */
async function saveOwnerName(workspaceId: string, workspace: Workspace, userId: string, name: string): Promise<void> {
  await userRepository.update(userId, { name });
  await bumpStep(workspaceId, workspace, 1);
}

/** Step 2 — business name, plus the workspace's dashboard language auto-set from whichever locale was active pre-signup. */
async function saveBusinessInfo(
  workspaceId: string,
  workspace: Workspace,
  data: { name: string; language: Locale },
): Promise<void> {
  await workspaceRepository.update(workspaceId, data);
  await bumpStep(workspaceId, workspace, 2);
}

/** Step 3 */
async function saveBusinessType(workspaceId: string, workspace: Workspace, businessType: string): Promise<void> {
  await workspaceRepository.update(workspaceId, { businessType });
  await bumpStep(workspaceId, workspace, 3);
}

/** Step 4 — logo upload; skippable, so this only runs when a file was actually uploaded. */
async function saveLogo(workspaceId: string, workspace: Workspace, logoUrl: string): Promise<void> {
  await workspaceRepository.update(workspaceId, { logoUrl });
  await bumpStep(workspaceId, workspace, 4);
}

async function skipLogo(workspaceId: string, workspace: Workspace): Promise<void> {
  await bumpStep(workspaceId, workspace, 4);
}

/** Step 5 — optional; a blank name falls back to DEFAULT_AGENT_NAME, editable later in AI Employee settings. */
async function saveAgentName(workspaceId: string, workspace: Workspace, name: string): Promise<void> {
  const resolvedName = name.trim() || DEFAULT_AGENT_NAME;
  const existing = await aiAgentRepository.findByWorkspaceId(workspaceId);
  if (existing) {
    await aiAgentRepository.update(workspaceId, { name: resolvedName });
  } else {
    await aiAgentRepository.create({ workspaceId, name: resolvedName });
  }
  await bumpStep(workspaceId, workspace, 5);
}

/** Step 6 — optional */
async function saveBusinessDescription(
  workspaceId: string,
  workspace: Workspace,
  businessDescription: string,
): Promise<void> {
  await requireAgent(workspaceId);
  await aiAgentRepository.update(workspaceId, { businessDescription });
  await bumpStep(workspaceId, workspace, 6);
}

/** Step 7 */
async function saveTone(workspaceId: string, workspace: Workspace, tone: z.infer<typeof toneEnumSchema>): Promise<void> {
  await requireAgent(workspaceId);
  await aiAgentRepository.update(workspaceId, { tone });
  await bumpStep(workspaceId, workspace, 7);
}

/** Step 8 — optional */
async function saveHandoverSettings(
  workspaceId: string,
  workspace: Workspace,
  handover: z.infer<typeof handoverSchema>,
): Promise<void> {
  await requireAgent(workspaceId);
  await aiAgentRepository.update(workspaceId, {
    handoverEnabled: handover.handoverEnabled,
    handoverInstructions: handover.handoverInstructions ?? null,
  });
  await bumpStep(workspaceId, workspace, 8);
}

/** Step 9 — optional; left empty at Finish (step 10), the workspace gets generic starter FAQs instead — see completeOnboarding. */
async function saveKnowledgeBase(
  workspaceId: string,
  workspace: Workspace,
  data: z.infer<typeof knowledgeBaseSchema>,
): Promise<void> {
  await Promise.all([
    faqRepository.createMany(data.faqs.map((faq, index) => ({ ...faq, workspaceId, sortOrder: index }))),
    productRepository.createMany(
      data.products.map(({ galleryImageUrlsText, variantNamesText, discountedPrice, ...product }) => ({
        ...product,
        workspaceId,
        price: product.price?.toString(),
        discountedPrice: discountedPrice?.toString() ?? null,
        galleryImageUrls: parseGalleryImageUrls(galleryImageUrlsText),
        variants: parseVariantNames(variantNamesText),
      })),
    ),
    serviceRepository.createMany(
      data.services.map((service) => ({ ...service, workspaceId, price: service.price?.toString() })),
    ),
    policyRepository.upsert({
      workspaceId,
      shippingPolicy: data.shippingPolicy ?? null,
      returnsPolicy: data.returnsPolicy ?? null,
      paymentsPolicy: data.paymentsPolicy ?? null,
    }),
  ]);
  await bumpStep(workspaceId, workspace, 9);
}

/** Step 10 — Finish. A workspace that reaches here with a completely empty knowledge base gets generic, editable starter FAQs seeded in, rather than launching with nothing for the AI to draw on. */
async function completeOnboarding(workspaceId: string): Promise<void> {
  const workspace = await workspaceRepository.findById(workspaceId);
  if (!workspace) {
    throw new AppError("NOT_FOUND", "Workspace not found.");
  }

  const [faqs, products, services] = await Promise.all([
    faqRepository.findByWorkspaceId(workspaceId),
    productRepository.findByWorkspaceId(workspaceId),
    serviceRepository.findByWorkspaceId(workspaceId),
  ]);

  if (faqs.length === 0 && products.length === 0 && services.length === 0) {
    const seedFaqs = DEFAULT_KNOWLEDGE_BASE_FAQS[workspace.language] ?? DEFAULT_KNOWLEDGE_BASE_FAQS.ar;
    await faqRepository.createMany(
      seedFaqs.map((faq, index) => ({ ...faq, workspaceId, sortOrder: index })),
    );
  }

  await workspaceRepository.update(workspaceId, { onboardingStep: 10, onboardingCompletedAt: new Date() });
}

export const onboardingService = {
  getOnboardingState,
  saveOwnerName,
  saveBusinessInfo,
  saveBusinessType,
  saveLogo,
  skipLogo,
  saveAgentName,
  saveBusinessDescription,
  saveTone,
  saveHandoverSettings,
  saveKnowledgeBase,
  completeOnboarding,
};
