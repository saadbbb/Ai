import { crmService } from "@/features/crm/services/crm.service";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { csvResponse, toCsv } from "@/lib/csv";

export async function GET() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "leads");

  const leads = await crmService.listLeads(workspace.id);
  const csv = toCsv(
    ["Name", "Phone", "Email", "Stage", "Score", "Created At"],
    leads.map((item) => [
      item.contact.fullName,
      item.contact.phone ?? "",
      item.contact.email ?? "",
      item.lead.stage,
      item.score,
      item.lead.createdAt.toISOString(),
    ]),
  );

  return csvResponse("leads", csv);
}
