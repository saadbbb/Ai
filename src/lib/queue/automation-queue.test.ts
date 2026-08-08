import { beforeEach, describe, expect, it, vi } from "vitest";

const addMock = vi.fn();

vi.mock("bullmq", () => ({
  // A named function, not an arrow — mockImplementation is invoked with `new`, and arrow
  // functions can't be constructors.
  Queue: vi.fn().mockImplementation(function QueueMock() {
    return { add: addMock };
  }),
}));

vi.mock("./connection", () => ({
  createQueueRedisConnection: vi.fn(),
}));

const { createQueueRedisConnection } = await import("./connection");

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  // getQueue() caches onto globalThis outside production (see automation-queue.ts,
  // same HMR-survival pattern as src/lib/redis/client.ts) — resetModules() alone
  // doesn't clear that, so each test would otherwise see the previous test's queue.
  Reflect.deleteProperty(globalThis, "__automationQueue");
});

describe("enqueueAutomationEvent", () => {
  it("returns false without touching bullmq when no Redis connection is configured", async () => {
    vi.mocked(createQueueRedisConnection).mockReturnValue(null);
    const { enqueueAutomationEvent } = await import("./automation-queue");

    const result = await enqueueAutomationEvent({ workspaceId: "workspace-1", event: { type: "lead_created", contactId: "contact-1" } });

    expect(result).toBe(false);
    expect(addMock).not.toHaveBeenCalled();
  });

  it("returns true once the job is added to the queue", async () => {
    vi.mocked(createQueueRedisConnection).mockReturnValue({} as never);
    addMock.mockResolvedValue({ id: "job-1" });
    const { enqueueAutomationEvent } = await import("./automation-queue");

    const result = await enqueueAutomationEvent({ workspaceId: "workspace-1", event: { type: "lead_created", contactId: "contact-1" } });

    expect(result).toBe(true);
    expect(addMock).toHaveBeenCalledWith(
      "event",
      { workspaceId: "workspace-1", event: { type: "lead_created", contactId: "contact-1" } },
      expect.objectContaining({ removeOnComplete: true }),
    );
  });

  it("returns false rather than throwing when the queue.add call rejects", async () => {
    vi.mocked(createQueueRedisConnection).mockReturnValue({} as never);
    addMock.mockRejectedValue(new Error("redis unreachable"));
    const { enqueueAutomationEvent } = await import("./automation-queue");

    const result = await enqueueAutomationEvent({ workspaceId: "workspace-1", event: { type: "lead_created", contactId: "contact-1" } });

    expect(result).toBe(false);
  });

  it("returns false if the enqueue doesn't settle before the timeout", async () => {
    vi.useFakeTimers();
    vi.mocked(createQueueRedisConnection).mockReturnValue({} as never);
    addMock.mockReturnValue(new Promise(() => {})); // never resolves
    const { enqueueAutomationEvent } = await import("./automation-queue");

    const resultPromise = enqueueAutomationEvent({ workspaceId: "workspace-1", event: { type: "lead_created", contactId: "contact-1" } });
    await vi.advanceTimersByTimeAsync(2100);

    expect(await resultPromise).toBe(false);
    vi.useRealTimers();
  });
});
