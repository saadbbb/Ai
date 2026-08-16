"use client";

import { useTranslations } from "next-intl";
import type { z } from "zod";
import { toneEnumSchema } from "@/features/ai/validation/schemas";
import { RadioOptionGroup } from "./radio-option-group";

type Tone = z.infer<typeof toneEnumSchema>;

/**
 * The tone picker body shared by the onboarding wizard's Tone step and the AI Employee
 * settings Personality tab — same field (ai_agents.tone), same options, same markup.
 * Each caller keeps its own <Controller>/form wiring; this only owns the option list + labels.
 */
export function ToneField({ name = "tone", value, onChange }: { name?: string; value: Tone; onChange: (value: Tone) => void }) {
  const t = useTranslations("onboarding.tone");
  const toneOptions = toneEnumSchema.options.map((option) => ({ value: option, label: t(`options.${option}`) }));

  return <RadioOptionGroup name={name} value={value} onValueChange={(next) => onChange(next as Tone)} options={toneOptions} />;
}
