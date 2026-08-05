import "server-only";
import type { AiAgent, BusinessPolicy, Faq, Product, Service, Workspace } from "@/db/schema";
import { aiAgentRepository } from "@/features/ai/repository/ai-agent.repository";
import type {
  creativityEnumSchema,
  handoverSchema,
  languageEnumSchema,
  toneEnumSchema,
  workingHoursSchema,
} from "@/features/ai/validation/schemas";
import { faqRepository } from "@/features/knowledge-base/repository/faq.repository";
import { policyRepository } from "@/features/knowledge-base/repository/policy.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import type { knowledgeBaseSchema } from "@/features/knowledge-base/validation/schemas";
import { workspaceRepository } from "@/features/workspace/repository/workspace.repository";
import { AppError } from "@/lib/errors/app-error";
import type { z } from "zod";

export interface OnboardingState {
  workspace: Workspace;
  agent: AiAgent | null;
  faqs: Faq[];
  products: Product[];
  services: Service[];
  policy: BusinessPolicy | null;
}

export interface BusinessInfoInput {
  name: string;
  businessType: string;
  country: string;
  timezone: string;
  language: z.infer<typeof languageEnumSchema>;
  logoUrl?: string;
}

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

async function saveBusinessInfo(workspaceId: string, data: BusinessInfoInput): Promise<void> {
  const workspace = await workspaceRepository.update(workspaceId, data);
  await bumpStep(workspaceId, workspace, 1);
}

async function saveAgentName(workspaceId: string, workspace: Workspace, name: string): Promise<void> {
  const existing = await aiAgentRepository.findByWorkspaceId(workspaceId);
  if (existing) {
    await aiAgentRepository.update(workspaceId, { name });
  } else {
    await aiAgentRepository.create({ workspaceId, name });
  }
  await bumpStep(workspaceId, workspace, 2);
}

async function saveBusinessDescription(
  workspaceId: string,
  workspace: Workspace,
  businessDescription: string,
): Promise<void> {
  await requireAgent(workspaceId);
  await aiAgentRepository.update(workspaceId, { businessDescription });
  await bumpStep(workspaceId, workspace, 3);
}

async function saveResponseLanguage(
  workspaceId: string,
  workspace: Workspace,
  language: z.infer<typeof languageEnumSchema>,
): Promise<void> {
  await requireAgent(workspaceId);
  await aiAgentRepository.update(workspaceId, { language });
  await bumpStep(workspaceId, workspace, 4);
}

async function saveTone(workspaceId: string, workspace: Workspace, tone: z.infer<typeof toneEnumSchema>): Promise<void> {
  await requireAgent(workspaceId);
  await aiAgentRepository.update(workspaceId, { tone });
  await bumpStep(workspaceId, workspace, 5);
}

async function saveCreativity(
  workspaceId: string,
  workspace: Workspace,
  creativity: z.infer<typeof creativityEnumSchema>,
): Promise<void> {
  await requireAgent(workspaceId);
  await aiAgentRepository.update(workspaceId, { creativity });
  await bumpStep(workspaceId, workspace, 6);
}

async function saveWorkingHours(
  workspaceId: string,
  workspace: Workspace,
  workingHours: z.infer<typeof workingHoursSchema>,
): Promise<void> {
  await requireAgent(workspaceId);
  await aiAgentRepository.update(workspaceId, {
    workingHours: { ...workingHours, holidayNotes: workingHours.holidayNotes ?? null },
  });
  await bumpStep(workspaceId, workspace, 7);
}

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

async function saveKnowledgeBase(
  workspaceId: string,
  workspace: Workspace,
  data: z.infer<typeof knowledgeBaseSchema>,
): Promise<void> {
  await Promise.all([
    faqRepository.createMany(data.faqs.map((faq, index) => ({ ...faq, workspaceId, sortOrder: index }))),
    productRepository.createMany(
      data.products.map((product) => ({ ...product, workspaceId, price: product.price?.toString() })),
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

async function completeOnboarding(workspaceId: string): Promise<void> {
  await workspaceRepository.update(workspaceId, { onboardingStep: 10, onboardingCompletedAt: new Date() });
}

export const onboardingService = {
  getOnboardingState,
  saveBusinessInfo,
  saveAgentName,
  saveBusinessDescription,
  saveResponseLanguage,
  saveTone,
  saveCreativity,
  saveWorkingHours,
  saveHandoverSettings,
  saveKnowledgeBase,
  completeOnboarding,
};
