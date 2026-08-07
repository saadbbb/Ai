import "server-only";
import { NextResponse } from "next/server";
import { integrationService } from "../services/integration.service";

type ApiKeyAuthResult = { workspaceId: string; unauthorized?: never } | { workspaceId?: never; unauthorized: NextResponse };

/** Shared bearer-auth check for /api/v1/* routes — same "return a NextResponse or null" idiom as requireCronAuth. */
export async function requireApiKeyAuth(request: Request): Promise<ApiKeyAuthResult> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) {
    return { unauthorized: NextResponse.json({ error: "Missing API key." }, { status: 401 }) };
  }

  const workspaceId = await integrationService.authenticateApiKey(token);
  if (!workspaceId) {
    return { unauthorized: NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 }) };
  }

  return { workspaceId };
}
