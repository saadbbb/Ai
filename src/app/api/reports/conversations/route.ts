import { conversationRepository } from "@/features/inbox/repository/conversation.repository";
import { requireFeature, requireUser, requireWorkspaceForUser } from "@/lib/auth/auth-guard";
import { parseReportFormat, reportResponse } from "@/lib/report-response";

export async function GET(request: Request) {
  const user = await requireUser();
  const workspace = await requireWorkspaceForUser(user.id);
  await requireFeature(workspace, "inbox");

  const url = new URL(request.url);
  const format = parseReportFormat(url.searchParams.get("format"));
  const conversations = await conversationRepository.findByWorkspaceId(workspace.id);

  return reportResponse(
    format,
    "conversations",
    "Conversations",
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
}
