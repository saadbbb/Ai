import "server-only";
import { headers } from "next/headers";

export async function getRequestContext(): Promise<{ userAgent: string | null; ipAddress: string | null }> {
  const headerList = await headers();
  const userAgent = headerList.get("user-agent");
  const forwardedFor = headerList.get("x-forwarded-for");
  const ipAddress = forwardedFor ? (forwardedFor.split(",")[0]?.trim() ?? null) : null;
  return { userAgent, ipAddress };
}
