"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { billingCycleEnum, currencyEnum, type BillingCycle, type Currency, type Plan } from "@/db/schema";
import { deletePlanAction } from "../actions/delete-plan.action";
import { savePlanAction } from "../actions/save-plan.action";
import { FEATURE_KEYS, type FeatureKey } from "../lib/features";

const LIMIT_KEYS = [
  "maxUsers",
  "maxAiAgents",
  "maxChannels",
  "maxConversationsPerMonth",
  "maxStorageMb",
  "maxKnowledgeFiles",
  "maxAutomationWorkflows",
  "maxApiCallsPerMonth",
  "maxIntegrations",
] as const;
type LimitKey = (typeof LIMIT_KEYS)[number];

interface Draft {
  name: string;
  billingCycle: BillingCycle;
  defaultDurationDays: string;
  enabledFeatures: FeatureKey[];
  price: string;
  currency: Currency;
  limits: Record<LimitKey, string>;
}

const emptyLimits: Record<LimitKey, string> = {
  maxUsers: "",
  maxAiAgents: "",
  maxChannels: "",
  maxConversationsPerMonth: "",
  maxStorageMb: "",
  maxKnowledgeFiles: "",
  maxAutomationWorkflows: "",
  maxApiCallsPerMonth: "",
  maxIntegrations: "",
};

const emptyDraft: Draft = {
  name: "",
  billingCycle: "monthly",
  defaultDurationDays: "30",
  enabledFeatures: [],
  price: "",
  currency: "IQD",
  limits: { ...emptyLimits },
};

function draftFromPlan(plan: Plan): Draft {
  return {
    name: plan.name,
    billingCycle: plan.billingCycle,
    defaultDurationDays: String(plan.defaultDurationDays),
    enabledFeatures: plan.enabledFeatures as FeatureKey[],
    price: plan.price ?? "",
    currency: plan.currency,
    limits: Object.fromEntries(LIMIT_KEYS.map((key) => [key, plan[key] != null ? String(plan[key]) : ""])) as Record<LimitKey, string>,
  };
}

function toActionInput(draft: Draft) {
  const limitEntries = Object.fromEntries(
    LIMIT_KEYS.map((key) => [key, draft.limits[key].trim() ? draft.limits[key].trim() : undefined]),
  );
  return {
    name: draft.name,
    billingCycle: draft.billingCycle,
    defaultDurationDays: draft.defaultDurationDays,
    enabledFeatures: draft.enabledFeatures,
    price: draft.price.trim() || undefined,
    currency: draft.currency,
    ...limitEntries,
  };
}

function FeatureCheckboxes({
  t,
  selected,
  onChange,
}: {
  t: ReturnType<typeof useTranslations>;
  selected: FeatureKey[];
  onChange: (next: FeatureKey[]) => void;
}) {
  function toggle(key: FeatureKey) {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {FEATURE_KEYS.map((key) => (
        <label key={key} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selected.includes(key)} onChange={() => toggle(key)} />
          {t(`features.${key}`)}
        </label>
      ))}
    </div>
  );
}

function LimitInputs({
  t,
  limits,
  onChange,
}: {
  t: ReturnType<typeof useTranslations>;
  limits: Record<LimitKey, string>;
  onChange: (next: Record<LimitKey, string>) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("limitsHeading")}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {LIMIT_KEYS.map((key) => (
          <Input
            key={key}
            type="number"
            min="1"
            value={limits[key]}
            onChange={(event) => onChange({ ...limits, [key]: event.target.value })}
            placeholder={t(`limits.${key}`)}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t("limitsHint")}</p>
    </div>
  );
}

export function PlanManager({ initialPlans }: { initialPlans: Plan[] }) {
  const t = useTranslations("platformAdmin.plans");
  const tCommon = useTranslations("common");
  const [plans, setPlans] = useState(initialPlans);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);

  function startEdit(plan: Plan) {
    setEditingId(plan.id);
    setEditDraft(draftFromPlan(plan));
  }

  async function saveEdit(id: string) {
    setIsSaving(true);
    const result = await savePlanAction({ id, ...toActionInput(editDraft) });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setPlans((current) => current.map((plan) => (plan.id === id ? result.data : plan)));
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm(tCommon("confirmDelete"))) return;

    const result = await deletePlanAction({ id });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setPlans((current) => current.filter((plan) => plan.id !== id));
  }

  async function handleAdd() {
    if (!newDraft.name.trim()) return;

    setIsSaving(true);
    const result = await savePlanAction(toActionInput(newDraft));
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setPlans((current) => [...current, result.data]);
    setNewDraft(emptyDraft);
  }

  function limitsSummary(plan: Plan): string {
    const set = LIMIT_KEYS.filter((key) => plan[key] != null);
    if (set.length === 0) return t("noLimitsSet");
    return set.map((key) => `${t(`limits.${key}`)}: ${plan[key]}`).join(" · ");
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) =>
        editingId === plan.id ? (
          <div key={plan.id} className="space-y-3 rounded-lg border p-4">
            <Input
              value={editDraft.name}
              onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
              placeholder={t("namePlaceholder")}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={editDraft.billingCycle}
                onValueChange={(value) => setEditDraft({ ...editDraft, billingCycle: value as BillingCycle })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {billingCycleEnum.enumValues.map((cycle) => (
                    <SelectItem key={cycle} value={cycle}>
                      {t(`cycles.${cycle}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                value={editDraft.defaultDurationDays}
                onChange={(event) => setEditDraft({ ...editDraft, defaultDurationDays: event.target.value })}
                placeholder={t("daysPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editDraft.price}
                onChange={(event) => setEditDraft({ ...editDraft, price: event.target.value })}
                placeholder={t("pricePlaceholder")}
              />
              <Select value={editDraft.currency} onValueChange={(value) => setEditDraft({ ...editDraft, currency: value as Currency })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyEnum.enumValues.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FeatureCheckboxes
              t={t}
              selected={editDraft.enabledFeatures}
              onChange={(next) => setEditDraft({ ...editDraft, enabledFeatures: next })}
            />
            <LimitInputs t={t} limits={editDraft.limits} onChange={(next) => setEditDraft({ ...editDraft, limits: next })} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                {tCommon("cancel")}
              </Button>
              <Button type="button" size="sm" disabled={isSaving} onClick={() => saveEdit(plan.id)}>
                {tCommon("save")}
              </Button>
            </div>
          </div>
        ) : (
          <div key={plan.id} className="flex items-start justify-between gap-2 rounded-lg border p-4">
            <div>
              <p className="font-medium">
                {plan.name} <span className="text-sm text-muted-foreground">— {t(`cycles.${plan.billingCycle}`)}</span>
              </p>
              <p className="text-sm text-muted-foreground">{t("daysSummary", { days: plan.defaultDurationDays })}</p>
              <p className="text-sm text-muted-foreground">
                {plan.price ? t("priceSummary", { price: plan.price, currency: plan.currency }) : t("noPriceSet")}
              </p>
              <p className="text-sm text-muted-foreground">
                {plan.enabledFeatures.length === 0
                  ? t("noFeatures")
                  : plan.enabledFeatures.map((key) => t(`features.${key}`)).join(", ")}
              </p>
              <p className="text-sm text-muted-foreground">{limitsSummary(plan)}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(plan)}>
                {tCommon("edit")}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(plan.id)}>
                {tCommon("delete")}
              </Button>
            </div>
          </div>
        ),
      )}

      <div className="space-y-3 rounded-lg border border-dashed p-4">
        <Input
          value={newDraft.name}
          onChange={(event) => setNewDraft({ ...newDraft, name: event.target.value })}
          placeholder={t("namePlaceholder")}
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={newDraft.billingCycle}
            onValueChange={(value) => setNewDraft({ ...newDraft, billingCycle: value as BillingCycle })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {billingCycleEnum.enumValues.map((cycle) => (
                <SelectItem key={cycle} value={cycle}>
                  {t(`cycles.${cycle}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="1"
            value={newDraft.defaultDurationDays}
            onChange={(event) => setNewDraft({ ...newDraft, defaultDurationDays: event.target.value })}
            placeholder={t("daysPlaceholder")}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={newDraft.price}
            onChange={(event) => setNewDraft({ ...newDraft, price: event.target.value })}
            placeholder={t("pricePlaceholder")}
          />
          <Select value={newDraft.currency} onValueChange={(value) => setNewDraft({ ...newDraft, currency: value as Currency })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencyEnum.enumValues.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <FeatureCheckboxes
          t={t}
          selected={newDraft.enabledFeatures}
          onChange={(next) => setNewDraft({ ...newDraft, enabledFeatures: next })}
        />
        <LimitInputs t={t} limits={newDraft.limits} onChange={(next) => setNewDraft({ ...newDraft, limits: next })} />
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={handleAdd}>
            {t("addPlan")}
          </Button>
        </div>
      </div>
    </div>
  );
}
