import { getCurrentUser } from "@/lib/api/auth";
import { getFriendOverview } from "@/lib/api/friends";
import {
  getConversationMessages,
  getMessageConversations,
  type ConversationMessage,
  type MessageUserProfile,
} from "@/lib/api/messages";
import MessageWorkspace from "./_components/MessageWorkspace";
import {
  type FriendCardProfile,
  mergeFriendsIntoConversations,
  type MessageSidebarConversation,
} from "./_components/messageListUtils";

const THREAD_PAGE_SIZE = 50;

type UserMessagePageProps = {
  searchParams?: Promise<{
    friend?: string;
  }>;
};

export default async function UserMessagePage({ searchParams }: UserMessagePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const requestedFriendId = params?.friend?.trim() || null;

  let currentUserId = "";
  let initialFriends: FriendCardProfile[] = [];
  let initialConversations: MessageSidebarConversation[] = [];
  let initialSelectedFriendId: string | null = requestedFriendId;
  let initialSelectedUser: MessageUserProfile | null = null;
  let initialMessages: ConversationMessage[] = [];
  let initialLoadError = "";

  try {
    const [userResponse, conversationsResponse, friendsResponse] = await Promise.all([
      getCurrentUser(),
      getMessageConversations(undefined, 1, 30),
      getFriendOverview(),
    ]);

    currentUserId = userResponse.data._id;
    initialFriends = friendsResponse.data.friends;
    initialConversations = mergeFriendsIntoConversations({
      currentUserId,
      conversations: conversationsResponse.data,
      friends: initialFriends,
      selectedFriendId: initialSelectedFriendId,
    });

    const fallbackFriendId =
      initialSelectedFriendId || initialConversations[0]?.otherUser.id || null;

    if (fallbackFriendId) {
      initialSelectedFriendId = fallbackFriendId;
      const fallbackConversation = initialConversations.find(
        (conversation) => conversation.otherUser.id === fallbackFriendId
      );

      if (fallbackConversation && !fallbackConversation.hasConversation) {
        initialSelectedUser = fallbackConversation.otherUser;
        initialMessages = [];
      } else {
        try {
          const threadResponse = await getConversationMessages(
            fallbackFriendId,
            1,
            THREAD_PAGE_SIZE
          );
          initialSelectedUser = threadResponse.data.conversation.otherUser;
          initialMessages = [...threadResponse.data.messages].reverse();

          initialConversations = mergeFriendsIntoConversations({
            currentUserId,
            conversations: conversationsResponse.data.some(
              (conversation) => conversation.otherUser.id === fallbackFriendId
            )
              ? conversationsResponse.data
              : [
                  {
                    pairKey: threadResponse.data.conversation.pairKey,
                    otherUser: threadResponse.data.conversation.otherUser,
                    unreadCount: 0,
                    latestMessage:
                      threadResponse.data.messages[0] ?? {
                        _id: `placeholder-${fallbackFriendId}`,
                        pairKey: threadResponse.data.conversation.pairKey,
                        participants: [currentUserId, fallbackFriendId],
                        sender: currentUserId,
                        recipient: fallbackFriendId,
                        content: "Start a conversation here.",
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      },
                  },
                  ...conversationsResponse.data,
                ],
            friends: initialFriends,
            selectedFriendId: fallbackFriendId,
            selectedUser: threadResponse.data.conversation.otherUser,
          });
        } catch (error) {
          initialSelectedUser = fallbackConversation?.otherUser ?? null;
          initialMessages = [];
          initialLoadError =
            error instanceof Error
              ? error.message
              : "Unable to load this conversation right now.";
        }
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
      initialFriends={initialFriends}
      initialConversations={initialConversations}
      initialSelectedFriendId={initialSelectedFriendId}
      initialSelectedUser={initialSelectedUser}
      initialMessages={initialMessages}
      initialLoadError={initialLoadError}
    />
  );
}
