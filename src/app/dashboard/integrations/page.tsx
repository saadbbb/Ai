import { getTranslations } from "next-intl/server";
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <ApiKeyManager initialApiKeys={apiKeys} />
      <WebhookSubscriptionManager initialSubscriptions={webhookSubscriptions} />
    </div>
  );
}
