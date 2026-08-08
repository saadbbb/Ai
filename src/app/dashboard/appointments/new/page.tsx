import { getTranslations } from "next-intl/server";
import { NewAppointmentForm } from "@/features/appointments/components/new-appointment-form";
import { contactRepository } from "@/features/inbox/repository/contact.repository";
import { serviceRepository } from "@/features/knowledge-base/repository/service.repository";
import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";

interface PageProps {
  searchParams: Promise<{ contactId?: string }>;
}

export default async function NewAppointmentPage({ searchParams }: PageProps) {
  const { contactId } = await searchParams;
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  const t = await getTranslations("appointments.new");

  const [contacts, services, members] = await Promise.all([
    contactRepository.findByWorkspaceId(workspace.id),
    serviceRepository.findByWorkspaceId(workspace.id),
    membershipRepository.findMembersByWorkspaceId(workspace.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <NewAppointmentForm
        contacts={contacts}
        services={services}
        members={members.map((item) => ({ id: item.user.id, label: item.user.email }))}
        defaultContactId={contactId}
      />
    </div>
  );
}
