import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiKeyAuth } from "@/features/integrations/lib/require-api-key";
import { integrationService } from "@/features/integrations/services/integration.service";

const createLeadSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(200).optional(),
});

/** Public API — authenticated via `Authorization: Bearer <api key>`, generated at /dashboard/integrations. */
export async function POST(request: Request) {
  const auth = await requireApiKeyAuth(request);
  if (auth.unauthorized) return auth.unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const result = await integrationService.createLeadViaApi(auth.workspaceId, parsed.data);
  return NextResponse.json({ data: result }, { status: 201 });
}
