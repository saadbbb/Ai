"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessPolicy, Faq, Product, Service } from "@/db/schema";
import { knowledgeBaseSchema } from "@/features/knowledge-base/validation/schemas";
import { saveKnowledgeBaseAction } from "../actions/save-knowledge-base.action";
import { StepFooter } from "./step-footer";
import { StepShell } from "./step-shell";

type KnowledgeBaseInput = z.input<typeof knowledgeBaseSchema>;

interface KnowledgeBaseFormProps {
  existing: { faqs: Faq[]; products: Product[]; services: Service[]; policy: BusinessPolicy | null };
}

export function KnowledgeBaseForm({ existing }: KnowledgeBaseFormProps) {
  const router = useRouter();
  const t = useTranslations("onboarding.knowledgeBase");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, control } = useForm<KnowledgeBaseInput>({
    resolver: zodResolver(knowledgeBaseSchema),
    defaultValues: {
      faqs: [],
      products: [],
      services: [],
      shippingPolicy: existing.policy?.shippingPolicy ?? "",
      returnsPolicy: existing.policy?.returnsPolicy ?? "",
      paymentsPolicy: existing.policy?.paymentsPolicy ?? "",
    },
  });

  const faqFields = useFieldArray({ control, name: "faqs" });
  const productFields = useFieldArray({ control, name: "products" });
  const serviceFields = useFieldArray({ control, name: "services" });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await saveKnowledgeBaseAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.push("/onboarding/channels");
  });

  return (
    <StepShell step={9} title={t("title")} description={t("description")}>
      <form onSubmit={onSubmit} className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t("faqsHeading")}</h3>
          {existing.faqs.length > 0 && (
            <p className="text-xs text-muted-foreground">{t("alreadySaved", { count: existing.faqs.length })}</p>
          )}
          {faqFields.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 rounded-lg border border-input p-2">
              <div className="flex-1 space-y-2">
                <Input placeholder={t("questionPlaceholder")} {...register(`faqs.${index}.question`)} />
                <Textarea placeholder={t("answerPlaceholder")} {...register(`faqs.${index}.answer`)} />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => faqFields.remove(index)}>
                {t("remove")}
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => faqFields.append({ question: "", answer: "" })}>
            {t("addFaq")}
          </Button>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t("productsHeading")}</h3>
          {existing.products.length > 0 && (
            <p className="text-xs text-muted-foreground">{t("alreadySaved", { count: existing.products.length })}</p>
          )}
          {productFields.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 rounded-lg border border-input p-2">
              <div className="flex-1 space-y-2">
                <Input placeholder={t("productNamePlaceholder")} {...register(`products.${index}.name`)} />
                <Textarea placeholder={t("descriptionPlaceholder")} {...register(`products.${index}.description`)} />
                <Input
                  type="number"
                  step="0.01"
                  placeholder={t("pricePlaceholder")}
                  {...register(`products.${index}.price`)}
                />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => productFields.remove(index)}>
                {t("remove")}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => productFields.append({ name: "", description: "", price: undefined })}
          >
            {t("addProduct")}
          </Button>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t("servicesHeading")}</h3>
          {existing.services.length > 0 && (
            <p className="text-xs text-muted-foreground">{t("alreadySaved", { count: existing.services.length })}</p>
          )}
          {serviceFields.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 rounded-lg border border-input p-2">
              <div className="flex-1 space-y-2">
                <Input placeholder={t("serviceNamePlaceholder")} {...register(`services.${index}.name`)} />
                <Textarea placeholder={t("descriptionPlaceholder")} {...register(`services.${index}.description`)} />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={t("pricePlaceholder")}
                    {...register(`services.${index}.price`)}
                  />
                  <Input
                    type="number"
                    placeholder={t("durationPlaceholder")}
                    {...register(`services.${index}.durationMinutes`)}
                  />
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => serviceFields.remove(index)}>
                {t("remove")}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => serviceFields.append({ name: "", description: "", price: undefined, durationMinutes: undefined })}
          >
            {t("addService")}
          </Button>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t("policiesHeading")}</h3>
          <Textarea placeholder={t("shippingPlaceholder")} {...register("shippingPolicy")} />
          <Textarea placeholder={t("returnsPlaceholder")} {...register("returnsPolicy")} />
          <Textarea placeholder={t("paymentsPlaceholder")} {...register("paymentsPolicy")} />
        </section>

        <StepFooter backHref="/onboarding/handover" isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
}
