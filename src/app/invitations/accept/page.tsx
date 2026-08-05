import { getTranslations } from "next-intl/server";
import { AcceptInvitationButton } from "@/features/workspace/components/accept-invitation-button";
import { teamService } from "@/features/workspace/services/team.service";
import { requireUser } from "@/lib/auth/auth-guard";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitationPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  await requireUser();
  const t = await getTranslations("team.accept");

  const preview = !token ? { status: "not_found" as const } : await teamService.getInvitationPreview(token);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="max-w-sm space-y-4 rounded-lg border p-6 text-center">
        {preview.status === "valid" ? (
          <>
            <h1 className="text-lg font-semibold">{t("title", { workspace: preview.workspaceName ?? "" })}</h1>
            <p className="text-sm text-muted-foreground">{t("description", { role: preview.roleName ?? "" })}</p>
            <AcceptInvitationButton token={token!} />
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold">{t("invalidTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t(`invalid.${preview.status}`)}</p>
          </>
        )}
      </div>
    </div>
  );
}
