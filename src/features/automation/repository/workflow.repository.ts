import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "@/db/client";
import {
  type NewWorkflow,
  type NewWorkflowExecution,
  type NewWorkflowPendingRun,
  type Workflow,
  type WorkflowExecution,
  workflowExecutions,
  type WorkflowPendingRun,
  workflowPendingRuns,
  workflows,
  type WorkflowStatus,
  type WorkflowTrigger,
} from "@/db/schema";

export const workflowRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<Workflow[]> {
    return db.select().from(workflows).where(eq(workflows.workspaceId, workspaceId)).orderBy(desc(workflows.createdAt));
  },

  async findById(id: string, workspaceId: string): Promise<Workflow | null> {
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.workspaceId, workspaceId)))
      .limit(1);
    return workflow ?? null;
  },

  async findActiveByTrigger(workspaceId: string, triggerType: WorkflowTrigger): Promise<Workflow[]> {
    return db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.workspaceId, workspaceId),
          eq(workflows.triggerType, triggerType),
          eq(workflows.status, "active"),
        ),
      );
  },

  async create(data: NewWorkflow): Promise<Workflow> {
    const [workflow] = await db.insert(workflows).values(data).returning();
    return workflow;
  },

  async updateStatus(id: string, workspaceId: string, status: WorkflowStatus): Promise<Workflow | null> {
    const [workflow] = await db
      .update(workflows)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(workflows.id, id), eq(workflows.workspaceId, workspaceId)))
      .returning();
    return workflow ?? null;
  },

  async delete(id: string, workspaceId: string): Promise<void> {
    await db.delete(workflows).where(and(eq(workflows.id, id), eq(workflows.workspaceId, workspaceId)));
  },

  async logExecution(data: NewWorkflowExecution): Promise<WorkflowExecution> {
    const [execution] = await db.insert(workflowExecutions).values(data).returning();
    return execution;
  },

  async findExecutionsByWorkflowId(workflowId: string, workspaceId: string): Promise<WorkflowExecution[]> {
    return db
      .select()
      .from(workflowExecutions)
      .where(and(eq(workflowExecutions.workflowId, workflowId), eq(workflowExecutions.workspaceId, workspaceId)))
      .orderBy(desc(workflowExecutions.triggeredAt))
      .limit(20);
  },

  /** Every execution across every workflow in the workspace — feeds the Automation CSV report. */
  async findAllExecutionsByWorkspaceId(workspaceId: string): Promise<{ execution: WorkflowExecution; workflowName: string }[]> {
    const rows = await db
      .select({ execution: workflowExecutions, workflowName: workflows.name })
      .from(workflowExecutions)
      .innerJoin(workflows, eq(workflows.id, workflowExecutions.workflowId))
      .where(eq(workflowExecutions.workspaceId, workspaceId))
      .orderBy(desc(workflowExecutions.triggeredAt));
    return rows;
  },

  async createPendingRun(data: NewWorkflowPendingRun): Promise<WorkflowPendingRun> {
    const [pendingRun] = await db.insert(workflowPendingRuns).values(data).returning();
    return pendingRun;
  },

  /** Cross-workspace by design — only ever called from the automation-delays cron sweep. */
  async findDuePendingRuns(now: Date): Promise<WorkflowPendingRun[]> {
    return db.select().from(workflowPendingRuns).where(lte(workflowPendingRuns.runAfter, now));
  },

  async deletePendingRun(id: string): Promise<void> {
    await db.delete(workflowPendingRuns).where(eq(workflowPendingRuns.id, id));
  },
};
