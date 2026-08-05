import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { csvResponse, toCsv } from "@/lib/csv";

export async function GET() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "contacts");

  const contacts = await contactRepository.findByWorkspaceId(workspace.id);
  const csv = toCsv(
    ["Name", "Phone", "Email", "Language", "Tags", "Last Contact"],
    contacts.map((contact) => [
      contact.fullName,
      contact.phone ?? "",
      contact.email ?? "",
      contact.language ?? "",
      contact.tags.join("; "),
      contact.lastContactAt ? contact.lastContactAt.toISOString() : "",
    ]),
  );

  return csvResponse("contacts", csv);
}
