import type {
  ConversationMessage,
  MessageConversationSummary,
  MessageUserProfile,
} from "@/lib/api/messages";

export type FriendCardProfile = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileUrl?: string | null;
};

export type MessageSidebarConversation = MessageConversationSummary & {
  hasConversation: boolean;
};

const createPlaceholderMessage = (
  currentUserId: string,
  friendUserId: string
): ConversationMessage => {
  const timestamp = new Date().toISOString();

  return {
    _id: `placeholder-${friendUserId}`,
    pairKey: `${currentUserId}:${friendUserId}`,
    participants: [currentUserId, friendUserId],
    sender: currentUserId,
    recipient: friendUserId,
    content: "Start a conversation here.",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const toPlaceholderConversation = (
  currentUserId: string,
  friend: FriendCardProfile
): MessageSidebarConversation => ({
  pairKey: `${currentUserId}:${friend.id}`,
  otherUser: {
    id: friend.id,
    firstName: friend.firstName,
    lastName: friend.lastName,
    username: friend.username,
    profileUrl: friend.profileUrl ?? null,
  },
  unreadCount: 0,
  latestMessage: createPlaceholderMessage(currentUserId, friend.id),
  hasConversation: false,
});

export const mergeFriendsIntoConversations = ({
  currentUserId,
  conversations,
  friends,
  selectedFriendId,
  selectedUser,
}: {
  currentUserId: string;
  conversations: MessageConversationSummary[];
  friends: FriendCardProfile[];
  selectedFriendId?: string | null;
  selectedUser?: MessageUserProfile | null;
}): MessageSidebarConversation[] => {
  const conversationMap = new Map<string, MessageSidebarConversation>();

  conversations.forEach((conversation) => {
    conversationMap.set(conversation.otherUser.id, {
      ...conversation,
      hasConversation: true,
    });
  });

  const missingFriends = friends
    .filter((friend) => !conversationMap.has(friend.id))
    .sort((left, right) =>
      `${left.firstName} ${left.lastName}`.localeCompare(
        `${right.firstName} ${right.lastName}`
      )
    );

  missingFriends.forEach((friend) => {
    conversationMap.set(friend.id, toPlaceholderConversation(currentUserId, friend));
  });

  if (selectedFriendId && selectedUser && !conversationMap.has(selectedFriendId)) {
    conversationMap.set(selectedFriendId, toPlaceholderConversation(currentUserId, selectedUser));
  }

  return [
    ...conversations.map((conversation) => conversationMap.get(conversation.otherUser.id)!),
    ...missingFriends.map((friend) => conversationMap.get(friend.id)!),
    ...(selectedFriendId &&
    selectedUser &&
    !conversations.some((conversation) => conversation.otherUser.id === selectedFriendId) &&
    !missingFriends.some((friend) => friend.id === selectedFriendId)
      ? [conversationMap.get(selectedFriendId)!]
      : []),
  ];
};
