import mongoose from "mongoose";
import { DirectMessageModel, IDirectMessage } from "../models/direct-message.model";

const MESSAGE_SECURITY_SELECT = "+contentEncrypted +contentHash +duplicateFingerprint";

type ConversationAggregateRow = {
  _id: string;
  latestMessageId: mongoose.Types.ObjectId;
  latestSender: mongoose.Types.ObjectId;
  latestRecipient: mongoose.Types.ObjectId;
  latestCreatedAt: Date;
};

export class DirectMessageRepository {
  async createMessage(data: {
    pairKey: string;
    participants: mongoose.Types.ObjectId[];
    sender: mongoose.Types.ObjectId;
    recipient: mongoose.Types.ObjectId;
    contentEncrypted: string;
    contentHash: string;
    duplicateFingerprint: string;
  }) {
    const message = new DirectMessageModel(data);
    await message.save();
    return message;
  }

  async findRecentDuplicateBySender(
    senderUserId: string,
    pairKey: string,
    duplicateFingerprint: string,
    since: Date
  ) {
    return DirectMessageModel.findOne({
      sender: senderUserId,
      pairKey,
      duplicateFingerprint,
      createdAt: { $gte: since },
    }).select(MESSAGE_SECURITY_SELECT);
  }

  async listMessagesByPairKey(pairKey: string, page: number, size: number) {
    const [messages, total] = await Promise.all([
      DirectMessageModel.find({ pairKey })
        .select(MESSAGE_SECURITY_SELECT)
        .sort({ createdAt: -1 })
        .skip((page - 1) * size)
        .limit(size),
      DirectMessageModel.countDocuments({ pairKey }),
    ]);

    return { messages, total };
  }

  async listLatestConversationsForUser(userId: string) {
    return DirectMessageModel.aggregate<ConversationAggregateRow>([
      {
        $match: {
          participants: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $group: {
          _id: "$pairKey",
          latestMessageId: { $first: "$_id" },
          latestSender: { $first: "$sender" },
          latestRecipient: { $first: "$recipient" },
          latestCreatedAt: { $first: "$createdAt" },
        },
      },
      {
        $sort: {
          latestCreatedAt: -1,
        },
      },
    ]);
  }

  async getMessagesByIds(messageIds: string[]) {
    return DirectMessageModel.find({
      _id: { $in: messageIds },
    }).select(MESSAGE_SECURITY_SELECT);
  }

  async countUnreadMessagesByRecipientAndPairKeys(recipientUserId: string, pairKeys: string[]) {
    if (pairKeys.length === 0) {
      return [];
    }

    return DirectMessageModel.aggregate<{
      _id: string;
      unreadCount: number;
    }>([
      {
        $match: {
          recipient: new mongoose.Types.ObjectId(recipientUserId),
          pairKey: { $in: pairKeys },
          readAt: { $exists: false },
        },
      },
      {
        $group: {
          _id: "$pairKey",
          unreadCount: { $sum: 1 },
        },
      },
    ]);
  }

  async markConversationRead(pairKey: string, recipientUserId: string, readAt: Date) {
    const result = await DirectMessageModel.updateMany(
      {
        pairKey,
        recipient: recipientUserId,
        readAt: { $exists: false },
      },
      {
        $set: { readAt },
      }
    );

    return result.modifiedCount;
  }
}
