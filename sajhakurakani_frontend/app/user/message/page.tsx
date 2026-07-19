import { getCurrentUser } from "@/lib/api/auth";
import {
  getConversationMessages,
  getMessageConversations,
  type ConversationMessage,
  type MessageConversationSummary,
  type MessageUserProfile,
} from "@/lib/api/messages";
import MessageWorkspace from "./_components/MessageWorkspace";

type UserMessagePageProps = {
  searchParams?: Promise<{
    friend?: string;
  }>;
};

export default async function UserMessagePage({ searchParams }: UserMessagePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const requestedFriendId = params?.friend?.trim() || null;

  let currentUserId = "";
  let initialConversations: MessageConversationSummary[] = [];
  let initialSelectedFriendId: string | null = requestedFriendId;
  let initialSelectedUser: MessageUserProfile | null = null;
  let initialMessages: ConversationMessage[] = [];
  let initialLoadError = "";

  try {
    const [userResponse, conversationsResponse] = await Promise.all([
      getCurrentUser(),
      getMessageConversations(undefined, 1, 30),
    ]);

    currentUserId = userResponse.data._id;
    initialConversations = conversationsResponse.data;

    const fallbackFriendId =
      initialSelectedFriendId || initialConversations[0]?.otherUser.id || null;

    if (fallbackFriendId) {
      initialSelectedFriendId = fallbackFriendId;

      try {
        const threadResponse = await getConversationMessages(fallbackFriendId, 1, 80);
        initialSelectedUser = threadResponse.data.conversation.otherUser;
        initialMessages = [...threadResponse.data.messages].reverse();

        if (
          !initialConversations.some(
            (conversation) => conversation.otherUser.id === fallbackFriendId
          )
        ) {
          initialConversations = [
            {
              pairKey: threadResponse.data.conversation.pairKey,
              otherUser: threadResponse.data.conversation.otherUser,
              unreadCount: 0,
              latestMessage:
                threadResponse.data.messages[0] ??
                {
                  _id: `placeholder-${fallbackFriendId}`,
                  pairKey: threadResponse.data.conversation.pairKey,
                  participants: [currentUserId, fallbackFriendId],
                  sender: currentUserId,
                  recipient: fallbackFriendId,
                  content: "Start your conversation here.",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
            },
            ...initialConversations,
          ];
        }
      } catch (error) {
        initialSelectedUser =
          initialConversations.find(
            (conversation) => conversation.otherUser.id === fallbackFriendId
          )?.otherUser ?? null;
        initialMessages = [];
        initialLoadError =
          error instanceof Error
            ? error.message
            : "Unable to load this conversation right now.";
      }
    }
  } catch (error) {
    initialLoadError =
      error instanceof Error
        ? error.message
        : "Unable to load your conversations right now.";
  }

  return (
    <MessageWorkspace
      currentUserId={currentUserId}
      initialConversations={initialConversations}
      initialSelectedFriendId={initialSelectedFriendId}
      initialSelectedUser={initialSelectedUser}
      initialMessages={initialMessages}
      initialLoadError={initialLoadError}
    />
  );
}
