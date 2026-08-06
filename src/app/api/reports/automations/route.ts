import { workflowRepository } from "@/features/automation/repository/workflow.repository";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { csvResponse, toCsv } from "@/lib/csv";

export async function GET() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "automations");

  const rows = await workflowRepository.findAllExecutionsByWorkspaceId(workspace.id);
  const csv = toCsv(
    ["Automation", "Result", "Summary", "Error", "Retries", "Triggered At"],
    rows.map(({ execution, workflowName }) => [
      workflowName,
      execution.success ? "Success" : "Failed",
      execution.summary ?? "",
      execution.errorMessage ?? "",
      execution.retryCount,
      execution.triggeredAt.toISOString(),
    ]),
  );

  return csvResponse("automations", csv);
}
