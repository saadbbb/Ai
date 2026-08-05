"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { appointmentStatusEnum, type AppointmentStatus } from "@/db/schema";
import { updateAppointmentStatusAction } from "../actions/update-appointment-status.action";

const STATUSES = appointmentStatusEnum.enumValues;

export function AppointmentStatusSelect({
  appointmentId,
  initialStatus,
}: {
  appointmentId: string;
  initialStatus: AppointmentStatus;
}) {
  const t = useTranslations("appointments");
  const [status, setStatus] = useState(initialStatus);

  async function handleChange(next: AppointmentStatus) {
    const previous = status;
    setStatus(next);

    const result = await updateAppointmentStatusAction({ appointmentId, status: next });
    if (!result.success) {
      toast.error(result.error.message);
      setStatus(previous);
    }
  }

  return (
    <Select value={status} onValueChange={(value) => handleChange(value as AppointmentStatus)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((option) => (
          <SelectItem key={option} value={option}>
            {t(`statuses.${option}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
