"use server";

import { redirect } from "next/navigation";
import { authService } from "../services/auth.service";

export async function logoutAction(): Promise<void> {
  await authService.logout();
  redirect("/login");
}
