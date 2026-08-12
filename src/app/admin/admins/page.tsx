import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
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
    <PageContainer>
      <PageHeader title={t("title")} description={t("description")} />
      <AdminList initialAdmins={admins} bootstrapEmails={bootstrapEmails} currentUserEmail={admin.email ?? ""} />
    </PageContainer>
  );
}
