import "server-only";
import { faqRepository } from "@/features/knowledge-base/repository/faq.repository";
import { policyRepository } from "@/features/knowledge-base/repository/policy.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import { AppError } from "@/lib/errors/app-error";
import { aiAgentRepository } from "../repository/ai-agent.repository";
import { buildSystemPrompt } from "../prompt/prompt-builder";
import { selectProvider } from "../router/ai-router";
import type { ChatMessage, GenerateReplyResult } from "../providers/types";

async function generateReply(workspaceId: string, history: ChatMessage[]): Promise<GenerateReplyResult> {
  const [agent, faqs, products, services, policy] = await Promise.all([
    aiAgentRepository.findByWorkspaceId(workspaceId),
    faqRepository.findByWorkspaceId(workspaceId),
    productRepository.findByWorkspaceId(workspaceId),
    serviceRepository.findByWorkspaceId(workspaceId),
    policyRepository.findByWorkspaceId(workspaceId),
  ]);

  if (!agent) {
    throw new AppError("VALIDATION_ERROR", "Finish setting up your AI employee before testing it.");
  }

  const systemPrompt = buildSystemPrompt({ agent, faqs, products, services, policy });
  const provider = selectProvider();

  return provider.generateReply({ systemPrompt, history });
}

export const aiService = {
  generateReply,
};
