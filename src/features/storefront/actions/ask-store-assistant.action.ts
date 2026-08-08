"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { aiService } from "@/features/ai/services/ai.service";
import { storefrontRepository } from "@/features/storefront/repository/storefront.repository";
import { workspaceRepository } from "@/features/workspace/repository/workspace.repository";
import { checkRateLimit } from "@/lib/rate-limit/rate-limit";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000),
});

const inputSchema = z.object({
  slug: z.string().trim().min(1),
  history: z.array(chatMessageSchema).min(1).max(20),
});

/**
 * PART 13's AI Website Assistant gap — a public, zero-auth chat widget on the
 * storefront answering from the same FAQ/product/service/policy knowledge
 * base the AI employee already uses. Deliberately reply-only, no tool-calling
 * (no `context` passed to generateReply) — same safe path as the dashboard's
 * "test your AI employee" screen, since an anonymous storefront visitor isn't
 * a real contact/conversation for a tool call to act against.
 */
export async function askStoreAssistantAction(input: unknown): Promise<ActionResult<{ text: string }>> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  try {
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const allowed = await checkRateLimit(`storefront-ai:${parsed.data.slug}:${ip}`, { windowSeconds: 60 * 60, max: 20 });
    if (!allowed) {
      throw new AppError("RATE_LIMITED", "Too many messages sent. Please try again later.");
    }

    const workspace = await workspaceRepository.findBySlug(parsed.data.slug);
    if (!workspace) throw new AppError("NOT_FOUND", "This store no longer exists.");

    const storefront = await storefrontRepository.findByWorkspaceId(workspace.id);
    if (!storefront?.isPublished) throw new AppError("NOT_FOUND", "This store is not currently open.");

    const result = await aiService.generateReply(workspace.id, parsed.data.history);
    return actionOk({ text: result.text });
  } catch (error) {
    return actionFail(error);
  }
}
