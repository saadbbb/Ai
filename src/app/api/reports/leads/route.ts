import { crmService } from "@/features/crm/services/crm.service";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { parseReportFormat, reportResponse } from "@/lib/report-response";

export async function GET(request: Request) {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "leads");

  const format = parseReportFormat(new URL(request.url).searchParams.get("format"));
  const leads = await crmService.listLeads(workspace.id);

  return reportResponse(
    format,
    "leads",
    "Leads",
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
}
