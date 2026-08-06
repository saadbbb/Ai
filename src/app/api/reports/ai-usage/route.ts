import { aiUsageRepository } from "@/features/ai/repository/ai-usage.repository";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { csvResponse, toCsv } from "@/lib/csv";

/**
 * Deliberately excludes `provider`/`model` from the export — PART 13B's "No AI
 * Terminology" rule applies to every tenant-facing surface, not just the UI,
 * and a CSV a business owner downloads is still tenant-facing.
 */
export async function GET() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);

  const rows = await aiUsageRepository.findByWorkspaceId(workspace.id);
  const csv = toCsv(
    ["Result", "Input Tokens", "Output Tokens", "Response Time (ms)", "Date"],
    rows.map((row) => [
      row.success ? "Success" : "Failed",
      row.inputTokens,
      row.outputTokens,
      row.latencyMs,
      row.createdAt.toISOString(),
    ]),
  );

  return csvResponse("ai-usage", csv);
}
