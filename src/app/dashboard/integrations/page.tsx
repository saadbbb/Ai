import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { ApiKeyManager } from "@/features/integrations/components/api-key-manager";
import { WebhookSubscriptionManager } from "@/features/integrations/components/webhook-subscription-manager";
import { integrationService } from "@/features/integrations/services/integration.service";
import { requireFeature, requireUser, requireWorkspaceForUser, requireWorkspacePermission } from "@/lib/auth/auth-guard";

export default async function IntegrationsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "integrations");
  await requireWorkspacePermission(user.id, workspace.id, "integrations.manage");
  const t = await getTranslations("integrations");

  const [apiKeys, webhookSubscriptions] = await Promise.all([
    integrationService.listApiKeys(workspace.id),
    integrationService.listWebhookSubscriptions(workspace.id),
  ]);

  return (
    <PageContainer className="mx-auto max-w-2xl">
      <PageHeader title={t("title")} description={t("description")} />
      <ApiKeyManager initialApiKeys={apiKeys} />
      <WebhookSubscriptionManager initialSubscriptions={webhookSubscriptions} />
    </PageContainer>
  );
}
