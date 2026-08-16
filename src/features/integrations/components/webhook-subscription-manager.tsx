"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { LtrText } from "@/components/ltr-text";
import { SettingsCard } from "@/components/settings-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { WebhookDelivery, WebhookSubscription } from "@/db/schema";
import { createWebhookSubscriptionAction } from "../actions/create-webhook-subscription.action";
import { deleteWebhookSubscriptionAction } from "../actions/delete-webhook-subscription.action";
import { listWebhookDeliveriesAction } from "../actions/list-webhook-deliveries.action";
import { setWebhookSubscriptionActiveAction } from "../actions/set-webhook-subscription-active.action";
import { AUTOMATION_EVENT_TYPES } from "../validation/schemas";

export function WebhookSubscriptionManager({ initialSubscriptions }: { initialSubscriptions: WebhookSubscription[] }) {
  const t = useTranslations("integrations.webhooks");
  const tEvents = useTranslations("automations.triggers");
  const tCommon = useTranslations("common");
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [url, setUrl] = useState("");
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(false);

  async function handleToggleDeliveries(subscriptionId: string) {
    if (expandedId === subscriptionId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(subscriptionId);
    setIsLoadingDeliveries(true);
    const result = await listWebhookDeliveriesAction({ subscriptionId });
    setIsLoadingDeliveries(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    setDeliveries(result.data);
  }

  function toggleEventType(type: string) {
    setEventTypes((current) => (current.includes(type) ? current.filter((item) => item !== type) : [...current, type]));
  }

  async function handleCreate() {
    if (!url.trim() || eventTypes.length === 0) {
      toast.error(t("requiredHint"));
      return;
    }

    setIsCreating(true);
    const result = await createWebhookSubscriptionAction({ url: url.trim(), eventTypes });
    setIsCreating(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setSubscriptions((current) => [result.data, ...current]);
    setUrl("");
    setEventTypes([]);
  }

  async function handleToggle(subscription: WebhookSubscription, next: boolean) {
    const result = await setWebhookSubscriptionActiveAction({ id: subscription.id, isActive: next });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    setSubscriptions((current) => current.map((item) => (item.id === subscription.id ? result.data : item)));
  }

  async function handleDelete(id: string) {
    if (!window.confirm(tCommon("confirmDelete"))) return;

    const result = await deleteWebhookSubscriptionAction({ id });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    setSubscriptions((current) => current.filter((item) => item.id !== id));
  }

  return (
    <SettingsCard title={t("heading")} description={t("description")}>
      <div className="space-y-4">
        <div className="space-y-2 rounded-lg border border-dashed border-input p-2">
          <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder={t("urlPlaceholder")} />
          <div className="grid grid-cols-2 gap-2">
            {AUTOMATION_EVENT_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm">
                <Checkbox checked={eventTypes.includes(type)} onCheckedChange={() => toggleEventType(type)} />
                {tEvents(type)}
              </label>
            ))}
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" disabled={isCreating} onClick={handleCreate}>
              {isCreating ? t("creating") : t("create")}
            </Button>
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {subscriptions.map((subscription) => (
              <div key={subscription.id} className="p-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <LtrText className="font-medium">{subscription.url}</LtrText>
                    <p className="truncate text-xs text-muted-foreground">
                      {subscription.eventTypes.map((type) => tEvents(type)).join(", ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleToggleDeliveries(subscription.id)}>
                      {expandedId === subscription.id ? t("hideDeliveries") : t("viewDeliveries")}
                    </Button>
                    <Switch checked={subscription.isActive} onCheckedChange={(next) => handleToggle(subscription, next)} />
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(subscription.id)}>
                      {tCommon("delete")}
                    </Button>
                  </div>
                </div>
                {expandedId === subscription.id && (
                  <div className="mt-2 space-y-1 rounded-md bg-muted/50 p-2">
                    {isLoadingDeliveries ? (
                      <p className="text-xs text-muted-foreground">{t("loadingDeliveries")}</p>
                    ) : deliveries.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t("noDeliveries")}</p>
                    ) : (
                      deliveries.map((delivery) => (
                        <div key={delivery.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className={delivery.success ? "text-green-600" : "text-destructive"}>
                            {delivery.success ? t("deliverySuccess") : t("deliveryFailed")}
                          </span>
                          <span className="text-muted-foreground">{tEvents(delivery.eventType)}</span>
                          <span className="text-muted-foreground">{new Date(delivery.createdAt).toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
