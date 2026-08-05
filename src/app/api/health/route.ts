import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";

/**
 * Liveness/readiness probe — no auth needed (read-only, reveals nothing
 * sensitive). Does a trivial real query rather than just returning 200
 * unconditionally, so it actually confirms the Postgres pool works, not
 * just that the process is alive.
 */
export async function GET() {
  try {
    await db.select({ id: users.id }).from(users).limit(1);
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[health] database check failed:", error);
    return NextResponse.json({ status: "error", timestamp: new Date().toISOString() }, { status: 503 });
  }
}
