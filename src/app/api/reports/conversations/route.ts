import { conversationRepository } from "@/features/inbox/repository/conversation.repository";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { csvResponse, toCsv } from "@/lib/csv";

export async function GET() {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "inbox");

  const conversations = await conversationRepository.findByWorkspaceId(workspace.id);
  const csv = toCsv(
    ["Contact", "Phone", "Channel", "Status", "AI Status", "Last Message", "Last Message At", "Created At"],
    conversations.map((item) => [
      item.contact.fullName,
      item.contact.phone ?? "",
      item.channel.type,
      item.conversation.status,
      item.conversation.aiStatus,
      item.conversation.lastMessagePreview ?? "",
      item.conversation.lastMessageAt?.toISOString() ?? "",
      item.conversation.createdAt.toISOString(),
    ]),
  );

  return csvResponse("conversations", csv);
}
