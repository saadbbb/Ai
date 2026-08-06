import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/inbox/repository/contact.repository", () => ({
  contactRepository: { findById: vi.fn() },
}));

vi.mock("@/features/knowledge-base/repository/faq.repository", () => ({
  faqRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/knowledge-base/repository/policy.repository", () => ({
  policyRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/knowledge-base/repository/product.repository", () => ({
  productRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("@/features/knowledge-base/repository/service.repository", () => ({
  serviceRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("../repository/ai-agent.repository", () => ({
  aiAgentRepository: { findByWorkspaceId: vi.fn() },
}));

vi.mock("../repository/ai-usage.repository", () => ({
  aiUsageRepository: { create: vi.fn() },
}));

vi.mock("../prompt/prompt-builder", () => ({
  buildSystemPrompt: vi.fn().mockReturnValue("system prompt"),
}));

vi.mock("../router/ai-router", () => ({
  DEFAULT_MODEL: "claude-haiku-4-5",
  selectProvider: vi.fn(),
}));

vi.mock("../tools/registry", () => ({
  getToolDefinitions: vi.fn().mockReturnValue([]),
  createToolDispatcher: vi.fn(),
}));

const { aiUsageRepository } = await import("../repository/ai-usage.repository");
const { selectProvider } = await import("../router/ai-router");
const { aiService } = await import("./ai.service");

const WORKSPACE_ID = "workspace-1";

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
  vi.mocked(aiUsageRepository.create).mockResolvedValue(undefined as never);
});

describe("aiService.generateWorkflowFromDescription", () => {
  it("parses a well-formed JSON response into GeneratedWorkflowFields", async () => {
    mockProviderText('{"name":"Notify me","triggerType":"order_created","actionType":"notify_owner_email"}');

    const result = await aiService.generateWorkflowFromDescription(WORKSPACE_ID, "notify me on new orders");

    expect(result).toEqual({ name: "Notify me", triggerType: "order_created", actionType: "notify_owner_email" });
    expect(aiUsageRepository.create).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: WORKSPACE_ID, success: true }));
  });

  it("strips markdown code fences before parsing", async () => {
    mockProviderText('```json\n{"triggerType":"lead_created","actionType":"create_task","actionTaskTitle":"Follow up"}\n```');

    const result = await aiService.generateWorkflowFromDescription(WORKSPACE_ID, "create a task for new leads");

    expect(result).toEqual({
      triggerType: "lead_created",
      actionType: "create_task",
      actionTaskTitle: "Follow up",
    });
  });

  it("throws a validation error when the response is missing triggerType/actionType", async () => {
    mockProviderText('{"name":"Incomplete"}');

    await expect(aiService.generateWorkflowFromDescription(WORKSPACE_ID, "do something vague")).rejects.toThrow(
      /trigger and action/,
    );
  });

  it("throws a validation error when the response is not valid JSON", async () => {
    mockProviderText("not json at all");

    await expect(aiService.generateWorkflowFromDescription(WORKSPACE_ID, "gibberish")).rejects.toThrow(
      /Couldn't understand/,
    );
  });

  it("logs a failed AI usage row when the provider call itself throws", async () => {
    const generateReply = vi.fn().mockRejectedValue(new Error("provider down"));
    vi.mocked(selectProvider).mockReturnValue({ generateReply } as never);

    await expect(aiService.generateWorkflowFromDescription(WORKSPACE_ID, "anything")).rejects.toThrow("provider down");

    expect(aiUsageRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, success: false, errorMessage: "provider down" }),
    );
  });
});
