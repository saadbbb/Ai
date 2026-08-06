import { getTranslations } from "next-intl/server";
import { WorkflowCanvas } from "@/features/automation/components/workflow-canvas/workflow-canvas";
import { workflowRepository } from "@/features/automation/repository/workflow.repository";
import { productRepository } from "@/features/knowledge-base/repository/product.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

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

  const memberOptions = members.map((item) => ({ id: item.user.id, label: item.user.email }));
  const workflowOptions = workflows.map((workflow) => ({ id: workflow.id, name: workflow.name }));
  const productOptions = products
    .filter((product) => product.price !== null)
    .map((product) => ({ id: product.id, label: `${product.name} — ${product.price}` }));
  const serviceOptions = services.map((service) => ({ id: service.id, label: service.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <WorkflowCanvas
        memberOptions={memberOptions}
        workflowOptions={workflowOptions}
        productOptions={productOptions}
        serviceOptions={serviceOptions}
      />
    </div>
  );
}
