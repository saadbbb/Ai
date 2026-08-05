import { getTranslations } from "next-intl/server";
import { AdminList } from "@/features/platform-admin/components/admin-list";
import { platformAdminRepository } from "@/features/platform-admin/repository/platform-admin.repository";
import { platformAdminService } from "@/features/platform-admin/services/platform-admin.service";
import { requirePlatformAdmin } from "@/lib/auth/auth-guard";

export default async function PlatformAdminsPage() {
  const admin = await requirePlatformAdmin();
  const t = await getTranslations("platformAdmin.admins");

  const admins = await platformAdminRepository.findAll();
  const bootstrapEmails = platformAdminService.listBootstrapEmails();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <AdminList initialAdmins={admins} bootstrapEmails={bootstrapEmails} currentUserEmail={admin.email} />
    </div>
  );
}
