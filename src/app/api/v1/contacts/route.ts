import { NextResponse } from "next/server";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { requireApiKeyAuth } from "@/features/integrations/lib/require-api-key";

/** Public API — authenticated via `Authorization: Bearer <api key>`, generated at /dashboard/integrations. */
export async function GET(request: Request) {
  const auth = await requireApiKeyAuth(request);
  if (auth.unauthorized) return auth.unauthorized;

  const contacts = await contactRepository.findByWorkspaceId(auth.workspaceId);
  return NextResponse.json({
    data: contacts.map((contact) => ({
      id: contact.id,
      fullName: contact.fullName,
      phone: contact.phone,
      email: contact.email,
      source: contact.source,
      lifecycleStage: contact.lifecycleStage,
      tags: contact.tags,
      createdAt: contact.createdAt,
    })),
  });
}
