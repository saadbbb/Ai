import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  contacts,
  type NewWorkflowApproval,
  type WorkflowApproval,
  workflowApprovals,
  type WorkflowApprovalStatus,
  workflows,
} from "@/db/schema";

export interface WorkflowApprovalListItem {
  approval: WorkflowApproval;
  workflowName: string;
  contactName: string;
}

export const workflowApprovalRepository = {
  async create(data: NewWorkflowApproval): Promise<WorkflowApproval> {
    const [approval] = await db.insert(workflowApprovals).values(data).returning();
    return approval;
  },

  async findById(id: string, workspaceId: string): Promise<WorkflowApproval | null> {
    const [approval] = await db
      .select()
      .from(workflowApprovals)
      .where(and(eq(workflowApprovals.id, id), eq(workflowApprovals.workspaceId, workspaceId)))
      .limit(1);
    return approval ?? null;
  },

  async findPendingByWorkspaceId(workspaceId: string): Promise<WorkflowApprovalListItem[]> {
    const rows = await db
      .select({ approval: workflowApprovals, workflowName: workflows.name, contactName: contacts.fullName })
      .from(workflowApprovals)
      .innerJoin(workflows, eq(workflows.id, workflowApprovals.workflowId))
      .innerJoin(contacts, eq(contacts.id, workflowApprovals.contactId))
      .where(and(eq(workflowApprovals.workspaceId, workspaceId), eq(workflowApprovals.status, "pending")))
      .orderBy(desc(workflowApprovals.createdAt));
    return rows;
  },

  async decide(
    id: string,
    workspaceId: string,
    status: Exclude<WorkflowApprovalStatus, "pending">,
    decidedByUserId: string,
  ): Promise<WorkflowApproval | null> {
    const [approval] = await db
      .update(workflowApprovals)
      .set({ status, decidedByUserId, decidedAt: new Date() })
      .where(
        and(
          eq(workflowApprovals.id, id),
          eq(workflowApprovals.workspaceId, workspaceId),
          eq(workflowApprovals.status, "pending"),
        ),
      )
      .returning();
    return approval ?? null;
  },
};
