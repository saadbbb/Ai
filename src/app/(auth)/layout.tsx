import { LocaleSwitcher } from "@/components/locale-switcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-muted/40 px-4 py-12">
      <div className="mb-6 flex justify-end">
        <LocaleSwitcher />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
