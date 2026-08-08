import "server-only";
import type { BlogPost } from "@/db/schema";
import { aiUsageRepository } from "@/features/ai/repository/ai-usage.repository";
import { DEFAULT_MODEL, selectProvider } from "@/features/ai/router/ai-router";
import { AppError } from "@/lib/errors/app-error";
import { blogPostRepository } from "../repository/blog-post.repository";

interface BlogPostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  coverImageUrl?: string;
  isPublished: boolean;
}

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

async function assertSlugAvailable(workspaceId: string, slug: string, excludeId?: string): Promise<void> {
  const existing = await blogPostRepository.findBySlugAnyStatus(workspaceId, slug);
  if (existing && existing.id !== excludeId) {
    throw new AppError("VALIDATION_ERROR", "A post with that URL slug already exists.");
  }
}

async function listPosts(workspaceId: string): Promise<BlogPost[]> {
  return blogPostRepository.findByWorkspaceId(workspaceId);
}

async function createPost(workspaceId: string, input: BlogPostInput): Promise<BlogPost> {
  const slug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title);
  await assertSlugAvailable(workspaceId, slug);
  return blogPostRepository.create({ workspaceId, ...input, slug });
}

async function updatePost(workspaceId: string, postId: string, input: BlogPostInput): Promise<BlogPost> {
  const slug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title);
  await assertSlugAvailable(workspaceId, slug, postId);
  const updated = await blogPostRepository.update(postId, workspaceId, { ...input, slug });
  if (!updated) throw new AppError("NOT_FOUND", "Post not found.");
  return updated;
}

async function deletePost(workspaceId: string, postId: string): Promise<void> {
  const existing = await blogPostRepository.findById(postId, workspaceId);
  if (!existing) throw new AppError("NOT_FOUND", "Post not found.");
  await blogPostRepository.delete(postId, workspaceId);
}

interface GeneratedDraft {
  title: string;
  excerpt: string;
  content: string;
}

const DRAFT_SYSTEM_PROMPT = `You write a blog post for a small business's website. Output ONLY a single JSON
object, no markdown fences, no commentary, shaped exactly as:
{"title": "...", "excerpt": "a one-sentence summary, under 200 characters", "content": "the full post body,
plain text with blank lines between paragraphs, 3-6 paragraphs"}`;
const DRAFT_MAX_TOKENS = 1500;

/** Strips markdown code fences if the model wraps its JSON output in them despite instructions not to. */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

/** AI-assisted blog content (PART 13 gap #143) — drafts a post from a topic; staff review and edit before publishing. */
async function generateDraft(workspaceId: string, topic: string): Promise<GeneratedDraft> {
  const provider = selectProvider();
  const startedAt = Date.now();

  try {
    const result = await provider.generateReply({
      systemPrompt: DRAFT_SYSTEM_PROMPT,
      history: [{ role: "user", content: topic }],
      maxTokens: DRAFT_MAX_TOKENS,
    });
    await aiUsageRepository.create({
      workspaceId,
      provider: "claude",
      model: DEFAULT_MODEL,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: Date.now() - startedAt,
      success: true,
    });

    try {
      const parsed = JSON.parse(stripCodeFences(result.text)) as Partial<GeneratedDraft>;
      if (!parsed.title || !parsed.content) {
        throw new AppError("VALIDATION_ERROR", "Couldn't draft a post from that topic — try rephrasing it.");
      }
      return { title: parsed.title, excerpt: parsed.excerpt ?? "", content: parsed.content };
    } catch (parseError) {
      if (parseError instanceof AppError) throw parseError;
      throw new AppError("VALIDATION_ERROR", "Couldn't draft a post from that topic — try rephrasing it.");
    }
  } catch (error) {
    if (!(error instanceof AppError)) {
      await aiUsageRepository.create({
        workspaceId,
        provider: "claude",
        model: DEFAULT_MODEL,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - startedAt,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
    throw error;
  }
}

export const blogService = {
  listPosts,
  createPost,
  updatePost,
  deletePost,
  generateDraft,
};
