"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { CURRENT_WORKSPACE_COOKIE, requireUser } from "@/lib/auth/auth-guard";
import { actionFail, actionOk, actionValidationError, AppError, type ActionResult } from "@/lib/errors/app-error";
import { membershipRepository } from "../repository/membership.repository";

const schema = z.object({ workspaceId: z.string().uuid() });

export async function switchWorkspaceAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return actionValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const user = await requireUser();

  try {
    const membership = await membershipRepository.findByUserAndWorkspace(user.id, parsed.data.workspaceId);
    if (!membership) {
      throw new AppError("VALIDATION_ERROR", "You're not a member of that workspace.");
    }

    const cookieStore = await cookies();
    cookieStore.set(CURRENT_WORKSPACE_COOKIE, parsed.data.workspaceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
