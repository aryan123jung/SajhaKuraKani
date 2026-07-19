import mongoose from "mongoose";
import {
  ACTIVE_CALL_STATUSES,
  CallSessionModel,
  type CallStatus,
  type ICallSession,
} from "../models/call-session.model";

export class CallSessionRepository {
  async createSession(data: Partial<ICallSession>) {
    return CallSessionModel.create(data);
  }

  async getSessionById(callId: string) {
    return CallSessionModel.findById(callId);
  }

  async getSessionByIdForParticipant(callId: string, userId: string) {
    return CallSessionModel.findOne({
      _id: callId,
      $or: [{ caller: userId }, { callee: userId }],
    });
  }

  async getPendingPairCall(firstUserId: string, secondUserId: string) {
    return CallSessionModel.findOne({
      status: { $in: ACTIVE_CALL_STATUSES },
      $or: [
        { caller: firstUserId, callee: secondUserId },
        { caller: secondUserId, callee: firstUserId },
      ],
    }).sort({ createdAt: -1 });
  }

  async listOngoingCallsForUser(userId: string, excludeCallId?: string) {
    const filter: Record<string, unknown> = {
      status: { $in: ACTIVE_CALL_STATUSES },
      $or: [{ caller: userId }, { callee: userId }],
    };

    if (excludeCallId) {
      filter._id = { $ne: new mongoose.Types.ObjectId(excludeCallId) };
    }

    return CallSessionModel.find(filter).sort({ createdAt: -1 });
  }

  async listOngoingCallsForSession(userId: string, sessionId: string) {
    return CallSessionModel.find({
      status: { $in: ACTIVE_CALL_STATUSES },
      $or: [
        { caller: userId, callerSessionId: sessionId },
        { callee: userId, calleeSessionId: sessionId },
      ],
    }).sort({ createdAt: -1 });
  }

  async listOngoingCallsBetweenUsers(firstUserId: string, secondUserId: string) {
    return CallSessionModel.find({
      status: { $in: ACTIVE_CALL_STATUSES },
      $or: [
        { caller: firstUserId, callee: secondUserId },
        { caller: secondUserId, callee: firstUserId },
      ],
    }).sort({ createdAt: -1 });
  }

  async listHistoryForUser(
    userId: string,
    page: number,
    size: number,
    status?: CallStatus
  ) {
    const filter: Record<string, unknown> = {
      $or: [{ caller: userId }, { callee: userId }],
    };

    if (status) {
      filter.status = status;
    }

    const [calls, total] = await Promise.all([
      CallSessionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * size)
        .limit(size),
      CallSessionModel.countDocuments(filter),
    ]);

    return { calls, total };
  }

  async getLatestOngoingCallForUser(userId: string) {
    return CallSessionModel.findOne({
      status: { $in: ACTIVE_CALL_STATUSES },
      $or: [{ caller: userId }, { callee: userId }],
    }).sort({ createdAt: -1 });
  }

  async getExpiredRingingCalls(now: Date, limit = 100) {
    return CallSessionModel.find({
      status: "ringing",
      unansweredTimeoutAt: { $lte: now },
    })
      .sort({ unansweredTimeoutAt: 1 })
      .limit(limit);
  }
}
