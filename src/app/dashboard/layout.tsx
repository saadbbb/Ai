import { LogoutButton } from "@/features/auth/components/logout-button";
import { requireUser } from "@/lib/auth/auth-guard";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="font-medium">{user.email}</span>
        <LogoutButton />
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
