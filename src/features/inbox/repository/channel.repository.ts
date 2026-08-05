import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type Channel, type ChannelType, channels } from "@/db/schema";

const DEFAULT_CHANNELS: { type: ChannelType; displayName: string; status: "connected" | "not_connected" }[] = [
  { type: "manual", displayName: "Manual", status: "connected" },
  { type: "whatsapp", displayName: "WhatsApp Business", status: "not_connected" },
  { type: "instagram", displayName: "Instagram DM", status: "not_connected" },
];

export const channelRepository = {
  async findByWorkspaceId(workspaceId: string): Promise<Channel[]> {
    return db.select().from(channels).where(eq(channels.workspaceId, workspaceId));
  },

  async findByType(workspaceId: string, type: ChannelType): Promise<Channel | null> {
    const [channel] = await db
      .select()
      .from(channels)
      .where(and(eq(channels.workspaceId, workspaceId), eq(channels.type, type)))
      .limit(1);
    return channel ?? null;
  },

  /**
   * Every workspace needs a "manual" channel to log conversations by hand, plus
   * placeholder rows for whatsapp/instagram so the Inbox and onboarding channel
   * step have something to point OAuth connection at once Meta approval lands.
   * Safe to call repeatedly — relies on the (workspaceId, type) unique index.
   */
  async ensureDefaultChannels(workspaceId: string): Promise<void> {
    await db
      .insert(channels)
      .values(DEFAULT_CHANNELS.map((channel) => ({ ...channel, workspaceId })))
      .onConflictDoNothing({ target: [channels.workspaceId, channels.type] });
  },
};
