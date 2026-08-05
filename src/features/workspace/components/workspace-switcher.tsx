"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Workspace } from "@/db/schema";
import { switchWorkspaceAction } from "../actions/switch-workspace.action";

export function WorkspaceSwitcher({ workspaces, currentWorkspaceId }: { workspaces: Workspace[]; currentWorkspaceId: string }) {
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);

  async function handleChange(workspaceId: string) {
    if (workspaceId === currentWorkspaceId) return;

    setIsSwitching(true);
    const result = await switchWorkspaceAction({ workspaceId });
    setIsSwitching(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    router.refresh();
  }

  return (
    <Select value={currentWorkspaceId} onValueChange={handleChange} disabled={isSwitching}>
      <SelectTrigger size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {workspaces.map((workspace) => (
          <SelectItem key={workspace.id} value={workspace.id}>
            {workspace.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
