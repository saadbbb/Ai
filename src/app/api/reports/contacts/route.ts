import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { parseReportFormat, reportResponse } from "@/lib/report-response";

export async function GET(request: Request) {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "contacts");

  const format = parseReportFormat(new URL(request.url).searchParams.get("format"));
  const contacts = await contactRepository.findByWorkspaceId(workspace.id);

  return reportResponse(
    format,
    "contacts",
    "Contacts",
    ["Name", "Phone", "Email", "Language", "Country", "City", "Source", "Lifecycle Stage", "Tags", "Last Contact"],
    contacts.map((contact) => [
      contact.fullName,
      contact.phone ?? "",
      contact.email ?? "",
      contact.language ?? "",
      contact.country ?? "",
      contact.city ?? "",
      contact.source ?? "",
      contact.lifecycleStage,
      contact.tags.join("; "),
      contact.lastContactAt ? contact.lastContactAt.toISOString() : "",
    ]),
  );
}
