import { Bot } from "lucide-react";
import Link from "next/link";
import type { Workspace } from "@/db/schema";
import { WorkspaceSwitcher } from "@/features/workspace/components/workspace-switcher";

/**
 * "Always visible" per the redesign brief — a single workspace renders as a
 * plain label (nothing to switch to yet), 2+ renders the real Select-based
 * switcher that already exists.
 */
export function WorkspacePicker({
  workspaces,
  currentWorkspaceId,
  label,
}: {
  workspaces: Workspace[];
  currentWorkspaceId: string;
  label: string;
}) {
  if (workspaces.length <= 1) {
    const current = workspaces.find((w) => w.id === currentWorkspaceId);
    return (
      <div className="rounded-lg border bg-card px-3 py-2">
        <p className="truncate text-[11px] font-medium text-text-muted">{label}</p>
        <p className="truncate text-sm font-semibold text-foreground">{current?.name}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="truncate px-0.5 text-[11px] font-medium text-text-muted">{label}</p>
      <WorkspaceSwitcher workspaces={workspaces} currentWorkspaceId={currentWorkspaceId} />
    </div>
  );
}

/**
 * The data model is one AI Employee per workspace today (see aiAgentRepository/
 * onboardingService) — this is deliberately UI-only, linking to the agent's
 * settings rather than implementing real multi-agent switching, which would be
 * a much larger, separate feature.
 */
export function AgentPicker({ agentName, label }: { agentName: string | null; label: string }) {
  return (
    <Link
      href="/dashboard/ai-employee"
      className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-muted"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Bot className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-medium text-text-muted">{label}</span>
        <span className="block truncate text-sm font-semibold text-foreground">{agentName ?? "—"}</span>
      </span>
    </Link>
  );
}
