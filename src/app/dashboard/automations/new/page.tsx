import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/page-header";
import { workflowRepository } from "@/features/automation/repository/workflow.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

// @xyflow/react is a heavy drag-and-drop graph library — split into its own
// chunk so it doesn't ship on every dashboard page, only this low-traffic one.
const WorkflowCanvas = dynamic(() =>
  import("@/features/automation/components/workflow-canvas/workflow-canvas").then((m) => m.WorkflowCanvas),
);

export default async function NewWorkflowPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "automations");
  await requireWorkspacePermission(user.id, workspace.id, "automation.workflows.manage");
  const t = await getTranslations("automations.new");

  const [members, workflows, products, services] = await Promise.all([
    membershipRepository.findMembersByWorkspaceId(workspace.id),
    workflowRepository.findByWorkspaceId(workspace.id),
    productRepository.findByWorkspaceId(workspace.id),
    serviceRepository.findByWorkspaceId(workspace.id),
  ]);

  const memberOptions = members.map((item) => ({ id: item.user.id, label: item.user.name ?? item.user.email ?? item.user.phone ?? "" }));
  const workflowOptions = workflows.map((workflow) => ({ id: workflow.id, name: workflow.name }));
  const productOptions = products
    .filter((product) => product.price !== null)
    .map((product) => ({ id: product.id, label: `${product.name} — ${product.price}` }));
  const serviceOptions = services.map((service) => ({ id: service.id, label: service.name }));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <WorkflowCanvas
        memberOptions={memberOptions}
        workflowOptions={workflowOptions}
        productOptions={productOptions}
        serviceOptions={serviceOptions}
      />
    </div>
  );
}
