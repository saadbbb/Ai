"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Service } from "@/db/schema";
import { deleteServiceAction } from "../actions/delete-service.action";
import { saveServiceAction } from "../actions/save-service.action";

interface ServiceManagerProps {
  initialServices: Service[];
}

interface DraftService {
  name: string;
  description: string;
  price: string;
  durationMinutes: string;
}

const emptyDraft: DraftService = { name: "", description: "", price: "", durationMinutes: "" };

export function ServiceManager({ initialServices }: ServiceManagerProps) {
  const t = useTranslations("onboarding.knowledgeBase");
  const tCommon = useTranslations("common");
  const tPage = useTranslations("knowledgeBasePage");
  const [services, setServices] = useState(initialServices);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftService>(emptyDraft);
  const [newDraft, setNewDraft] = useState<DraftService>(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);

  function startEdit(service: Service) {
    setEditingId(service.id);
    setEditDraft({
      name: service.name,
      description: service.description ?? "",
      price: service.price ?? "",
      durationMinutes: service.durationMinutes?.toString() ?? "",
    });
  }

  async function saveEdit(id: string) {
    setIsSaving(true);
    const result = await saveServiceAction({
      id,
      name: editDraft.name,
      description: editDraft.description || undefined,
      price: editDraft.price === "" ? undefined : editDraft.price,
      durationMinutes: editDraft.durationMinutes === "" ? undefined : editDraft.durationMinutes,
    });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setServices((current) => current.map((service) => (service.id === id ? result.data : service)));
    setEditingId(null);
    toast.success(tCommon("saved"));
  }

  async function handleDelete(id: string) {
    if (!window.confirm(tCommon("confirmDelete"))) return;

    const result = await deleteServiceAction({ id });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setServices((current) => current.filter((service) => service.id !== id));
  }

  async function handleAdd() {
    if (!newDraft.name.trim()) return;

    setIsSaving(true);
    const result = await saveServiceAction({
      name: newDraft.name,
      description: newDraft.description || undefined,
      price: newDraft.price === "" ? undefined : newDraft.price,
      durationMinutes: newDraft.durationMinutes === "" ? undefined : newDraft.durationMinutes,
    });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setServices((current) => [...current, result.data]);
    setNewDraft(emptyDraft);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("servicesHeading")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {services.length === 0 && <p className="text-sm text-muted-foreground">{tPage("noItems")}</p>}
        {services.map((service) =>
          editingId === service.id ? (
            <div key={service.id} className="space-y-2 rounded-lg border border-input p-2">
              <Input
                value={editDraft.name}
                onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
                placeholder={t("serviceNamePlaceholder")}
              />
              <Textarea
                value={editDraft.description}
                onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })}
                placeholder={t("descriptionPlaceholder")}
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={editDraft.price}
                  onChange={(event) => setEditDraft({ ...editDraft, price: event.target.value })}
                  placeholder={t("pricePlaceholder")}
                />
                <Input
                  type="number"
                  value={editDraft.durationMinutes}
                  onChange={(event) => setEditDraft({ ...editDraft, durationMinutes: event.target.value })}
                  placeholder={t("durationPlaceholder")}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                  {tCommon("cancel")}
                </Button>
                <Button type="button" size="sm" disabled={isSaving} onClick={() => saveEdit(service.id)}>
                  {tCommon("save")}
                </Button>
              </div>
            </div>
          ) : (
            <div key={service.id} className="flex items-start justify-between gap-2 rounded-lg border border-input p-2">
              <div>
                <p className="text-sm font-medium">
                  {service.name}
                  {service.price && <span className="text-muted-foreground"> — {service.price}</span>}
                  {service.durationMinutes && (
                    <span className="text-muted-foreground"> ({service.durationMinutes} min)</span>
                  )}
                </p>
                {service.description && <p className="text-sm text-muted-foreground">{service.description}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(service)}>
                  {tCommon("edit")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(service.id)}>
                  {tCommon("delete")}
                </Button>
              </div>
            </div>
          ),
        )}

        <div className="space-y-2 rounded-lg border border-dashed border-input p-2">
          <Input
            value={newDraft.name}
            onChange={(event) => setNewDraft({ ...newDraft, name: event.target.value })}
            placeholder={t("serviceNamePlaceholder")}
          />
          <Textarea
            value={newDraft.description}
            onChange={(event) => setNewDraft({ ...newDraft, description: event.target.value })}
            placeholder={t("descriptionPlaceholder")}
          />
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              value={newDraft.price}
              onChange={(event) => setNewDraft({ ...newDraft, price: event.target.value })}
              placeholder={t("pricePlaceholder")}
            />
            <Input
              type="number"
              value={newDraft.durationMinutes}
              onChange={(event) => setNewDraft({ ...newDraft, durationMinutes: event.target.value })}
              placeholder={t("durationPlaceholder")}
            />
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={handleAdd}>
              {t("addService")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
