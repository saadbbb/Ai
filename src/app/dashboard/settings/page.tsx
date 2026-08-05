import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AgentProfileSettingsForm } from "@/features/ai/components/agent-profile-settings-form";
import { BusinessInfoSettingsForm } from "@/features/ai/components/business-info-settings-form";
import { HandoverSettingsForm } from "@/features/ai/components/handover-settings-form";
import { PersonalitySettingsForm } from "@/features/ai/components/personality-settings-form";
import { WorkingHoursSettingsForm } from "@/features/ai/components/working-hours-settings-form";
import { DEFAULT_WORKING_HOURS } from "@/features/ai/constants";
import { aiAgentRepository } from "@/features/ai/repository/ai-agent.repository";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function SettingsPage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const agent = await aiAgentRepository.findByWorkspaceId(workspace.id);
  const t = await getTranslations("settings");

  if (!agent) {
    redirect("/onboarding/business");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("pageTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("pageDescription")}</p>
      </div>

      <BusinessInfoSettingsForm
        defaultValues={{
          name: workspace.name,
          businessType: workspace.businessType ?? "",
          country: workspace.country ?? "",
          timezone: workspace.timezone,
          language: workspace.language,
          logoUrl: workspace.logoUrl ?? "",
        }}
      />

      <AgentProfileSettingsForm
        defaultValues={{ name: agent.name, businessDescription: agent.businessDescription ?? "" }}
      />

      <PersonalitySettingsForm
        defaultValues={{ language: agent.language, tone: agent.tone, creativity: agent.creativity }}
      />

      <WorkingHoursSettingsForm defaultValues={agent.workingHours ?? DEFAULT_WORKING_HOURS} />

      <HandoverSettingsForm
        defaultValues={{
          handoverEnabled: agent.handoverEnabled,
          handoverInstructions: agent.handoverInstructions ?? "",
        }}
      />
    </div>
  );
}
