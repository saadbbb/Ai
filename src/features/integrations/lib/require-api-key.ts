import "server-only";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit/rate-limit";
import { hashApiKey } from "./api-key";
import { integrationService } from "../services/integration.service";

type ApiKeyAuthResult = { workspaceId: string; unauthorized?: never } | { workspaceId?: never; unauthorized: NextResponse };

const AUTHENTICATED_RATE_LIMIT = { windowSeconds: 60, max: 120 };
const FAILED_AUTH_RATE_LIMIT = { windowSeconds: 60, max: 10 };

/**
 * Shared bearer-auth check for /api/v1/* routes — same "return a NextResponse or null" idiom as
 * requireCronAuth. Rate-limited on both sides: a valid key is capped per-workspace (so a leaked
 * key can't flood-create records with no throttling), and repeated use of the same invalid token
 * is capped too (so hammering one guessed/revoked key doesn't hit the database unbounded).
 */
export async function requireApiKeyAuth(request: Request): Promise<ApiKeyAuthResult> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) {
    return { unauthorized: NextResponse.json({ error: "Missing API key." }, { status: 401 }) };
  }

  const failedAuthAllowed = await checkRateLimit(`api-key-auth-fail:${hashApiKey(token)}`, FAILED_AUTH_RATE_LIMIT);
  if (!failedAuthAllowed) {
    return { unauthorized: NextResponse.json({ error: "Too many requests." }, { status: 429 }) };
  }

  const workspaceId = await integrationService.authenticateApiKey(token);
  if (!workspaceId) {
    return { unauthorized: NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 }) };
  }

  const allowed = await checkRateLimit(`api-key:${workspaceId}`, AUTHENTICATED_RATE_LIMIT);
  if (!allowed) {
    return { unauthorized: NextResponse.json({ error: "Too many requests." }, { status: 429 }) };
  }

  return { workspaceId };
}
