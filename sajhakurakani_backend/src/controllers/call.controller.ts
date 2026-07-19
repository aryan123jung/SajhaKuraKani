import { Request, Response } from "express";
import z from "zod";
import {
  CallParamsDto,
  InitiateCallDto,
  ListCallHistoryQueryDto,
} from "../dtos/call.dtos";
import { getClientIp } from "../middleware/rate-limit.middleware";
import {
  emitCallAccepted,
  emitCallDeclined,
  emitCallEnded,
  emitCallIncoming,
} from "../realtime/socket";
import { CallService } from "../services/call.service";

const callService = new CallService();

export class CallController {
  async getActiveCall(req: Request, res: Response) {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const data = await callService.getActiveCall(userId);
      return res.status(200).json({
        success: true,
        message: data ? "Active call fetched successfully" : "No active call found",
        data,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async listHistory(req: Request, res: Response) {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsedQuery = ListCallHistoryQueryDto.safeParse(req.query);
      if (!parsedQuery.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedQuery.error),
        });
      }

      const data = await callService.listCallHistory(
        userId,
        parsedQuery.data.page,
        parsedQuery.data.size,
        parsedQuery.data.status
      );

      return res.status(200).json({
        success: true,
        message: "Call history fetched successfully",
        data: data.calls,
        pagination: data.pagination,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async initiateCall(req: Request, res: Response) {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsedBody = InitiateCallDto.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedBody.error),
        });
      }

      const data = await callService.initiateCall(
        userId,
        req.authSessionId,
        parsedBody.data,
        {
          ipAddress: getClientIp(req),
        }
      );

      emitCallIncoming({
        call: data.call,
        actorUserId: userId,
        recipientUserId: data.recipientUserId,
      });

      return res.status(201).json({
        success: true,
        message: "Call initiated successfully",
        data,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async acceptCall(req: Request, res: Response) {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsedParams = CallParamsDto.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }

      const data = await callService.acceptCall(
        userId,
        req.authSessionId,
        parsedParams.data.callId,
        {
          ipAddress: getClientIp(req),
        }
      );

      emitCallAccepted({
        call: data.call,
        actorUserId: userId,
        recipientUserId: data.otherUserId,
      });

      return res.status(200).json({
        success: true,
        message: "Call accepted successfully",
        data,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async declineCall(req: Request, res: Response) {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsedParams = CallParamsDto.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }

      const data = await callService.declineCall(userId, parsedParams.data.callId, {
        ipAddress: getClientIp(req),
      });

      emitCallDeclined({
        call: data.call,
        actorUserId: userId,
        recipientUserId: data.otherUserId,
      });

      return res.status(200).json({
        success: true,
        message: "Call declined successfully",
        data,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async endCall(req: Request, res: Response) {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsedParams = CallParamsDto.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }

      const data = await callService.endCall(userId, parsedParams.data.callId, {
        ipAddress: getClientIp(req),
      });

      emitCallEnded({
        call: data.call,
        actorUserId: userId,
        recipientUserId: data.otherUserId,
      });

      return res.status(200).json({
        success: true,
        message: "Call ended successfully",
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
