import "server-only";

/**
 * Thin wrapper around Vercel's Domains REST API (https://vercel.com/docs/rest-api/reference/endpoints/domains).
 * Needs a personal/team API token with domain-management scope — see DEFERRED_TASKS.md,
 * this is a real external-account dependency, not something buildable further from here.
 * Every function throws a plain Error with a message safe to surface to the workspace owner.
 */

interface VercelDnsRecord {
  type: string;
  name: string;
  value: string;
}

export interface VercelDomainConnectResult {
  verified: boolean;
  verificationRecord: VercelDnsRecord | null;
}

function isConfigured(): boolean {
  return !!(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID);
}

function withTeamQuery(url: string): string {
  return process.env.VERCEL_TEAM_ID ? `${url}${url.includes("?") ? "&" : "?"}teamId=${process.env.VERCEL_TEAM_ID}` : url;
}

function projectDomainsUrl(version: "v9" | "v10", suffix = ""): string {
  return withTeamQuery(`https://api.vercel.com/${version}/projects/${process.env.VERCEL_PROJECT_ID}/domains${suffix}`);
}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`, "Content-Type": "application/json" };
}

export function isCustomDomainConfigured(): boolean {
  return isConfigured();
}

/** Adds the domain to the Vercel project. Vercel treats an already-added domain as a no-op success. */
export async function connectDomain(domain: string): Promise<VercelDomainConnectResult> {
  if (!isConfigured()) {
    throw new Error("Custom domains aren't set up on this platform yet — contact support.");
  }

  const response = await fetch(projectDomainsUrl("v10"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name: domain }),
  });
  const data = await response.json();

  if (!response.ok && data?.error?.code !== "domain_already_in_use") {
    throw new Error(data?.error?.message ?? "Couldn't connect that domain.");
  }

  const verification = Array.isArray(data.verification) ? data.verification[0] : null;
  return {
    verified: !!data.verified,
    verificationRecord: verification ? { type: verification.type, name: verification.domain, value: verification.value } : null,
  };
}

/** Re-checks DNS. Returns the current verified state — Vercel itself performs the DNS lookup. */
export async function verifyDomain(domain: string): Promise<boolean> {
  if (!isConfigured()) {
    throw new Error("Custom domains aren't set up on this platform yet — contact support.");
  }

  const response = await fetch(projectDomainsUrl("v9", `/${domain}/verify`), {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Couldn't verify that domain yet.");
  }

  return !!data.verified;
}

export async function removeDomain(domain: string): Promise<void> {
  if (!isConfigured()) return;

  const response = await fetch(projectDomainsUrl("v9", `/${domain}`), {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!response.ok && response.status !== 404) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error?.message ?? "Couldn't remove that domain.");
  }
}
