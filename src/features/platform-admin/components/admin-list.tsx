"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PlatformAdmin, PlatformAdminRole } from "@/db/schema";
import { addPlatformAdminAction } from "../actions/add-platform-admin.action";
import { removePlatformAdminAction } from "../actions/remove-platform-admin.action";
import { setPlatformAdminRoleAction } from "../actions/set-platform-admin-role.action";
import { addPlatformAdminSchema } from "../validation/schemas";

const ROLES: PlatformAdminRole[] = ["administrator", "support_agent", "finance", "developer", "read_only"];

type FormValues = z.infer<typeof addPlatformAdminSchema>;

export function AdminList({
  initialAdmins,
  bootstrapEmails,
  currentUserEmail,
}: {
  initialAdmins: PlatformAdmin[];
  bootstrapEmails: string[];
  currentUserEmail: string;
}) {
  const t = useTranslations("platformAdmin.admins");
  const [admins, setAdmins] = useState(initialAdmins);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(addPlatformAdminSchema), defaultValues: { role: "administrator" } });
  const selectedRole = watch("role") ?? "administrator";

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await addPlatformAdminAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setAdmins((current) => [...current, result.data]);
    reset({ role: "administrator" });
  });

  async function handleRemove(id: string) {
    if (!window.confirm(t("confirmRemove"))) return;

    const result = await removePlatformAdminAction({ id });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setAdmins((current) => current.filter((admin) => admin.id !== id));
  }

  async function handleRoleChange(id: string, role: PlatformAdminRole) {
    const result = await setPlatformAdminRoleAction({ id, role });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setAdmins((current) => current.map((admin) => (admin.id === id ? result.data : admin)));
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("bootstrapHeading")}</h2>
        <p className="text-xs text-muted-foreground">{t("bootstrapDescription")}</p>
        <div className="divide-y rounded-lg border">
          {bootstrapEmails.map((email) => (
            <div key={email} className="flex items-center justify-between p-3 text-sm">
              <span>{email}</span>
              <span className="text-xs text-muted-foreground">{t("bootstrapBadge")}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("managedHeading")}</h2>
        {admins.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noManagedAdmins")}</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {admins.map((admin) => {
              const isSelf = admin.email === currentUserEmail.toLowerCase();
              return (
                <div key={admin.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <span className="truncate">{admin.email}</span>
                  <div className="flex items-center gap-2">
                    <Select
                      value={admin.role}
                      onValueChange={(value) => handleRoleChange(admin.id, value as PlatformAdminRole)}
                      disabled={isSelf}
                    >
                      <SelectTrigger size="sm" className="w-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {t(`roles.${role}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="sm" disabled={isSelf} onClick={() => handleRemove(admin.id)}>
                      {t("remove")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex items-start gap-2">
          <div className="flex-1">
            <Input placeholder={t("emailPlaceholder")} {...register("email")} />
            {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <Select value={selectedRole} onValueChange={(value) => setValue("role", value as PlatformAdminRole)}>
            <SelectTrigger size="sm" className="w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {t(`roles.${role}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("adding") : t("add")}
          </Button>
        </form>
      </div>
    </div>
  );
}
