import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransientProviderError, type ChatMessage } from "../providers/types";

vi.mock("../providers/claude.provider", () => ({
  createClaudeProvider: vi.fn(),
}));

const { createClaudeProvider } = await import("../providers/claude.provider");
const { DEFAULT_MODEL, FALLBACK_MODEL, selectModel, selectProvider } = await import("./ai-router");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("selectModel", () => {
  it("picks the default model for a short, simple conversation", () => {
    const history: ChatMessage[] = [{ role: "user", content: "Hi, what are your hours?" }];
    expect(selectModel(history)).toBe(DEFAULT_MODEL);
  });

  it("escalates to the fallback model once the message count is high", () => {
    const history: ChatMessage[] = Array.from({ length: 25 }, (_, i) => ({
      role: "user" as const,
      content: `message ${i}`,
    }));
    expect(selectModel(history)).toBe(FALLBACK_MODEL);
  });

  it("escalates to the fallback model once the combined content is long", () => {
    const history: ChatMessage[] = [{ role: "user", content: "a".repeat(7000) }];
    expect(selectModel(history)).toBe(FALLBACK_MODEL);
  });
});

describe("selectProvider", () => {
  it("returns the primary model's result when it succeeds", async () => {
    const primaryReply = vi.fn().mockResolvedValue({ text: "ok" });
    vi.mocked(createClaudeProvider).mockReturnValue({ generateReply: primaryReply } as never);

    const provider = selectProvider(DEFAULT_MODEL);
    const result = await provider.generateReply({ systemPrompt: "sp", history: [] });

    expect(result).toEqual({ text: "ok" });
    expect(createClaudeProvider).toHaveBeenCalledWith(DEFAULT_MODEL);
    expect(createClaudeProvider).toHaveBeenCalledTimes(1);
  });

  it("falls back to FALLBACK_MODEL when the primary model throws a TransientProviderError", async () => {
    const primaryReply = vi.fn().mockRejectedValue(new TransientProviderError("overloaded"));
    const fallbackReply = vi.fn().mockResolvedValue({ text: "from fallback" });
    vi.mocked(createClaudeProvider).mockImplementation((model: string) =>
      ({ generateReply: model === DEFAULT_MODEL ? primaryReply : fallbackReply }) as never,
    );

    const provider = selectProvider(DEFAULT_MODEL);
    const result = await provider.generateReply({ systemPrompt: "sp", history: [] });

    expect(result).toEqual({ text: "from fallback" });
    expect(createClaudeProvider).toHaveBeenCalledWith(FALLBACK_MODEL);
  });

  it("does not fall back for a non-transient error", async () => {
    const primaryReply = vi.fn().mockRejectedValue(new Error("bad request"));
    vi.mocked(createClaudeProvider).mockReturnValue({ generateReply: primaryReply } as never);

    const provider = selectProvider(DEFAULT_MODEL);

    await expect(provider.generateReply({ systemPrompt: "sp", history: [] })).rejects.toThrow("bad request");
    expect(createClaudeProvider).toHaveBeenCalledTimes(1);
  });

  it("does not wrap with a fallback when already at the fallback tier", async () => {
    const reply = vi.fn().mockResolvedValue({ text: "ok" });
    vi.mocked(createClaudeProvider).mockReturnValue({ generateReply: reply } as never);

    const provider = selectProvider(FALLBACK_MODEL);
    await provider.generateReply({ systemPrompt: "sp", history: [] });

    expect(createClaudeProvider).toHaveBeenCalledTimes(1);
    expect(createClaudeProvider).toHaveBeenCalledWith(FALLBACK_MODEL);
  });
});
