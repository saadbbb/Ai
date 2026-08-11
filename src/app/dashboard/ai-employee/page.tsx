import { Bot } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/page-container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [t, tCommon, tLanguages, tTone, tCreativity] = await Promise.all([
    getTranslations("settings"),
    getTranslations("common"),
    getTranslations("onboarding.languages"),
    getTranslations("onboarding.tone.options"),
    getTranslations("onboarding.creativity.options"),
  ]);

  if (!agent) {
    redirect("/onboarding/business");
  }

  return (
    <PageContainer>
      <Card className="flex-row items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Bot className="size-6" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <h1 className="font-heading text-xl font-semibold text-foreground">{agent.name || t("pageTitle")}</h1>
            {agent.businessDescription && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{agent.businessDescription}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Badge variant="secondary">{tLanguages(agent.language)}</Badge>
              <Badge variant="secondary">{tTone(agent.tone)}</Badge>
              <Badge variant="secondary">{tCreativity(`${agent.creativity}.label`)}</Badge>
              <Badge variant={agent.handoverEnabled ? "secondary" : "outline"}>
                {agent.handoverEnabled ? t("handoverOn") : t("handoverOff")}
              </Badge>
            </div>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <a href="/api/reports/ai-usage">{tCommon("exportCsv")}</a>
        </Button>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{t("agentProfileTitle")}</TabsTrigger>
          <TabsTrigger value="personality">{t("personalityTitle")}</TabsTrigger>
          <TabsTrigger value="hours">{t("workingHoursTitle")}</TabsTrigger>
          <TabsTrigger value="handover">{t("handoverTitle")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="pt-4">
          <AgentProfileSettingsForm
            defaultValues={{ name: agent.name, businessDescription: agent.businessDescription ?? "" }}
          />
        </TabsContent>

        <TabsContent value="personality" className="pt-4">
          <PersonalitySettingsForm
            defaultValues={{ language: agent.language, tone: agent.tone, creativity: agent.creativity }}
          />
        </TabsContent>

        <TabsContent value="hours" className="pt-4">
          <WorkingHoursSettingsForm defaultValues={agent.workingHours ?? DEFAULT_WORKING_HOURS} />
        </TabsContent>

        <TabsContent value="handover" className="pt-4">
          <HandoverSettingsForm
            defaultValues={{
              handoverEnabled: agent.handoverEnabled,
              handoverInstructions: agent.handoverInstructions ?? "",
            }}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
