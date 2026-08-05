"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { startConversationAction } from "../actions/start-conversation.action";
import { startConversationSchema } from "../validation/schemas";

type FormValues = z.infer<typeof startConversationSchema>;

export function NewConversationForm() {
  const router = useRouter();
  const t = useTranslations("inbox.new");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(startConversationSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await startConversationAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push(`/dashboard/inbox/${result.data.id}`);
  });

  return (
    <Card>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t("contactNameLabel")} htmlFor="contactName" error={errors.contactName}>
            <Input id="contactName" {...register("contactName")} />
          </Field>
          <Field label={t("phoneLabel")} htmlFor="phone" error={errors.phone}>
            <Input id="phone" {...register("phone")} />
          </Field>
          <Field label={t("messageLabel")} htmlFor="initialMessage" error={errors.initialMessage}>
            <Textarea id="initialMessage" placeholder={t("messagePlaceholder")} rows={3} {...register("initialMessage")} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("submitting") : t("submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
