import { HttpError } from "../errors/http-error";
import { DirectMessageAuditModel } from "../models/direct-message-audit.model";
import { IUser, UserModel } from "../models/user.model";
import { DirectMessageRepository } from "../repositories/direct-message.repository";
import { UserRepository } from "../repositories/user.repository";
import { MESSAGE_DUPLICATE_WINDOW_MS } from "../configs";
import { sanitizePostText } from "../utils/post-sanitizer.util";
import {
  createMessageContentHash,
  createMessageDuplicateFingerprint,
  encryptMessageContent,
  serializeMessageForResponse,
} from "../utils/direct-message.util";

const directMessageRepository = new DirectMessageRepository();
const userRepository = new UserRepository();
const CONVERSATION_NOT_FOUND_MESSAGE = "Conversation not found";

const createPairKey = (firstUserId: string, secondUserId: string) =>
  [firstUserId, secondUserId].sort().join(":");

const hasBlockedUser = (owner: Pick<IUser, "blockedUsers">, otherUserId: string) =>
  (owner.blockedUsers || []).some((blockedUserId) => blockedUserId.toString() === otherUserId);

const toMessageProfile = (user: Pick<IUser, "_id" | "firstName" | "lastName" | "username" | "profileUrl">) => ({
  id: user._id.toString(),
  firstName: user.firstName,
  lastName: user.lastName,
  username: user.username,
  profileUrl: user.profileUrl || null,
});

const matchesConversationSearch = (user: Pick<IUser, "firstName" | "lastName" | "username">, search?: string) => {
  if (!search) {
    return true;
  }

  const normalizedSearch = search.trim().toLowerCase();
  const fullName = `${user.firstName} ${user.lastName}`.trim().toLowerCase();
  const reversedFullName = `${user.lastName} ${user.firstName}`.trim().toLowerCase();

  return (
    user.username.toLowerCase().includes(normalizedSearch) ||
    user.firstName.toLowerCase().includes(normalizedSearch) ||
    user.lastName.toLowerCase().includes(normalizedSearch) ||
    fullName.includes(normalizedSearch) ||
    reversedFullName.includes(normalizedSearch)
  );
};

export class DirectMessageService {
  private async resolveActiveUser(userId: string) {
    const user = await userRepository.getUserById(userId);

    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    if (user.isBanned) {
      throw new HttpError(403, "Account access is restricted");
    }

    return user;
  }

  private async resolveConversationUsers(currentUserId: string, friendUserId: string) {
    if (currentUserId === friendUserId) {
      throw new HttpError(400, "You cannot start a conversation with yourself");
    }

    const [currentUser, friendUser] = await Promise.all([
      this.resolveActiveUser(currentUserId),
      userRepository.getUserById(friendUserId),
    ]);

    if (
      !friendUser ||
      friendUser.role !== "user" ||
      !friendUser.emailVerified ||
      friendUser.isBanned
    ) {
      throw new HttpError(404, CONVERSATION_NOT_FOUND_MESSAGE);
    }

    const isFriend = (currentUser.friends || []).some(
      (friendId) => friendId.toString() === friendUserId
    );

    if (
      !isFriend ||
      hasBlockedUser(currentUser, friendUserId) ||
      hasBlockedUser(friendUser, currentUserId)
    ) {
      throw new HttpError(404, CONVERSATION_NOT_FOUND_MESSAGE);
    }

    return {
      currentUser,
      friendUser,
      pairKey: createPairKey(currentUserId, friendUserId),
    };
  }

  private async logMessageAuditEvent(params: {
    action: "message.send" | "message.read";
    actorUserId: string;
    targetUserId: string;
    pairKey: string;
    messageId?: string;
    ipAddress: string;
    userAgent?: string;
    contentHash?: string;
  }) {
    await DirectMessageAuditModel.create({
      action: params.action,
      actorUserId: params.actorUserId,
      targetUserId: params.targetUserId,
      pairKey: params.pairKey,
      message: params.messageId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent?.slice(0, 512),
      contentHash: params.contentHash,
    });
  }

  async listConversations(
    requesterId: string,
    page: number,
    size: number,
    search?: string
  ) {
    const requester = await this.resolveActiveUser(requesterId);
    const conversationRows = await directMessageRepository.listLatestConversationsForUser(
      requesterId
    );

    const otherUserIds = Array.from(
      new Set(
        conversationRows.map((row) =>
          row.latestSender.toString() === requesterId
            ? row.latestRecipient.toString()
            : row.latestSender.toString()
        )
      )
    );

    const relatedUsers = otherUserIds.length
      ? await UserModel.find({
          _id: { $in: otherUserIds },
          role: "user",
          emailVerified: true,
          isBanned: false,
        }).select("firstName lastName username profileUrl blockedUsers")
      : [];
    const userMap = new Map(relatedUsers.map((user) => [user._id.toString(), user]));

    const filteredRows = conversationRows.filter((row) => {
      const otherUserId =
        row.latestSender.toString() === requesterId
          ? row.latestRecipient.toString()
          : row.latestSender.toString();
      const otherUser = userMap.get(otherUserId);

      if (!otherUser) {
        return false;
      }

      const isFriend = (requester.friends || []).some(
        (friendId) => friendId.toString() === otherUserId
      );

      if (
        !isFriend ||
        hasBlockedUser(requester, otherUserId) ||
        hasBlockedUser(otherUser, requesterId) ||
        !matchesConversationSearch(otherUser, search)
      ) {
        return false;
      }

      return true;
    });

    const total = filteredRows.length;
    const pageRows = filteredRows.slice((page - 1) * size, page * size);
    const latestMessages = await directMessageRepository.getMessagesByIds(
      pageRows.map((row) => row.latestMessageId.toString())
    );
    const latestMessageMap = new Map(
      latestMessages.map((message) => [message._id.toString(), message])
    );
    const unreadCounts = await directMessageRepository.countUnreadMessagesByRecipientAndPairKeys(
      requesterId,
      pageRows.map((row) => row._id)
    );
    const unreadCountMap = new Map(unreadCounts.map((item) => [item._id, item.unreadCount]));

    const conversations = pageRows
      .map((row) => {
        const otherUserId =
          row.latestSender.toString() === requesterId
            ? row.latestRecipient.toString()
            : row.latestSender.toString();
        const otherUser = userMap.get(otherUserId);
        const latestMessage = latestMessageMap.get(row.latestMessageId.toString());

        if (!otherUser || !latestMessage) {
          return null;
        }

        return {
          pairKey: row._id,
          otherUser: toMessageProfile(otherUser),
          unreadCount: unreadCountMap.get(row._id) ?? 0,
          latestMessage: serializeMessageForResponse(latestMessage),
        };
      })
      .filter(Boolean);

    return {
      conversations,
      pagination: {
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
      },
    };
  }

  async listMessages(requesterId: string, friendUserId: string, page: number, size: number) {
    const { friendUser, pairKey } = await this.resolveConversationUsers(
      requesterId,
      friendUserId
    );
    const { messages, total } = await directMessageRepository.listMessagesByPairKey(
      pairKey,
      page,
      size
    );

    return {
      conversation: {
        pairKey,
        otherUser: toMessageProfile(friendUser),
      },
      messages: messages.map((message) => serializeMessageForResponse(message)),
      pagination: {
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
      },
    };
  }

  async sendMessage(
    senderUserId: string,
    friendUserId: string,
    payload: { content: string },
    auditContext: { ipAddress: string; userAgent?: string }
  ) {
    const { currentUser, friendUser, pairKey } = await this.resolveConversationUsers(
      senderUserId,
      friendUserId
    );
    const content = sanitizePostText(payload.content);

    if (!content) {
      throw new HttpError(400, "Message content is required");
    }

    const duplicateFingerprint = createMessageDuplicateFingerprint(content);
    const existingDuplicate = await directMessageRepository.findRecentDuplicateBySender(
      senderUserId,
      pairKey,
      duplicateFingerprint,
      new Date(Date.now() - MESSAGE_DUPLICATE_WINDOW_MS)
    );

    if (existingDuplicate) {
      throw new HttpError(
        409,
        "A very similar message was already sent recently. Please avoid spam."
      );
    }

    const contentHash = createMessageContentHash(content);
    const createdMessage = await directMessageRepository.createMessage({
      pairKey,
      participants: [currentUser._id, friendUser._id],
      sender: currentUser._id,
      recipient: friendUser._id,
      contentEncrypted: encryptMessageContent(content) as string,
      contentHash,
      duplicateFingerprint,
    });

    await this.logMessageAuditEvent({
      action: "message.send",
      actorUserId: senderUserId,
      targetUserId: friendUserId,
      pairKey,
      messageId: createdMessage._id.toString(),
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      contentHash,
    });

    return {
      pairKey,
      recipientUserId: friendUserId,
      message: serializeMessageForResponse(createdMessage),
    };
  }

  async markConversationRead(
    requesterId: string,
    friendUserId: string,
    auditContext: { ipAddress: string; userAgent?: string }
  ) {
    const { friendUser, pairKey } = await this.resolveConversationUsers(
      requesterId,
      friendUserId
    );
    const updatedCount = await directMessageRepository.markConversationRead(
      pairKey,
      requesterId,
      new Date()
    );

    await this.logMessageAuditEvent({
      action: "message.read",
      actorUserId: requesterId,
      targetUserId: friendUserId,
      pairKey,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return {
      pairKey,
      otherUser: toMessageProfile(friendUser),
      updatedCount,
    };
  }
}
