import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => ({
  default: { lookup: vi.fn() },
}));

const { default: dns } = await import("node:dns/promises");
const { safeWebhookPost, __TEST_ONLY__ } = await import("./safe-webhook-fetch");

describe("isBlockedIp", () => {
  it.each(["127.0.0.1", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "0.0.0.0"])(
    "blocks private/internal IPv4 address %s",
    (ip) => {
      expect(__TEST_ONLY__.isBlockedIp(ip)).toBe(true);
    },
  );

  it.each(["8.8.8.8", "1.1.1.1", "172.15.0.1", "172.32.0.1", "203.0.113.5"])(
    "allows public IPv4 address %s",
    (ip) => {
      expect(__TEST_ONLY__.isBlockedIp(ip)).toBe(false);
    },
  );

  it.each(["::1", "fe80::1", "fc00::1", "fd00::1"])("blocks internal IPv6 address %s", (ip) => {
    expect(__TEST_ONLY__.isBlockedIp(ip)).toBe(true);
  });

  it("blocks an IPv4-mapped IPv6 loopback address", () => {
    expect(__TEST_ONLY__.isBlockedIp("::ffff:127.0.0.1")).toBe(true);
  });

  it("allows a public IPv6 address", () => {
    expect(__TEST_ONLY__.isBlockedIp("2606:4700:4700::1111")).toBe(false);
  });
});

describe("safeWebhookPost", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dns.lookup).mockResolvedValue([{ address: "203.0.113.5", family: 4 }] as never);
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("rejects a non-https URL", async () => {
    await expect(safeWebhookPost("http://example.com/hook", {})).rejects.toThrow("https://");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects localhost outright, without a DNS lookup", async () => {
    await expect(safeWebhookPost("https://localhost/hook", {})).rejects.toThrow("localhost");
    expect(dns.lookup).not.toHaveBeenCalled();
  });

  it("rejects a hostname that resolves to a private IP", async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: "10.0.0.1", family: 4 }] as never);
    await expect(safeWebhookPost("https://internal.example.com/hook", {})).rejects.toThrow("blocked address");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects an IP-literal URL that is itself private, without a DNS lookup", async () => {
    await expect(safeWebhookPost("https://169.254.169.254/hook", {})).rejects.toThrow("blocked address");
    expect(dns.lookup).not.toHaveBeenCalled();
  });

  it("posts JSON to a public https URL and succeeds on 2xx", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      status: 200,
      ok: true,
      body: { cancel: vi.fn() },
    } as never);

    await safeWebhookPost("https://example.com/hook", { hello: "world" });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ method: "POST", redirect: "manual", body: JSON.stringify({ hello: "world" }) }),
    );
  });

  it("treats a redirect response as a failure instead of following it", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ status: 302, ok: false, body: null } as never);

    await expect(safeWebhookPost("https://example.com/hook", {})).rejects.toThrow("redirect");
  });

  it("treats a non-2xx response as a failure", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ status: 500, ok: false, body: { cancel: vi.fn() } } as never);

    await expect(safeWebhookPost("https://example.com/hook", {})).rejects.toThrow("status 500");
  });
});
