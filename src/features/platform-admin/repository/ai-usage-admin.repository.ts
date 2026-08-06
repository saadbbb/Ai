import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { aiUsage, workspaces } from "@/db/schema";

export interface AiUsageSummary {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgLatencyMs: number;
}

export interface AiUsageByWorkspace {
  workspaceId: string;
  workspaceName: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
}

export interface AiUsageByModel {
  provider: string;
  model: string;
  requests: number;
  successCount: number;
  avgLatencyMs: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Deliberately separate from the tenant-scoped aiUsageRepository (features/ai)
 * — same "admin is the one place allowed to see across all workspaces" rule
 * as workspaceAdminRepository. Only ever called from requirePlatformAdmin()
 * -gated pages.
 */
export const aiUsageAdminRepository = {
  async getSummary(): Promise<AiUsageSummary> {
    const [row] = await db
      .select({
        totalRequests: sql<number>`count(*)`,
        successCount: sql<number>`count(*) filter (where ${aiUsage.success} = true)`,
        failureCount: sql<number>`count(*) filter (where ${aiUsage.success} = false)`,
        totalInputTokens: sql<number>`coalesce(sum(${aiUsage.inputTokens}), 0)`,
        totalOutputTokens: sql<number>`coalesce(sum(${aiUsage.outputTokens}), 0)`,
        avgLatencyMs: sql<number>`coalesce(avg(${aiUsage.latencyMs}), 0)`,
      })
      .from(aiUsage);

    return {
      totalRequests: Number(row?.totalRequests ?? 0),
      successCount: Number(row?.successCount ?? 0),
      failureCount: Number(row?.failureCount ?? 0),
      totalInputTokens: Number(row?.totalInputTokens ?? 0),
      totalOutputTokens: Number(row?.totalOutputTokens ?? 0),
      avgLatencyMs: Math.round(Number(row?.avgLatencyMs ?? 0)),
    };
  },

  async getByWorkspace(): Promise<AiUsageByWorkspace[]> {
    const rows = await db
      .select({
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        requests: sql<number>`count(${aiUsage.id})`,
        inputTokens: sql<number>`coalesce(sum(${aiUsage.inputTokens}), 0)`,
        outputTokens: sql<number>`coalesce(sum(${aiUsage.outputTokens}), 0)`,
      })
      .from(aiUsage)
      .innerJoin(workspaces, eq(workspaces.id, aiUsage.workspaceId))
      .groupBy(workspaces.id, workspaces.name)
      .orderBy(desc(sql`count(${aiUsage.id})`));

    return rows.map((row) => ({
      workspaceId: row.workspaceId,
      workspaceName: row.workspaceName,
      requests: Number(row.requests),
      inputTokens: Number(row.inputTokens),
      outputTokens: Number(row.outputTokens),
    }));
  },

  /** Per-provider/model breakdown — only "claude" exists today, but the router already carries provider+model per call, so this scales unchanged once a second provider is added. */
  async getByModel(): Promise<AiUsageByModel[]> {
    const rows = await db
      .select({
        provider: aiUsage.provider,
        model: aiUsage.model,
        requests: sql<number>`count(*)`,
        successCount: sql<number>`count(*) filter (where ${aiUsage.success} = true)`,
        avgLatencyMs: sql<number>`coalesce(avg(${aiUsage.latencyMs}), 0)`,
        inputTokens: sql<number>`coalesce(sum(${aiUsage.inputTokens}), 0)`,
        outputTokens: sql<number>`coalesce(sum(${aiUsage.outputTokens}), 0)`,
      })
      .from(aiUsage)
      .groupBy(aiUsage.provider, aiUsage.model)
      .orderBy(desc(sql`count(*)`));

    return rows.map((row) => ({
      provider: row.provider,
      model: row.model,
      requests: Number(row.requests),
      successCount: Number(row.successCount),
      avgLatencyMs: Math.round(Number(row.avgLatencyMs)),
      inputTokens: Number(row.inputTokens),
      outputTokens: Number(row.outputTokens),
    }));
  },
};
