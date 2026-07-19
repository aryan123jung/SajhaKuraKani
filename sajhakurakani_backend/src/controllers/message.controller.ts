import { Request, Response } from "express";
import z from "zod";
import {
  ConversationUserParamsDto,
  ListConversationsQueryDto,
  ListMessagesQueryDto,
  SendDirectMessageDto,
} from "../dtos/message.dtos";
import { getClientIp } from "../middleware/rate-limit.middleware";
import { DirectMessageService } from "../services/direct-message.service";
import {
  emitConversationRead,
  emitDirectMessageCreated,
} from "../realtime/socket";

const directMessageService = new DirectMessageService();

export class MessageController {
  async listConversations(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsedQuery = ListConversationsQueryDto.safeParse(req.query);
      if (!parsedQuery.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedQuery.error),
        });
      }

      const data = await directMessageService.listConversations(
        requesterId,
        parsedQuery.data.page,
        parsedQuery.data.size,
        parsedQuery.data.search
      );

      return res.status(200).json({
        success: true,
        message: "Conversations fetched successfully",
        data: data.conversations,
        pagination: data.pagination,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async listMessages(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsedParams = ConversationUserParamsDto.safeParse(req.params);
      const parsedQuery = ListMessagesQueryDto.safeParse(req.query);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }
      if (!parsedQuery.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedQuery.error),
        });
      }

      const data = await directMessageService.listMessages(
        requesterId,
        parsedParams.data.friendUserId,
        parsedQuery.data.page,
        parsedQuery.data.size
      );

      return res.status(200).json({
        success: true,
        message: "Messages fetched successfully",
        data: {
          conversation: data.conversation,
          messages: data.messages,
        },
        pagination: data.pagination,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async sendMessage(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsedParams = ConversationUserParamsDto.safeParse(req.params);
      const parsedBody = SendDirectMessageDto.safeParse(req.body);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }
      if (!parsedBody.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedBody.error),
        });
      }

      const data = await directMessageService.sendMessage(
        requesterId,
        parsedParams.data.friendUserId,
        parsedBody.data,
        {
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"],
        }
      );

      emitDirectMessageCreated({
        senderUserId: requesterId,
        recipientUserId: data.recipientUserId,
        pairKey: data.pairKey,
        message: data.message,
      });

      return res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async markConversationRead(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsedParams = ConversationUserParamsDto.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }

      const data = await directMessageService.markConversationRead(
        requesterId,
        parsedParams.data.friendUserId,
        {
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"],
        }
      );

      emitConversationRead({
        readerUserId: requesterId,
        otherUserId: parsedParams.data.friendUserId,
        pairKey: data.pairKey,
        updatedCount: data.updatedCount,
      });

      return res.status(200).json({
        success: true,
        message: "Conversation marked as read",
        data,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }
}
