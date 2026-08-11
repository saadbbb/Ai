import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { AgentProfileSettingsForm } from "@/features/ai/components/agent-profile-settings-form";
import { HandoverSettingsForm } from "@/features/ai/components/handover-settings-form";
import { PersonalitySettingsForm } from "@/features/ai/components/personality-settings-form";
import { WorkingHoursSettingsForm } from "@/features/ai/components/working-hours-settings-form";
import { DEFAULT_WORKING_HOURS } from "@/features/ai/constants";
import { aiAgentRepository } from "@/features/ai/repository/ai-agent.repository";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

export default async function AiEmployeePage() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const agent = await aiAgentRepository.findByWorkspaceId(workspace.id);
  const [t, tCommon] = await Promise.all([getTranslations("settings"), getTranslations("common")]);

  if (!agent) {
    redirect("/onboarding/business");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        actions={
          <Button asChild variant="outline" size="sm">
            <a href="/api/reports/ai-usage">{tCommon("exportCsv")}</a>
          </Button>
        }
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
