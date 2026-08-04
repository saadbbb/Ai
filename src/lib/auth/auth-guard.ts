import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { userRepository } from "@/features/auth/repository/user.repository";
import type { User } from "@/db/schema";
import { getCurrentSession } from "./session";

/**
 * Wrapped in React's request-scoped cache so the layout and page calling this for the
 * same request share one session/user lookup instead of hitting Redis/Postgres twice.
 */
export const requireUser = cache(async (): Promise<User> => {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const user = await userRepository.findById(session.userId);
  if (!user) redirect("/login");

  return user;
});
