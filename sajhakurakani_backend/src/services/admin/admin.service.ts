import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  ADMIN_ACTION_RATE_LIMIT_MAX_REQUESTS,
  ADMIN_CONFIRMATION_WINDOW_MS,
  ADMIN_ALERT_AFTER_HOUR_UTC_END,
  ADMIN_ALERT_AFTER_HOUR_UTC_START,
  ADMIN_MASS_ACTION_THRESHOLD,
  ADMIN_MASS_ACTION_WINDOW_MS,
  ADMIN_REAUTH_TOKEN_EXPIRES_IN,
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_ISSUER,
  JWT_PRIVATE_KEY,
  JWT_PUBLIC_KEY,
  REDIS_URL,
} from "../../configs";
import { HttpError } from "../../errors/http-error";
import { PostCommentReportModel } from "../../models/post-comment-report.model";
import { PostReportModel } from "../../models/post-report.model";
import { FriendRequestReportModel } from "../../models/friend-request-report.model";
import type { PostReportStatus } from "../../models/post-report.model";
import type { PostCommentReportStatus } from "../../models/post-comment-report.model";
import type { FriendRequestReportStatus } from "../../models/friend-request-report.model";
import { UserModel, type IUser } from "../../models/user.model";
import { PostModel } from "../../models/post.model";
import { PostCommentModel } from "../../models/post-comment.model";
import { UserRepository } from "../../repositories/user.repository";
import { AdminAuditRepository } from "../../repositories/admin/admin-audit.repository";
import { AdminConfirmationRepository } from "../../repositories/admin/admin-confirmation.repository";
import { AdminSecurityAlertRepository } from "../../repositories/admin/admin-security-alert.repository";
import { AuthSessionRepository } from "../../repositories/auth-session.repository";
import { decryptText, encryptText } from "../../utils/crypto.util";
import { verifyTotpCode } from "../../utils/totp.util";
import { decryptProtectedText, serializePostsForResponse } from "../../utils/post-data-protection.util";
import {
  assertAdminUser,
  detectSuspiciousAdminBurst,
  hashConfirmationPayload,
  maskEmail,
  sanitizeAdminReason,
} from "../../admin/admin.helpers";
import { isAdminRole, type AdminRole } from "../../admin/admin.constants";

type AdminReauthPayload = jwt.JwtPayload & {
  adminUserId: string;
  role: AdminRole;
  tokenType: "admin_reauth";
};

type ReportKind = "post" | "comment" | "friend-request";

const userRepository = new UserRepository();
const adminAuditRepository = new AdminAuditRepository();
const adminConfirmationRepository = new AdminConfirmationRepository();
const adminSecurityAlertRepository = new AdminSecurityAlertRepository();
const authSessionRepository = new AuthSessionRepository();

export class AdminService {
  private async createSecurityAlert(input: {
    adminUserId?: string;
    type:
      | "new_ip_login"
      | "late_night_activity"
      | "mass_action_detected"
      | "failed_login_lockout"
      | "suspicious_user_agent"
      | "network_isolation_violation"
      | "waf_verification_failed"
      | "client_certificate_missing"
      | "device_posture_failed";
    severity: "medium" | "high" | "critical";
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }) {
    // layer3 - persistent suspicious activity alerting
    await adminSecurityAlertRepository.createAlert({
      adminUserId: input.adminUserId
        ? new mongoose.Types.ObjectId(input.adminUserId)
        : undefined,
      type: input.type,
      severity: input.severity,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: input.details,
    });
  }

  private async assertAdminActionVelocity(admin: IUser, action: string, ipAddress?: string) {
    // layer3 - mass-action detection and temporary blocking
    const recentActionCount = await adminAuditRepository.countRecentActions(
      admin._id.toString(),
      new Date(Date.now() - ADMIN_MASS_ACTION_WINDOW_MS)
    );

    if (recentActionCount >= ADMIN_MASS_ACTION_THRESHOLD) {
      await this.createSecurityAlert({
        adminUserId: admin._id.toString(),
        type: "mass_action_detected",
        severity: "critical",
        ipAddress,
        details: {
          action,
          recentActionCount,
          windowMs: ADMIN_MASS_ACTION_WINDOW_MS,
        },
      });

      throw new HttpError(
        429,
        "Suspicious admin activity detected. Additional admin actions have been temporarily blocked."
      );
    }
  }

  private buildAdminReauthToken(admin: IUser) {
    // layer2 - short-lived admin re-auth token for dangerous actions
    if (!JWT_PRIVATE_KEY) {
      throw new HttpError(500, "JWT private key is not configured on the server");
    }

    return jwt.sign(
      {
        adminUserId: admin._id.toString(),
        role: admin.role,
        tokenType: "admin_reauth" as const,
      },
      JWT_PRIVATE_KEY,
      {
        algorithm: JWT_ALGORITHM,
        expiresIn: ADMIN_REAUTH_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        subject: admin._id.toString(),
      }
    );
  }

  private verifyAdminReauthToken(token: string, admin: IUser) {
    if (!JWT_PUBLIC_KEY) {
      throw new HttpError(500, "JWT public key is not configured on the server");
    }

    let decoded: AdminReauthPayload;
    try {
      decoded = jwt.verify(token, JWT_PUBLIC_KEY, {
        algorithms: [JWT_ALGORITHM],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }) as AdminReauthPayload;
    } catch {
      throw new HttpError(401, "Recent admin re-authentication is required for this action");
    }

    if (
      decoded.tokenType !== "admin_reauth" ||
      decoded.adminUserId !== admin._id.toString() ||
      decoded.role !== admin.role
    ) {
      throw new HttpError(401, "Recent admin re-authentication is required for this action");
    }
  }

  private async writeAuditLog(input: {
    admin: IUser;
    action:
      | "admin.login"
      | "admin.logout"
      | "admin.reauth"
      | "report.view"
      | "report.dismiss"
      | "report.action"
      | "user.suspend"
      | "user.ban"
      | "user.unban"
      | "user.revoke-sessions"
      | "user.delete"
      | "post.hide"
      | "post.delete"
      | "comment.hide"
      | "comment.delete";
    targetType: "report" | "user" | "post" | "comment" | "system" | "admin-session";
    targetId?: string;
    reason?: string;
    ipAddress?: string;
    result: "success" | "failure";
    metadata?: Record<string, unknown>;
  }) {
    // layer4 - immutable admin audit trail
    await adminAuditRepository.createAuditLog({
      adminUserId: input.admin._id,
      adminRole: input.admin.role as AdminRole,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      ipAddress: input.ipAddress,
      result: input.result,
      sessionId: input.metadata?.sessionId && typeof input.metadata.sessionId === "string"
        ? input.metadata.sessionId
        : undefined,
      metadata: input.metadata,
    });

    const recentActionCount = await adminAuditRepository.countRecentActions(
      input.admin._id.toString(),
      new Date(Date.now() - 5 * 60 * 1000)
    );

    await detectSuspiciousAdminBurst(
      recentActionCount,
      input.admin._id.toString(),
      input.action
    );

    // layer3 - late-night admin activity alerting
    const currentUtcHour = new Date().getUTCHours();
    if (
      currentUtcHour >= ADMIN_ALERT_AFTER_HOUR_UTC_START &&
      currentUtcHour <= ADMIN_ALERT_AFTER_HOUR_UTC_END
    ) {
      await this.createSecurityAlert({
        adminUserId: input.admin._id.toString(),
        type: "late_night_activity",
        severity: "high",
        ipAddress: input.ipAddress,
        details: {
          action: input.action,
          targetType: input.targetType,
          hourUtc: currentUtcHour,
        },
      });
    }
  }

  private async resolveReport(reportId: string) {
    if (!mongoose.isValidObjectId(reportId)) {
      throw new HttpError(404, "Report not found");
    }

    const [postReport, commentReport, friendRequestReport] = await Promise.all([
      PostReportModel.findById(reportId).populate("reporter", "username firstName lastName email"),
      PostCommentReportModel.findById(reportId).populate("reporter", "username firstName lastName email"),
      FriendRequestReportModel.findById(reportId).populate("reporter", "username firstName lastName email"),
    ]);

    if (postReport) {
      const post = await PostModel.findById(postReport.post).populate("author", "username firstName lastName email");
      return {
        kind: "post" as const,
        report: postReport,
        targetUserId: post?.author?._id?.toString(),
        targetUser: post?.author,
      };
    }

    if (commentReport) {
      const comment = await PostCommentModel.findById(commentReport.comment).populate(
        "author",
        "username firstName lastName email"
      );
      return {
        kind: "comment" as const,
        report: commentReport,
        targetUserId: comment?.author?._id?.toString(),
        targetUser: comment?.author,
      };
    }

    if (friendRequestReport) {
      const targetUser = await UserModel.findById(friendRequestReport.reportedUser).select(
        "username firstName lastName email role isBanned suspendedUntil"
      );
      return {
        kind: "friend-request" as const,
        report: friendRequestReport,
        targetUserId: friendRequestReport.reportedUser.toString(),
        targetUser,
      };
    }

    throw new HttpError(404, "Report not found");
  }

  private requireReason(reason?: string) {
    if (!reason || !reason.trim()) {
      throw new HttpError(400, "A reason is required for this admin action");
    }

    return sanitizeAdminReason(reason);
  }

  private ensureAdminTargetRules(actor: IUser, target: IUser) {
    if (actor._id.toString() === target._id.toString()) {
      throw new HttpError(400, "Admins cannot perform this action on their own account");
    }
  }

  private async ensureSensitiveReauth(token: string | undefined, admin: IUser) {
    if (!token) {
      throw new HttpError(401, "Recent admin re-authentication is required for this action");
    }

    this.verifyAdminReauthToken(token, admin);
  }

  async reauthenticateAdmin(
    admin: IUser,
    password: string,
    totpCode: string,
    ipAddress?: string
  ) {
    assertAdminUser(admin);
    const adminWithSensitive = await userRepository.getUserById(admin._id.toString(), true);
    if (!adminWithSensitive?.password) {
      throw new HttpError(404, "Admin account not found");
    }

    const validPassword = await bcryptjs.compare(password, adminWithSensitive.password);
    if (!validPassword) {
      await this.writeAuditLog({
        admin,
        action: "admin.reauth",
        targetType: "admin-session",
        targetId: admin._id.toString(),
        ipAddress,
        result: "failure",
      });
      throw new HttpError(401, "Admin re-authentication failed");
    }

    if (!adminWithSensitive.totpEnabled || !adminWithSensitive.totpSecretEncrypted) {
      throw new HttpError(403, "Admin accounts must enable TOTP before using admin tools");
    }

    const secret = decryptText(adminWithSensitive.totpSecretEncrypted);
    if (!verifyTotpCode(secret, totpCode)) {
      await this.writeAuditLog({
        admin,
        action: "admin.reauth",
        targetType: "admin-session",
        targetId: admin._id.toString(),
        ipAddress,
        result: "failure",
      });
      throw new HttpError(401, "Admin re-authentication failed");
    }

    const token = this.buildAdminReauthToken(adminWithSensitive);
    await this.writeAuditLog({
      admin,
      action: "admin.reauth",
      targetType: "admin-session",
      targetId: admin._id.toString(),
      ipAddress,
      result: "success",
    });

    return { token, expiresIn: ADMIN_REAUTH_TOKEN_EXPIRES_IN };
  }

  async listReports(admin: IUser, query: { status?: string; type?: string; page: number; size: number }) {
    assertAdminUser(admin);

    const status = (query.status?.trim() || "open") as
      | PostReportStatus
      | PostCommentReportStatus
      | FriendRequestReportStatus;
    const skip = (query.page - 1) * query.size;
    const sharedFilter = { status };

    const shouldIncludeType = (kind: ReportKind) => !query.type || query.type === kind;

    const tasks: Promise<{ kind: ReportKind; items: any[] }>[] = [];

    if (shouldIncludeType("post")) {
      tasks.push(
        PostReportModel.find(sharedFilter)
          .populate("reporter", "username firstName lastName")
          .populate({ path: "post", select: "author visibility createdAt", populate: { path: "author", select: "username firstName lastName" } })
          .sort({ createdAt: -1 })
          .then((items) => ({ kind: "post" as const, items }))
      );
    }

    if (shouldIncludeType("comment")) {
      tasks.push(
        PostCommentReportModel.find(sharedFilter)
          .populate("reporter", "username firstName lastName")
          .populate({ path: "comment", select: "author post createdAt", populate: { path: "author", select: "username firstName lastName" } })
          .sort({ createdAt: -1 })
          .then((items) => ({ kind: "comment" as const, items }))
      );
    }

    if (shouldIncludeType("friend-request")) {
      tasks.push(
        FriendRequestReportModel.find(sharedFilter)
          .populate("reporter", "username firstName lastName")
          .populate("reportedUser", "username firstName lastName")
          .sort({ createdAt: -1 })
          .then((items) => ({ kind: "friend-request" as const, items }))
      );
    }

    const reportGroups = await Promise.all(tasks);
    const merged = reportGroups
      .flatMap((group) =>
        group.items.map((item) => ({
          type: group.kind,
          ...item.toObject(),
        }))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      data: merged.slice(skip, skip + query.size),
      pagination: {
        page: query.page,
        size: query.size,
        total: merged.length,
      },
    };
  }

  async getReport(admin: IUser, reportId: string, ipAddress?: string) {
    assertAdminUser(admin);
    const resolved = await this.resolveReport(reportId);
    await this.writeAuditLog({
      admin,
      action: "report.view",
      targetType: "report",
      targetId: reportId,
      ipAddress,
      result: "success",
      metadata: { reportType: resolved.kind },
    });
    return resolved;
  }

  async dismissReport(admin: IUser, reportId: string, reason: string, ipAddress?: string) {
    assertAdminUser(admin);
    await this.assertAdminActionVelocity(admin, "report.dismiss", ipAddress);
    const sanitizedReason = this.requireReason(reason);
    const resolved = await this.resolveReport(reportId);
    if (resolved.report.status !== "open") {
      throw new HttpError(409, "This report has already been actioned");
    }

    resolved.report.status = "dismissed";
    await resolved.report.save();

    await this.writeAuditLog({
      admin,
      action: "report.dismiss",
      targetType: "report",
      targetId: reportId,
      reason: sanitizedReason,
      ipAddress,
      result: "success",
      metadata: { reportType: resolved.kind },
    });

    return resolved.report;
  }

  async actionReport(
    admin: IUser,
    reportId: string,
    input: { actionType: "warn" | "suspend" | "ban"; reason: string; durationHours?: number },
    ipAddress?: string,
    reauthToken?: string
  ) {
    assertAdminUser(admin);
    await this.assertAdminActionVelocity(admin, "report.action", ipAddress);
    const reason = this.requireReason(input.reason);
    const resolved = await this.resolveReport(reportId);

    if (resolved.report.status !== "open") {
      throw new HttpError(409, "This report has already been actioned");
    }

    if (input.actionType === "warn") {
      resolved.report.status = "resolved";
      await resolved.report.save();
    } else {
      await this.ensureSensitiveReauth(reauthToken, admin);
      if (!resolved.targetUserId) {
        throw new HttpError(404, "Target user not found");
      }

      if (input.actionType === "suspend") {
        await this.suspendUser(
          admin,
          resolved.targetUserId,
          reason,
          input.durationHours ?? 24,
          ipAddress,
          reauthToken
        );
      }

      if (input.actionType === "ban") {
        await this.initiateBanUser(admin, resolved.targetUserId, reason, ipAddress);
      }

      resolved.report.status = "resolved";
      await resolved.report.save();
    }

    await this.writeAuditLog({
      admin,
      action: "report.action",
      targetType: "report",
      targetId: reportId,
      reason,
      ipAddress,
      result: "success",
      metadata: { reportType: resolved.kind, actionType: input.actionType },
    });

    return resolved.report;
  }

  async searchUsers(admin: IUser, query: { search?: string; page: number; size: number }) {
    assertAdminUser(admin);
    const { users, total } = await userRepository.getAllusers(query.page, query.size, query.search);
    return {
      data: users.map((user) => {
        const payload = user.toObject() as Record<string, unknown>;
        if (isAdminRole(user.role)) {
          payload.email = maskEmail(String(payload.email ?? ""));
        }
        delete payload.password;
        delete payload.resetPasswordTokenHash;
        return payload;
      }),
      pagination: { page: query.page, size: query.size, total },
    };
  }

  async listPosts(admin: IUser, query: { search?: string; page: number; size: number }) {
    assertAdminUser(admin);
    const skip = (query.page - 1) * query.size;
    const trimmedSearch = query.search?.trim();

    const postFilter: Record<string, unknown> = {
      $or: [{ softDeletedAt: { $exists: false } }, { softDeletedAt: null }],
    };

    if (trimmedSearch) {
      const matchedUsers = await UserModel.find({
        $or: [
          { username: { $regex: trimmedSearch, $options: "i" } },
          { firstName: { $regex: trimmedSearch, $options: "i" } },
          { lastName: { $regex: trimmedSearch, $options: "i" } },
          {
            $expr: {
              $regexMatch: {
                input: { $concat: ["$firstName", " ", "$lastName"] },
                regex: trimmedSearch,
                options: "i",
              },
            },
          },
        ],
      }).select("_id");

      const authorIds = matchedUsers.map((user) => user._id);
      const contentRegex = new RegExp(trimmedSearch, "i");

      postFilter.$and = [
        {
          $or: [
            { title: { $regex: contentRegex } },
            { content: { $regex: contentRegex } },
            { author: { $in: authorIds } },
          ],
        },
      ];
    }

    const [posts, total] = await Promise.all([
      PostModel.find(postFilter)
        .populate("author", "firstName lastName username email profileUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.size),
      PostModel.countDocuments(postFilter),
    ]);

    const postIds = posts.map((post) => post._id);
    const [commentCounts, recentComments] = await Promise.all([
      PostCommentModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
        {
          $match: {
            post: { $in: postIds },
            isDeleted: false,
            hiddenByAdmin: false,
          },
        },
        { $group: { _id: "$post", count: { $sum: 1 } } },
      ]),
      PostCommentModel.find({
        post: { $in: postIds },
        isDeleted: false,
        hiddenByAdmin: false,
      })
        .populate("author", "firstName lastName username profileUrl")
        .sort({ createdAt: -1 })
        .limit(Math.max(postIds.length * 3, 12)),
    ]);

    const commentCountMap = new Map(
      commentCounts.map((item) => [item._id.toString(), item.count])
    );
    const recentCommentsMap = new Map<string, Array<Record<string, unknown>>>();

    recentComments.forEach((comment) => {
      const key = comment.post.toString();
      const currentList = recentCommentsMap.get(key) ?? [];
      if (currentList.length >= 3) {
        return;
      }

      const serializedComment = comment.toObject() as unknown as Record<string, unknown>;
      serializedComment.content =
        comment.content ?? decryptProtectedText(comment.contentEncrypted) ?? undefined;
      delete serializedComment.contentEncrypted;
      delete serializedComment.contentHash;
      delete serializedComment.duplicateFingerprint;

      currentList.push(serializedComment);
      recentCommentsMap.set(key, currentList);
    });

    const serializedPosts = serializePostsForResponse(posts).map((post) => ({
      ...post,
      commentCount: commentCountMap.get(String(post._id)) ?? 0,
      recentComments: recentCommentsMap.get(String(post._id)) ?? [],
      author: post.author && typeof post.author === "object"
        ? {
            ...(post.author as Record<string, unknown>),
            email: maskEmail(String((post.author as Record<string, unknown>).email ?? "")),
          }
        : post.author,
    }));

    return {
      data: serializedPosts,
      pagination: { page: query.page, size: query.size, total },
    };
  }

  async suspendUser(
    admin: IUser,
    userId: string,
    reason: string,
    durationHours: number,
    ipAddress?: string,
    reauthToken?: string
  ) {
    assertAdminUser(admin);
    await this.assertAdminActionVelocity(admin, "user.suspend", ipAddress);
    // layer2 - re-auth before sensitive account enforcement
    await this.ensureSensitiveReauth(reauthToken, admin);
    const sanitizedReason = this.requireReason(reason);

    const target = await UserModel.findById(userId).select("+mustChangePassword");
    if (!target) {
      throw new HttpError(404, "User not found");
    }

    this.ensureAdminTargetRules(admin, target);

    target.suspendedUntil = new Date(Date.now() + Math.max(1, durationHours) * 60 * 60 * 1000);
    target.suspensionReason = sanitizedReason;
    await target.save();
    // layer7 - immediate containment by revoking active sessions
    await authSessionRepository.revokeAllSessionsForUser(userId, "admin_suspended_user");

    await this.writeAuditLog({
      admin,
      action: "user.suspend",
      targetType: "user",
      targetId: userId,
      reason: sanitizedReason,
      ipAddress,
      result: "success",
      metadata: { durationHours },
    });

    return target;
  }

  async initiateBanUser(admin: IUser, userId: string, reason: string, ipAddress?: string) {
    assertAdminUser(admin);
    await this.assertAdminActionVelocity(admin, "user.ban", ipAddress);
    const sanitizedReason = this.requireReason(reason);
    const target = await UserModel.findById(userId);
    if (!target) {
      throw new HttpError(404, "User not found");
    }

    this.ensureAdminTargetRules(admin, target);
    const payloadHash = hashConfirmationPayload({ userId, reason: sanitizedReason });
    const confirmation = await adminConfirmationRepository.createConfirmation({
      adminUserId: admin._id,
      action: "user.ban",
      targetType: "user",
      targetId: userId,
      payloadHash,
      reason: sanitizedReason,
      expiresAt: new Date(Date.now() + ADMIN_CONFIRMATION_WINDOW_MS),
    });

    return {
      confirmationId: confirmation._id.toString(),
      expiresAt: confirmation.expiresAt,
      message: "Ban requires confirmation within 10 seconds.",
    };
  }

  async confirmBanUser(
    admin: IUser,
    userId: string,
    confirmationId: string,
    reason: string,
    ipAddress?: string,
    reauthToken?: string
  ) {
    assertAdminUser(admin);
    await this.assertAdminActionVelocity(admin, "user.ban.confirm", ipAddress);
    // layer2 - re-auth before permanent enforcement
    await this.ensureSensitiveReauth(reauthToken, admin);
    const sanitizedReason = this.requireReason(reason);
    const confirmation = await adminConfirmationRepository.getActiveConfirmation(
      confirmationId,
      admin._id.toString(),
      "user.ban"
    );
    if (!confirmation) {
      throw new HttpError(410, "This admin confirmation has expired");
    }

    const payloadHash = hashConfirmationPayload({ userId, reason: sanitizedReason });
    if (confirmation.payloadHash !== payloadHash || confirmation.targetId !== userId) {
      throw new HttpError(400, "The admin confirmation payload does not match");
    }

    const target = await UserModel.findById(userId);
    if (!target) {
      throw new HttpError(404, "User not found");
    }

    this.ensureAdminTargetRules(admin, target);
    target.isBanned = true;
    target.bannedAt = new Date();
    target.suspendedUntil = undefined;
    target.suspensionReason = sanitizedReason;
    await target.save();
    // layer7 - immediate containment by revoking active sessions
    await authSessionRepository.revokeAllSessionsForUser(userId, "admin_banned_user");

    await this.writeAuditLog({
      admin,
      action: "user.ban",
      targetType: "user",
      targetId: userId,
      reason: sanitizedReason,
      ipAddress,
      result: "success",
    });

    return target;
  }

  async unbanUser(
    admin: IUser,
    userId: string,
    reason: string,
    ipAddress?: string,
    reauthToken?: string
  ) {
    assertAdminUser(admin);
    await this.assertAdminActionVelocity(admin, "user.unban", ipAddress);
    await this.ensureSensitiveReauth(reauthToken, admin);
    const sanitizedReason = this.requireReason(reason);
    const target = await UserModel.findById(userId);
    if (!target) {
      throw new HttpError(404, "User not found");
    }

    target.isBanned = false;
    target.bannedAt = undefined;
    target.suspendedUntil = undefined;
    target.suspensionReason = undefined;
    await target.save();

    await this.writeAuditLog({
      admin,
      action: "user.unban",
      targetType: "user",
      targetId: userId,
      reason: sanitizedReason,
      ipAddress,
      result: "success",
    });

    return target;
  }

  async deleteUser(
    admin: IUser,
    userId: string,
    reason: string,
    ipAddress?: string,
    reauthToken?: string
  ) {
    assertAdminUser(admin);
    await this.assertAdminActionVelocity(admin, "user.delete", ipAddress);
    // layer2 - re-auth before destructive deletion
    await this.ensureSensitiveReauth(reauthToken, admin);
    const sanitizedReason = this.requireReason(reason);
    const target = await UserModel.findById(userId);
    if (!target) {
      throw new HttpError(404, "User not found");
    }

    this.ensureAdminTargetRules(admin, target);
    // layer7 - revoke sessions before deleting the account
    await authSessionRepository.revokeAllSessionsForUser(userId, "admin_deleted_user");
    await UserModel.findByIdAndDelete(userId);

    await this.writeAuditLog({
      admin,
      action: "user.delete",
      targetType: "user",
      targetId: userId,
      reason: sanitizedReason,
      ipAddress,
      result: "success",
    });
  }

  async hidePost(
    admin: IUser,
    postId: string,
    reason: string,
    ipAddress?: string,
    reauthToken?: string
  ) {
    assertAdminUser(admin);
    await this.assertAdminActionVelocity(admin, "post.hide", ipAddress);
    await this.ensureSensitiveReauth(reauthToken, admin);
    const sanitizedReason = this.requireReason(reason);
    const post = await PostModel.findById(postId);
    if (!post) {
      throw new HttpError(404, "Post not found");
    }

    post.hiddenByAdmin = true;
    post.hiddenAt = new Date();
    post.hiddenReason = sanitizedReason;
    await post.save();

    await this.writeAuditLog({
      admin,
      action: "post.hide",
      targetType: "post",
      targetId: postId,
      reason: sanitizedReason,
      ipAddress,
      result: "success",
    });

    return post;
  }

  async deletePost(
    admin: IUser,
    postId: string,
    reason: string,
    ipAddress?: string,
    reauthToken?: string
  ) {
    assertAdminUser(admin);
    await this.assertAdminActionVelocity(admin, "post.delete", ipAddress);
    await this.ensureSensitiveReauth(reauthToken, admin);
    const sanitizedReason = this.requireReason(reason);
    const post = await PostModel.findById(postId);
    if (!post) {
      throw new HttpError(404, "Post not found");
    }

    post.softDeletedAt = new Date();
    post.hiddenByAdmin = true;
    post.hiddenAt = new Date();
    post.hiddenReason = sanitizedReason;
    await post.save();

    await this.writeAuditLog({
      admin,
      action: "post.delete",
      targetType: "post",
      targetId: postId,
      reason: sanitizedReason,
      ipAddress,
      result: "success",
    });

    return post;
  }

  async hideComment(
    admin: IUser,
    commentId: string,
    reason: string,
    ipAddress?: string,
    reauthToken?: string
  ) {
    assertAdminUser(admin);
    await this.assertAdminActionVelocity(admin, "comment.hide", ipAddress);
    await this.ensureSensitiveReauth(reauthToken, admin);
    const sanitizedReason = this.requireReason(reason);
    const comment = await PostCommentModel.findById(commentId);
    if (!comment) {
      throw new HttpError(404, "Comment not found");
    }

    comment.hiddenByAdmin = true;
    comment.hiddenAt = new Date();
    comment.hiddenReason = sanitizedReason;
    await comment.save();

    await this.writeAuditLog({
      admin,
      action: "comment.hide",
      targetType: "comment",
      targetId: commentId,
      reason: sanitizedReason,
      ipAddress,
      result: "success",
    });

    return comment;
  }

  async deleteComment(
    admin: IUser,
    commentId: string,
    reason: string,
    ipAddress?: string,
    reauthToken?: string
  ) {
    assertAdminUser(admin);
    await this.assertAdminActionVelocity(admin, "comment.delete", ipAddress);
    await this.ensureSensitiveReauth(reauthToken, admin);
    const sanitizedReason = this.requireReason(reason);
    const comment = await PostCommentModel.findById(commentId);
    if (!comment) {
      throw new HttpError(404, "Comment not found");
    }

    comment.hiddenByAdmin = true;
    comment.hiddenAt = new Date();
    comment.hiddenReason = sanitizedReason;
    comment.isDeleted = true;
    comment.deletedAt = new Date();
    comment.deletedBy = admin._id;
    await comment.save();

    await this.writeAuditLog({
      admin,
      action: "comment.delete",
      targetType: "comment",
      targetId: commentId,
      reason: sanitizedReason,
      ipAddress,
      result: "success",
    });

    return comment;
  }

  async listAuditLogs(
    admin: IUser,
    query: { page: number; size: number; adminUserId?: string; action?: string; result?: string }
  ) {
    assertAdminUser(admin);
    const filter: Record<string, unknown> = {};
    if (query.adminUserId && mongoose.isValidObjectId(query.adminUserId)) {
      filter.adminUserId = query.adminUserId;
    }
    if (query.action) {
      filter.action = query.action;
    }
    if (query.result) {
      filter.result = query.result;
    }
    const skip = (query.page - 1) * query.size;
    const { items, total } = await adminAuditRepository.listAuditLogs(filter, query.size, skip);
    return {
      data: items,
      pagination: { page: query.page, size: query.size, total },
    };
  }

  async listAdminActivity(admin: IUser, query: { page: number; size: number }) {
    assertAdminUser(admin);
    const skip = (query.page - 1) * query.size;
    const { items, total } = await adminAuditRepository.listAuditLogs({}, query.size, skip);
    return {
      data: items.map((item) => ({
        id: item._id,
        adminUserId: item.adminUserId,
        adminRole: item.adminRole,
        action: item.action,
        targetType: item.targetType,
        targetId: item.targetId,
        reason: item.reason,
        result: item.result,
        createdAt: item.createdAt,
      })),
      pagination: { page: query.page, size: query.size, total },
    };
  }

  async listSecurityAlerts(admin: IUser) {
    assertAdminUser(admin);
    return adminSecurityAlertRepository.listAlerts(100);
  }

  async revokeUserSessions(
    admin: IUser,
    userId: string,
    reason: string,
    ipAddress?: string,
    reauthToken?: string
  ) {
    assertAdminUser(admin);
    await this.assertAdminActionVelocity(admin, "user.revoke-sessions", ipAddress);
    // layer7 - incident response session kill-switch
    await this.ensureSensitiveReauth(reauthToken, admin);
    const sanitizedReason = this.requireReason(reason);
    const target = await UserModel.findById(userId);
    if (!target) {
      throw new HttpError(404, "User not found");
    }

    this.ensureAdminTargetRules(admin, target);
    await authSessionRepository.revokeAllSessionsForUser(userId, "admin_revoked_all_sessions");

    await this.writeAuditLog({
      admin,
      action: "user.revoke-sessions",
      targetType: "user",
      targetId: userId,
      reason: `session-revoke:${sanitizedReason}`,
      ipAddress,
      result: "success",
      metadata: { incidentResponse: true },
    });
  }

  async getStats(admin: IUser) {
    assertAdminUser(admin);
    const [userCount, bannedUserCount, openPostReports, openCommentReports, openFriendReports] =
      await Promise.all([
        UserModel.countDocuments({ role: "user" }),
        UserModel.countDocuments({ isBanned: true }),
        PostReportModel.countDocuments({ status: "open" }),
        PostCommentReportModel.countDocuments({ status: "open" }),
        FriendRequestReportModel.countDocuments({ status: "open" }),
      ]);

    return {
      users: userCount,
      bannedUsers: bannedUserCount,
      openReports: openPostReports + openCommentReports + openFriendReports,
      reportsByType: {
        post: openPostReports,
        comment: openCommentReports,
        friendRequest: openFriendReports,
      },
    };
  }

  async getHealth(admin: IUser) {
    assertAdminUser(admin);
    return {
      mongoReadyState: mongoose.connection.readyState,
      redisConfigured: Boolean(REDIS_URL),
      uptimeSeconds: Math.floor(process.uptime()),
      adminActionRateLimit: ADMIN_ACTION_RATE_LIMIT_MAX_REQUESTS,
    };
  }
}
