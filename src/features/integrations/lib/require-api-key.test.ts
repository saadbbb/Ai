import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rate-limit/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("../services/integration.service", () => ({
  integrationService: { authenticateApiKey: vi.fn() },
}));

const { checkRateLimit } = await import("@/lib/rate-limit/rate-limit");
const { integrationService } = await import("../services/integration.service");
const { requireApiKeyAuth } = await import("./require-api-key");

function makeRequest(authorization?: string): Request {
  return new Request("https://example.test/api/v1/contacts", {
    headers: authorization ? { authorization } : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkRateLimit).mockResolvedValue(true);
});

describe("requireApiKeyAuth", () => {
  it("rejects a missing Authorization header without touching rate limits or the DB", async () => {
    const result = await requireApiKeyAuth(makeRequest());

    expect(result.unauthorized?.status).toBe(401);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(integrationService.authenticateApiKey).not.toHaveBeenCalled();
  });

  it("returns the workspaceId for a valid key under the rate limit", async () => {
    vi.mocked(integrationService.authenticateApiKey).mockResolvedValue("workspace-1");

    const result = await requireApiKeyAuth(makeRequest("Bearer sk_live_valid"));

    expect(result.workspaceId).toBe("workspace-1");
    expect(checkRateLimit).toHaveBeenCalledWith("api-key:workspace-1", expect.objectContaining({ max: expect.any(Number) }));
  });

  it("rejects with 401 for an invalid or revoked key", async () => {
    vi.mocked(integrationService.authenticateApiKey).mockResolvedValue(null);

    const result = await requireApiKeyAuth(makeRequest("Bearer sk_live_wrong"));

    expect(result.unauthorized?.status).toBe(401);
  });

  it("rejects with 429 once the per-workspace rate limit is exceeded, after the key was verified valid", async () => {
    vi.mocked(integrationService.authenticateApiKey).mockResolvedValue("workspace-1");
    vi.mocked(checkRateLimit).mockImplementation(async (key) => key.startsWith("api-key-auth-fail"));

    const result = await requireApiKeyAuth(makeRequest("Bearer sk_live_flooding"));

    expect(result.unauthorized?.status).toBe(429);
    expect(integrationService.authenticateApiKey).toHaveBeenCalled();
  });

  it("rejects with 429 when the same invalid token is retried too fast, before ever hitting the DB", async () => {
    vi.mocked(checkRateLimit).mockImplementation(async (key) => !key.startsWith("api-key-auth-fail"));

    const result = await requireApiKeyAuth(makeRequest("Bearer sk_live_guessing"));

    expect(result.unauthorized?.status).toBe(429);
    expect(integrationService.authenticateApiKey).not.toHaveBeenCalled();
  });
});
