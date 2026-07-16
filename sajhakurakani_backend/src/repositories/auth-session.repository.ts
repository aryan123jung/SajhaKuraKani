import mongoose from "mongoose";
import { AuthSessionModel, type IAuthSession } from "../models/auth-session.model";

export class AuthSessionRepository {
  async createSession(
    sessionId: mongoose.Types.ObjectId,
    data: Partial<IAuthSession>
  ) {
    const session = new AuthSessionModel({
      _id: sessionId,
      ...data,
    });
    await session.save();
    return session;
  }

  async getSessionById(sessionId: string) {
    return AuthSessionModel.findById(sessionId);
  }

  async getActiveSessionById(sessionId: string) {
    return AuthSessionModel.findOne({
      _id: sessionId,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
  }

  async listActiveSessionsForUser(userId: string) {
    return AuthSessionModel.find({
      userId,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).sort({ lastUsedAt: -1, createdAt: -1 });
  }

  async rotateRefreshToken(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    lastIpHash?: string,
    userAgent?: string
  ) {
    return AuthSessionModel.findByIdAndUpdate(
      sessionId,
      {
        refreshTokenHash,
        expiresAt,
        lastIpHash,
        userAgent,
        lastUsedAt: new Date(),
      },
      { new: true }
    );
  }

  async touchSession(
    sessionId: string,
    lastIpHash?: string,
    userAgent?: string
  ) {
    return AuthSessionModel.findByIdAndUpdate(
      sessionId,
      {
        lastIpHash,
        userAgent,
        lastUsedAt: new Date(),
      },
      { new: true }
    );
  }

  async revokeSession(sessionId: string, reason: string) {
    return AuthSessionModel.findByIdAndUpdate(
      sessionId,
      {
        revokedAt: new Date(),
        revokedReason: reason,
      },
      { new: true }
    );
  }

  async revokeAllSessionsForUser(userId: string, reason: string, exceptSessionId?: string) {
    const filter: Record<string, unknown> = {
      userId,
      revokedAt: { $exists: false },
    };

    if (exceptSessionId) {
      filter._id = { $ne: new mongoose.Types.ObjectId(exceptSessionId) };
    }

    return AuthSessionModel.updateMany(filter, {
      $set: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }
}
