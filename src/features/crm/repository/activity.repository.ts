import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type Activity, activities, type ActivityType } from "@/db/schema";

/** Who caused an event — shared across every service/tool that logs to the timeline. */
export type ActivityActor =
  | { type: "human"; userId: string }
  | { type: "ai" }
  | { type: "automation" }
  | { type: "system" };

interface LogActivityInput {
  workspaceId: string;
  contactId: string;
  type: ActivityType;
  actor: ActivityActor;
  summary: string;
  link?: string;
}

export const activityRepository = {
  async log(input: LogActivityInput): Promise<void> {
    await db.insert(activities).values({
      workspaceId: input.workspaceId,
      contactId: input.contactId,
      type: input.type,
      actorType: input.actor.type,
      actorUserId: input.actor.type === "human" ? input.actor.userId : null,
      summary: input.summary,
      link: input.link ?? null,
    });
  },

  async findByContactId(contactId: string, workspaceId: string): Promise<Activity[]> {
    return db
      .select()
      .from(activities)
      .where(and(eq(activities.contactId, contactId), eq(activities.workspaceId, workspaceId)))
      .orderBy(desc(activities.createdAt));
  },
};
