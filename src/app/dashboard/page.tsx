import { membershipRepository } from "@/features/workspace/repository/membership.repository";
import { requireUser } from "@/lib/auth/auth-guard";

export default async function DashboardPage() {
  const user = await requireUser();
  const workspaceMemberships = await membershipRepository.findWorkspacesForUser(user.id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{user.email}</span>.
      </p>
      {workspaceMemberships.map(({ workspace, role }) => (
        <div key={workspace.id} className="rounded-lg border p-4">
          <p className="font-medium">{workspace.name}</p>
          <p className="text-sm text-muted-foreground">
            Your role: {role.name} · Timezone: {workspace.timezone}
          </p>
        </div>
      ))}
    </div>
  );
}
