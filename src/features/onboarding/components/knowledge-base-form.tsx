"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
    <StepShell
      step={9}
      title="Build your knowledge base"
      description="FAQs, products, services, and policies your AI can answer from. Everything here is optional — you can add more later."
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-medium">FAQs</h3>
          {existing.faqs.length > 0 && (
            <p className="text-xs text-muted-foreground">{existing.faqs.length} already saved.</p>
          )}
          {faqFields.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 rounded-lg border border-input p-2">
              <div className="flex-1 space-y-2">
                <Input placeholder="Question" {...register(`faqs.${index}.question`)} />
                <Textarea placeholder="Answer" {...register(`faqs.${index}.answer`)} />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => faqFields.remove(index)}>
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => faqFields.append({ question: "", answer: "" })}>
            Add FAQ
          </Button>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">Products</h3>
          {existing.products.length > 0 && (
            <p className="text-xs text-muted-foreground">{existing.products.length} already saved.</p>
          )}
          {productFields.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 rounded-lg border border-input p-2">
              <div className="flex-1 space-y-2">
                <Input placeholder="Product name" {...register(`products.${index}.name`)} />
                <Textarea placeholder="Description (optional)" {...register(`products.${index}.description`)} />
                <Input type="number" step="0.01" placeholder="Price (optional)" {...register(`products.${index}.price`)} />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => productFields.remove(index)}>
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => productFields.append({ name: "", description: "", price: undefined })}
          >
            Add product
          </Button>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">Services</h3>
          {existing.services.length > 0 && (
            <p className="text-xs text-muted-foreground">{existing.services.length} already saved.</p>
          )}
          {serviceFields.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 rounded-lg border border-input p-2">
              <div className="flex-1 space-y-2">
                <Input placeholder="Service name" {...register(`services.${index}.name`)} />
                <Textarea placeholder="Description (optional)" {...register(`services.${index}.description`)} />
                <div className="flex gap-2">
                  <Input type="number" step="0.01" placeholder="Price (optional)" {...register(`services.${index}.price`)} />
                  <Input
                    type="number"
                    placeholder="Duration (minutes)"
                    {...register(`services.${index}.durationMinutes`)}
                  />
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => serviceFields.remove(index)}>
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => serviceFields.append({ name: "", description: "", price: undefined, durationMinutes: undefined })}
          >
            Add service
          </Button>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">Policies (optional)</h3>
          <Textarea placeholder="Shipping policy" {...register("shippingPolicy")} />
          <Textarea placeholder="Returns policy" {...register("returnsPolicy")} />
          <Textarea placeholder="Payments policy" {...register("paymentsPolicy")} />
        </section>

        <StepFooter backHref="/onboarding/handover" isSubmitting={isSubmitting} continueLabel="Continue" />
      </form>
    </StepShell>
  );
}
