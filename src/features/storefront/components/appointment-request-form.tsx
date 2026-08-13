"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitAppointmentRequestAction } from "../actions/submit-appointment-request.action";
import { trackEvent } from "../lib/track-event";

interface AppointmentRequestFormProps {
  slug: string;
  services: { id: string; name: string }[];
}

export function AppointmentRequestForm({ slug, services }: AppointmentRequestFormProps) {
  const t = useTranslations("website.public.appointment");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState<string | undefined>(undefined);
  const [preferredAt, setPreferredAt] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit() {
    if (!fullName.trim() || !phone.trim() || !preferredAt) {
      toast.error(t("requiredHint"));
      return;
    }

    setIsSubmitting(true);
    const result = await submitAppointmentRequestAction({
      slug,
      fullName,
      phone,
      serviceId,
      preferredAt: new Date(preferredAt).toISOString(),
      notes: notes || undefined,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setIsSent(true);
    trackEvent("Lead");
  }

  if (isSent) {
    return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t("thankYou")}</p>;
  }

  return (
    <div className="space-y-3">
      <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={t("namePlaceholder")} />
      <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={t("phonePlaceholder")} />
      {services.length > 0 && (
        <Select value={serviceId} onValueChange={setServiceId}>
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
      )}
      <Input type="datetime-local" value={preferredAt} onChange={(event) => setPreferredAt(event.target.value)} />
      <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder={t("notesPlaceholder")} />
      <Button type="button" disabled={isSubmitting} onClick={handleSubmit} className="w-full">
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>
    </div>
  );
}
