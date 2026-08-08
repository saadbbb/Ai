"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Contact, Service } from "@/db/schema";
import { createAppointmentAction } from "../actions/create-appointment.action";

export function NewAppointmentForm({
  contacts,
  services,
  members,
  defaultContactId,
}: {
  contacts: Contact[];
  services: Service[];
  members: { id: string; label: string }[];
  defaultContactId?: string;
}) {
  const router = useRouter();
  const t = useTranslations("appointments.new");
  const [contactId, setContactId] = useState(defaultContactId ?? "");
  const [serviceId, setServiceId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleServiceSelect(id: string) {
    const service = services.find((s) => s.id === id);
    setServiceId(id);
    setServiceName(service?.name ?? "");
    if (service?.durationMinutes) {
      setDurationMinutes(String(service.durationMinutes));
    }
  }

  async function handleSubmit() {
    if (!contactId) {
      toast.error(t("contactRequired"));
      return;
    }
    if (!scheduledAt) {
      toast.error(t("dateRequired"));
      return;
    }

    setIsSubmitting(true);
    const result = await createAppointmentAction({
      contactId,
      serviceId: serviceId || undefined,
      serviceName: serviceName || undefined,
      scheduledAt: new Date(scheduledAt).toISOString(),
      durationMinutes,
      notes: notes || undefined,
      assignedToUserId: assignedToUserId || undefined,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/dashboard/appointments");
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("contactLabel")}</label>
          <Select value={contactId} onValueChange={setContactId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("contactPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {services.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("serviceLabel")}</label>
            <Select value={serviceId} onValueChange={handleServiceSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("servicePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("serviceNameLabel")}</label>
          <Input value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder={t("serviceNamePlaceholder")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("dateTimeLabel")}</label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("durationLabel")}</label>
            <Input
              type="number"
              min="1"
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
            />
          </div>
        </div>

        {members.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("assignedToLabel")}</label>
            <Select value={assignedToUserId} onValueChange={setAssignedToUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("assignedToPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("notesLabel")}</label>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
        </div>

        <div className="flex justify-end">
          <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
