import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlogPost } from "@/db/schema";

vi.mock("../repository/blog-post.repository", () => ({
  blogPostRepository: {
    findByWorkspaceId: vi.fn(),
    findById: vi.fn(),
    findBySlugAnyStatus: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/features/ai/repository/ai-usage.repository", () => ({
  aiUsageRepository: { create: vi.fn() },
}));

vi.mock("@/features/ai/router/ai-router", () => ({
  DEFAULT_MODEL: "claude-haiku-4-5",
  selectProvider: vi.fn(),
}));

const { blogPostRepository } = await import("../repository/blog-post.repository");
const { aiUsageRepository } = await import("@/features/ai/repository/ai-usage.repository");
const { selectProvider } = await import("@/features/ai/router/ai-router");
const { blogService } = await import("./blog.service");

const WORKSPACE_ID = "workspace-1";

function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: "post-1",
    workspaceId: WORKSPACE_ID,
    title: "Hello world",
    slug: "hello-world",
    excerpt: null,
    content: "Body text",
    coverImageUrl: null,
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function mockProviderText(text: string) {
  const generateReply = vi.fn().mockResolvedValue({
    text,
    stopReason: "end_turn",
    needsHumanHandover: false,
    usage: { inputTokens: 10, outputTokens: 10 },
  });
  vi.mocked(selectProvider).mockReturnValue({ generateReply } as never);
  return generateReply;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("blogService.createPost", () => {
  it("derives the slug from the title when none is given", async () => {
    vi.mocked(blogPostRepository.findBySlugAnyStatus).mockResolvedValue(null);
    const created = makePost();
    vi.mocked(blogPostRepository.create).mockResolvedValue(created);

    await blogService.createPost(WORKSPACE_ID, {
      title: "Hello World!",
      content: "Body text",
      isPublished: false,
    });

    expect(blogPostRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, slug: "hello-world" }),
    );
  });

  it("rejects a slug that's already taken in this workspace", async () => {
    vi.mocked(blogPostRepository.findBySlugAnyStatus).mockResolvedValue(makePost({ id: "other-post" }));

    await expect(
      blogService.createPost(WORKSPACE_ID, { title: "Hello", slug: "hello-world", content: "Body", isPublished: false }),
    ).rejects.toThrow("A post with that URL slug already exists.");
  });
});

describe("blogService.updatePost", () => {
  it("allows keeping the same slug on the same post", async () => {
    const existing = makePost();
    vi.mocked(blogPostRepository.findBySlugAnyStatus).mockResolvedValue(existing);
    vi.mocked(blogPostRepository.update).mockResolvedValue(existing);

    await blogService.updatePost(WORKSPACE_ID, "post-1", {
      title: "Hello world",
      slug: "hello-world",
      content: "Body text",
      isPublished: true,
    });

    expect(blogPostRepository.update).toHaveBeenCalledWith(
      "post-1",
      WORKSPACE_ID,
      expect.objectContaining({ slug: "hello-world", isPublished: true }),
    );
  });

  it("throws NOT_FOUND when the post doesn't belong to this workspace", async () => {
    vi.mocked(blogPostRepository.findBySlugAnyStatus).mockResolvedValue(null);
    vi.mocked(blogPostRepository.update).mockResolvedValue(null);

    await expect(
      blogService.updatePost(WORKSPACE_ID, "ghost-post", { title: "X", content: "Y", isPublished: false }),
    ).rejects.toThrow("Post not found.");
  });
});

describe("blogService.deletePost", () => {
  it("throws NOT_FOUND when the post doesn't belong to this workspace", async () => {
    vi.mocked(blogPostRepository.findById).mockResolvedValue(null);

    await expect(blogService.deletePost(WORKSPACE_ID, "ghost-post")).rejects.toThrow("Post not found.");
    expect(blogPostRepository.delete).not.toHaveBeenCalled();
  });

  it("deletes an existing post", async () => {
    vi.mocked(blogPostRepository.findById).mockResolvedValue(makePost());

    await blogService.deletePost(WORKSPACE_ID, "post-1");

    expect(blogPostRepository.delete).toHaveBeenCalledWith("post-1", WORKSPACE_ID);
  });
});

describe("blogService.generateDraft", () => {
  it("parses the model's JSON response into a draft", async () => {
    mockProviderText('{"title": "5 Tips", "excerpt": "A quick summary.", "content": "Paragraph one.\\n\\nParagraph two."}');

    const draft = await blogService.generateDraft(WORKSPACE_ID, "tips for our customers");

    expect(draft).toEqual({ title: "5 Tips", excerpt: "A quick summary.", content: "Paragraph one.\n\nParagraph two." });
    expect(aiUsageRepository.create).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: WORKSPACE_ID, success: true }));
  });

  it("strips markdown code fences before parsing", async () => {
    mockProviderText('```json\n{"title": "Fenced", "excerpt": "", "content": "Body"}\n```');

    const draft = await blogService.generateDraft(WORKSPACE_ID, "topic");

    expect(draft.title).toBe("Fenced");
  });

  it("throws a validation error when the model doesn't return usable JSON", async () => {
    mockProviderText("not json at all");

    await expect(blogService.generateDraft(WORKSPACE_ID, "topic")).rejects.toThrow(
      "Couldn't draft a post from that topic — try rephrasing it.",
    );
  });
});
