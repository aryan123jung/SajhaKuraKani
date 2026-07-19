import mongoose from "mongoose";
import {
  CALL_ACCEPT_WINDOW_MS,
  CALL_MAX_CONCURRENT_PER_USER,
  CALL_PAIR_SPAM_MAX_REQUESTS,
  CALL_PAIR_SPAM_WINDOW_MS,
  CALL_SIGNAL_MAX_PAYLOAD_BYTES,
  CALL_UNANSWERED_TIMEOUT_MS,
} from "../configs";
import { HttpError } from "../errors/http-error";
import { CallAuditModel } from "../models/call-audit.model";
import {
  ACTIVE_CALL_STATUSES,
  CallSessionModel,
  type CallEndReason,
  type CallStatus,
  type CallType,
  type ICallSession,
} from "../models/call-session.model";
import { IUser, UserModel } from "../models/user.model";
import { CallSessionRepository } from "../repositories/call-session.repository";
import { UserRepository } from "../repositories/user.repository";
import { securityStateStore } from "../security/security-state.store";

const callSessionRepository = new CallSessionRepository();
const userRepository = new UserRepository();

const CALL_NOT_FOUND_MESSAGE = "Call not found";
const CALL_UNAVAILABLE_MESSAGE = "This call is no longer available.";
const CALL_ROOM_SIGNAL_TYPES = ["offer", "answer", "ice-candidate"] as const;
type CallSignalType = (typeof CALL_ROOM_SIGNAL_TYPES)[number];

type CallParticipantProfile = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileUrl: string | null;
};

const createPairKey = (firstUserId: string, secondUserId: string) =>
  [firstUserId, secondUserId].sort().join(":");

const hasBlockedUser = (owner: Pick<IUser, "blockedUsers">, otherUserId: string) =>
  (owner.blockedUsers || []).some((blockedUserId) => blockedUserId.toString() === otherUserId);

const toParticipantProfile = (
  user: Pick<IUser, "_id" | "firstName" | "lastName" | "username" | "profileUrl">
): CallParticipantProfile => ({
  id: user._id.toString(),
  firstName: user.firstName,
  lastName: user.lastName,
  username: user.username,
  profileUrl: user.profileUrl || null,
});

export class CallService {
  private async resolveActiveUser(userId: string) {
    const user = await userRepository.getUserById(userId);

    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    if (user.isBanned) {
      throw new HttpError(403, "Account access is restricted");
    }

    if (!user.emailVerified) {
      throw new HttpError(403, "Verify email first");
    }

    return user;
  }

  private async loadParticipantProfiles(userIds: string[]) {
    const relatedUsers = userIds.length
      ? await UserModel.find({
          _id: { $in: userIds },
          role: "user",
          emailVerified: true,
          isBanned: false,
        }).select("firstName lastName username profileUrl")
      : [];

    return new Map(relatedUsers.map((user) => [user._id.toString(), user]));
  }

  private buildCallResponse(
    call: ICallSession,
    viewerUserId: string,
    userMap: Map<string, Pick<IUser, "_id" | "firstName" | "lastName" | "username" | "profileUrl">>
  ) {
    const callerId = call.caller.toString();
    const calleeId = call.callee.toString();
    const caller = userMap.get(callerId);
    const callee = userMap.get(calleeId);

    return {
      _id: call._id.toString(),
      pairKey: call.pairKey,
      callType: call.callType,
      status: call.status,
      caller: caller ? toParticipantProfile(caller) : { id: callerId },
      callee: callee ? toParticipantProfile(callee) : { id: calleeId },
      otherUser:
        viewerUserId === callerId
          ? callee
            ? toParticipantProfile(callee)
            : { id: calleeId }
          : caller
            ? toParticipantProfile(caller)
            : { id: callerId },
      isCaller: viewerUserId === callerId,
      acceptByExpiresAt: call.acceptByExpiresAt,
      unansweredTimeoutAt: call.unansweredTimeoutAt,
      acceptedAt: call.acceptedAt ?? null,
      endedAt: call.endedAt ?? null,
      endedReason: call.endedReason ?? null,
      createdAt: call.createdAt,
      updatedAt: call.updatedAt,
    };
  }

  private async serializeCall(call: ICallSession, viewerUserId: string) {
    const userMap = await this.loadParticipantProfiles([
      call.caller.toString(),
      call.callee.toString(),
    ]);
    return this.buildCallResponse(call, viewerUserId, userMap);
  }

  private async logCallAuditEvent(params: {
    action: "initiated" | "accepted" | "declined" | "cancelled" | "missed" | "ended";
    call: ICallSession;
    actorUserId: string;
    otherUserId: string;
    ipAddress?: string;
    reason?: string;
  }) {
    const durationSeconds =
      params.call.acceptedAt && params.call.endedAt
        ? Math.max(
            0,
            Math.round(
              (params.call.endedAt.getTime() - params.call.acceptedAt.getTime()) / 1000
            )
          )
        : undefined;

    await CallAuditModel.create({
      action: params.action,
      callSession: params.call._id,
      actorUserId: params.actorUserId,
      otherUserId: params.otherUserId,
      callType: params.call.callType,
      ipAddress: params.ipAddress,
      durationSeconds,
      reason: params.reason,
    });
  }

  private async assertUserAvailable(userId: string, excludeCallId?: string) {
    const ongoingCalls = await callSessionRepository.listOngoingCallsForUser(
      userId,
      excludeCallId
    );

    if (ongoingCalls.length >= CALL_MAX_CONCURRENT_PER_USER) {
      throw new HttpError(409, "A user is already in another call.");
    }
  }

  private async resolveCallableUsers(callerUserId: string, calleeUserId: string) {
    if (callerUserId === calleeUserId) {
      throw new HttpError(400, "You cannot call yourself");
    }

    const [caller, callee] = await Promise.all([
      this.resolveActiveUser(callerUserId),
      userRepository.getUserById(calleeUserId),
    ]);

    if (!callee || callee.role !== "user" || !callee.emailVerified || callee.isBanned) {
      throw new HttpError(404, "Unable to place call");
    }

    const isFriend = (caller.friends || []).some(
      (friendId) => friendId.toString() === calleeUserId
    );

    if (
      !isFriend ||
      hasBlockedUser(caller, calleeUserId) ||
      hasBlockedUser(callee, callerUserId)
    ) {
      throw new HttpError(404, "Unable to place call");
    }

    return {
      caller,
      callee,
      pairKey: createPairKey(callerUserId, calleeUserId),
    };
  }

  private async ensureCallStillAllowed(call: ICallSession) {
    await this.resolveCallableUsers(call.caller.toString(), call.callee.toString());
  }

  private async finalizeCall(
    call: ICallSession,
    params: {
      status: Extract<CallStatus, "declined" | "missed" | "ended" | "cancelled">;
      endedReason: CallEndReason;
      actorUserId: string;
      ipAddress?: string;
    }
  ) {
    if (!ACTIVE_CALL_STATUSES.includes(call.status as (typeof ACTIVE_CALL_STATUSES)[number])) {
      return call;
    }

    const endedAt = new Date();
    const updatedCall = await CallSessionModel.findOneAndUpdate(
      {
        _id: call._id,
        status: { $in: ACTIVE_CALL_STATUSES },
      },
      {
        $set: {
          status: params.status,
          endedAt,
          endedReason: params.endedReason,
          endedByUserId: new mongoose.Types.ObjectId(params.actorUserId),
        },
      },
      { new: true }
    );

    if (!updatedCall) {
      return (await callSessionRepository.getSessionById(call._id.toString())) ?? call;
    }

    const otherUserId =
      updatedCall.caller.toString() === params.actorUserId
        ? updatedCall.callee.toString()
        : updatedCall.caller.toString();
    const action =
      params.status === "declined"
        ? "declined"
        : params.status === "cancelled"
          ? "cancelled"
          : params.status === "missed"
            ? "missed"
            : "ended";

    await this.logCallAuditEvent({
      action,
      call: updatedCall,
      actorUserId: params.actorUserId,
      otherUserId,
      ipAddress: params.ipAddress,
      reason: params.endedReason,
    });

    return updatedCall;
  }

  async initiateCall(
    callerUserId: string,
    callerSessionId: string | undefined,
    payload: { calleeUserId: string; callType: CallType },
    metadata: { ipAddress?: string }
  ) {
    if (!callerSessionId) {
      throw new HttpError(401, "Current session could not be identified");
    }

    const { caller, callee, pairKey } = await this.resolveCallableUsers(
      callerUserId,
      payload.calleeUserId
    );

    await this.assertUserAvailable(callerUserId);
    await this.assertUserAvailable(payload.calleeUserId);

    const pairRateLimitKey = `call-pair:${callerUserId}:${payload.calleeUserId}`;
    const { count } = await securityStateStore.incrementRateLimitCounter(
      pairRateLimitKey,
      CALL_PAIR_SPAM_WINDOW_MS
    );
    if (count > CALL_PAIR_SPAM_MAX_REQUESTS) {
      throw new HttpError(429, "Too many call attempts were made for this user pair.");
    }

    const existingPairCall = await callSessionRepository.getPendingPairCall(
      callerUserId,
      payload.calleeUserId
    );
    if (existingPairCall) {
      throw new HttpError(409, "There is already an active or pending call between these users.");
    }

    const now = Date.now();
    const call = await callSessionRepository.createSession({
      pairKey,
      callType: payload.callType,
      status: "ringing",
      caller: caller._id,
      callee: callee._id,
      callerSessionId: new mongoose.Types.ObjectId(callerSessionId),
      initiatedIpAddress: metadata.ipAddress,
      acceptByExpiresAt: new Date(now + CALL_ACCEPT_WINDOW_MS),
      unansweredTimeoutAt: new Date(now + CALL_UNANSWERED_TIMEOUT_MS),
    });

    await this.logCallAuditEvent({
      action: "initiated",
      call,
      actorUserId: callerUserId,
      otherUserId: payload.calleeUserId,
      ipAddress: metadata.ipAddress,
    });

    return {
      call: await this.serializeCall(call, callerUserId),
      recipientUserId: payload.calleeUserId,
    };
  }

  async acceptCall(
    userId: string,
    sessionId: string | undefined,
    callId: string,
    metadata: { ipAddress?: string }
  ) {
    if (!sessionId) {
      throw new HttpError(401, "Current session could not be identified");
    }

    const call = await callSessionRepository.getSessionByIdForParticipant(callId, userId);
    if (!call || call.callee.toString() !== userId) {
      throw new HttpError(404, CALL_NOT_FOUND_MESSAGE);
    }

    if (call.status !== "ringing") {
      throw new HttpError(409, CALL_UNAVAILABLE_MESSAGE);
    }

    await this.ensureCallStillAllowed(call);

    if (call.acceptByExpiresAt.getTime() < Date.now()) {
      await this.finalizeCall(call, {
        status: "missed",
        endedReason: "expired",
        actorUserId: call.caller.toString(),
      });
      throw new HttpError(410, "This call expired before it could be accepted.");
    }

    await this.assertUserAvailable(userId, callId);
    await this.assertUserAvailable(call.caller.toString(), callId);

    const acceptedAt = new Date();
    const updatedCall = await CallSessionModel.findOneAndUpdate(
      {
        _id: call._id,
        status: "ringing",
      },
      {
        $set: {
          status: "active",
          acceptedAt,
          calleeSessionId: new mongoose.Types.ObjectId(sessionId),
          lastSignalAt: acceptedAt,
        },
      },
      { new: true }
    );

    if (!updatedCall) {
      throw new HttpError(409, CALL_UNAVAILABLE_MESSAGE);
    }

    await this.logCallAuditEvent({
      action: "accepted",
      call: updatedCall,
      actorUserId: userId,
      otherUserId: updatedCall.caller.toString(),
      ipAddress: metadata.ipAddress,
    });

    return {
      call: await this.serializeCall(updatedCall, userId),
      otherUserId: updatedCall.caller.toString(),
    };
  }

  async declineCall(userId: string, callId: string, metadata: { ipAddress?: string }) {
    const call = await callSessionRepository.getSessionByIdForParticipant(callId, userId);
    if (!call || call.callee.toString() !== userId || call.status !== "ringing") {
      throw new HttpError(404, CALL_NOT_FOUND_MESSAGE);
    }

    const updatedCall = await this.finalizeCall(call, {
      status: "declined",
      endedReason: "declined",
      actorUserId: userId,
      ipAddress: metadata.ipAddress,
    });

    return {
      call: await this.serializeCall(updatedCall, userId),
      otherUserId: updatedCall.caller.toString(),
    };
  }

  async endCall(userId: string, callId: string, metadata: { ipAddress?: string }) {
    const call = await callSessionRepository.getSessionByIdForParticipant(callId, userId);
    if (!call) {
      throw new HttpError(404, CALL_NOT_FOUND_MESSAGE);
    }

    if (
      !ACTIVE_CALL_STATUSES.includes(call.status as (typeof ACTIVE_CALL_STATUSES)[number])
    ) {
      return {
        call: await this.serializeCall(call, userId),
        otherUserId:
          call.caller.toString() === userId ? call.callee.toString() : call.caller.toString(),
      };
    }

    const isCaller = call.caller.toString() === userId;
    const status = call.status === "ringing" ? "cancelled" : "ended";
    const endedReason: CallEndReason =
      call.status === "ringing"
        ? "cancelled"
        : "completed";

    if (call.status === "ringing" && !isCaller) {
      throw new HttpError(409, "Use decline to reject an incoming call.");
    }

    const updatedCall = await this.finalizeCall(call, {
      status,
      endedReason,
      actorUserId: userId,
      ipAddress: metadata.ipAddress,
    });

    return {
      call: await this.serializeCall(updatedCall, userId),
      otherUserId:
        updatedCall.caller.toString() === userId
          ? updatedCall.callee.toString()
          : updatedCall.caller.toString(),
    };
  }

  async listCallHistory(
    userId: string,
    page: number,
    size: number,
    status?: CallStatus
  ) {
    await this.resolveActiveUser(userId);
    const { calls, total } = await callSessionRepository.listHistoryForUser(
      userId,
      page,
      size,
      status
    );
    const userMap = await this.loadParticipantProfiles(
      Array.from(
        new Set(
          calls.flatMap((call) => [call.caller.toString(), call.callee.toString()])
        )
      )
    );

    return {
      calls: calls.map((call) => this.buildCallResponse(call, userId, userMap)),
      pagination: {
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
      },
    };
  }

  async getActiveCall(userId: string) {
    await this.resolveActiveUser(userId);
    const activeCall = await callSessionRepository.getLatestOngoingCallForUser(userId);
    if (!activeCall) {
      return null;
    }

    return this.serializeCall(activeCall, userId);
  }

  async authorizeSignalRelay(params: {
    actorUserId: string;
    actorSessionId: string;
    callId: string;
    signalType: CallSignalType;
    payload: unknown;
  }) {
    const serializedPayload = JSON.stringify(params.payload) ?? "";
    if (Buffer.byteLength(serializedPayload, "utf8") > CALL_SIGNAL_MAX_PAYLOAD_BYTES) {
      throw new HttpError(413, "Signal payload is too large.");
    }

    const call = await callSessionRepository.getSessionByIdForParticipant(
      params.callId,
      params.actorUserId
    );
    if (!call) {
      throw new HttpError(404, CALL_NOT_FOUND_MESSAGE);
    }

    const callerId = call.caller.toString();
    const calleeId = call.callee.toString();
    const isCaller = callerId === params.actorUserId;

    if (isCaller) {
      if (call.callerSessionId.toString() !== params.actorSessionId) {
        throw new HttpError(403, "Signal relay is not allowed for this session.");
      }
      if (call.status !== "ringing" && call.status !== "active") {
        throw new HttpError(409, CALL_UNAVAILABLE_MESSAGE);
      }
    } else {
      if (!call.calleeSessionId || call.calleeSessionId.toString() !== params.actorSessionId) {
        throw new HttpError(403, "Signal relay is not allowed for this session.");
      }
      if (call.status !== "active") {
        throw new HttpError(409, CALL_UNAVAILABLE_MESSAGE);
      }
    }

    await CallSessionModel.updateOne(
      { _id: call._id },
      {
        $set: {
          lastSignalAt: new Date(),
        },
      }
    );

    return {
      callId: call._id.toString(),
      recipientUserId: isCaller ? calleeId : callerId,
      signalType: params.signalType,
      payload: params.payload,
      callerUserId: callerId,
      calleeUserId: calleeId,
    };
  }

  async expireTimedOutCalls(limit = 100) {
    const expiredCalls = await callSessionRepository.getExpiredRingingCalls(new Date(), limit);
    const results: ICallSession[] = [];

    for (const call of expiredCalls) {
      const updatedCall = await this.finalizeCall(call, {
        status: "missed",
        endedReason: "missed",
        actorUserId: call.caller.toString(),
      });
      results.push(updatedCall);
    }

    return results;
  }

  async terminateCallsForSession(
    userId: string,
    sessionId: string,
    reason: Extract<CallEndReason, "logout" | "session_revoked">
  ) {
    const calls = await callSessionRepository.listOngoingCallsForSession(userId, sessionId);

    for (const call of calls) {
      const isCaller = call.caller.toString() === userId;
      const status =
        call.status === "ringing"
          ? isCaller
            ? "cancelled"
            : "declined"
          : "ended";

      await this.finalizeCall(call, {
        status,
        endedReason: reason,
        actorUserId: userId,
      });
    }
  }

  async terminateCallsBetweenUsers(
    firstUserId: string,
    secondUserId: string,
    reason: Extract<CallEndReason, "blocked">
  ) {
    const calls = await callSessionRepository.listOngoingCallsBetweenUsers(
      firstUserId,
      secondUserId
    );

    for (const call of calls) {
      const actorUserId = call.caller.toString() === firstUserId ? firstUserId : secondUserId;
      const status = call.status === "ringing" ? "cancelled" : "ended";

      await this.finalizeCall(call, {
        status,
        endedReason: reason,
        actorUserId,
      });
    }
  }
}

export const callSignalTypes = CALL_ROOM_SIGNAL_TYPES;
