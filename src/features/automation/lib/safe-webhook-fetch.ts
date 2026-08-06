import "server-only";
import dns from "node:dns/promises";
import { isIP } from "node:net";
import { AppError } from "@/lib/errors/app-error";

const WEBHOOK_TIMEOUT_MS = 5000;

/**
 * Blocks IPv4/IPv6 ranges that point back into the platform's own infrastructure
 * (loopback, link-local, private LAN, cloud metadata endpoints) — the webhook_call
 * automation action lets a workspace owner type in ANY URL, so without this check
 * a malicious or careless owner could point it at internal services.
 *
 * Known limitation, documented rather than hidden: this checks the IP(s) DNS
 * resolves to *before* connecting, not the IP `fetch` actually connects to — a
 * DNS-rebinding attacker who controls their own DNS server could in theory swap
 * the answer between the check and the request. Closing that gap fully requires
 * a custom connect-to-pinned-IP fetch agent, which is real additional
 * infrastructure, not a quick add — flagged as a follow-up, not silently skipped.
 */
function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata (169.254.169.254)
    if (a === 0) return true; // "this network"
    return false;
  }
  if (version === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === "::1") return true; // loopback
    if (normalized.startsWith("fe80:")) return true; // link-local
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local
    if (normalized.startsWith("::ffff:")) {
      // IPv4-mapped IPv6 — re-check the embedded IPv4 address.
      return isBlockedIp(normalized.replace("::ffff:", ""));
    }
    return false;
  }
  return true; // not a literal IP and DNS resolution failed to produce one — reject rather than guess.
}

async function assertSafeDestination(url: URL): Promise<void> {
  if (url.protocol !== "https:") {
    throw new AppError("VALIDATION_ERROR", "Webhook URL must use https://.");
  }
  if (url.hostname === "localhost") {
    throw new AppError("VALIDATION_ERROR", "Webhook URL may not target localhost.");
  }

  const literalVersion = isIP(url.hostname);
  const addresses =
    literalVersion !== 0
      ? [url.hostname]
      : (await dns.lookup(url.hostname, { all: true })).map((entry) => entry.address);

  if (addresses.length === 0 || addresses.some(isBlockedIp)) {
    throw new AppError("VALIDATION_ERROR", "Webhook URL resolves to a blocked address.");
  }
}

/**
 * POSTs a JSON payload to a workspace-owner-supplied URL with SSRF guards:
 * https-only, blocks internal/private IP ranges (see isBlockedIp), never
 * follows redirects (a redirect to an internal address would bypass the
 * upfront check), and enforces a hard timeout. Throws AppError on any
 * validation failure, network error, non-2xx response, or timeout — callers
 * (automationService's retry loop) treat that uniformly as an action failure.
 */
export async function safeWebhookPost(urlString: string, payload: unknown): Promise<void> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new AppError("VALIDATION_ERROR", "Webhook URL is not a valid URL.");
  }

  await assertSafeDestination(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "manual",
      signal: controller.signal,
    });

    // "manual" redirect mode surfaces a 3xx as a normal (opaqueredirect-free) response here
    // since this is a same-process server fetch, not a browser — treat it as untrusted.
    if (response.status >= 300 && response.status < 400) {
      throw new AppError("VALIDATION_ERROR", "Webhook URL returned a redirect, which is not followed for security.");
    }
    if (!response.ok) {
      throw new AppError("INTERNAL_ERROR", `Webhook endpoint responded with status ${response.status}.`);
    }

    // Drain (bounded) so the connection can be reused/closed cleanly — the response body itself is unused.
    await response.body?.cancel();
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError("INTERNAL_ERROR", "Webhook request timed out.");
    }
    throw new AppError("INTERNAL_ERROR", "Webhook request failed.");
  } finally {
    clearTimeout(timeout);
  }
}

export const __TEST_ONLY__ = { isBlockedIp };
