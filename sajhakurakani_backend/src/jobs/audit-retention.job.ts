import {
  AUDIT_LOG_CLEANUP_INTERVAL_HOURS,
  AUDIT_LOG_RETENTION_DAYS,
} from "../configs";
import { DirectMessageAuditModel } from "../models/direct-message-audit.model";
import { FriendRequestAuditModel } from "../models/friend-request-audit.model";
import { FriendRequestReportModel } from "../models/friend-request-report.model";
import { PostCommentReportModel } from "../models/post-comment-report.model";
import { PostInteractionAuditModel } from "../models/post-interaction-audit.model";
import { PostReportModel } from "../models/post-report.model";

const RETAINED_REPORT_STATUSES = ["reviewed", "resolved", "dismissed"] as const;

export const runAuditRetentionCleanup = async () => {
  const cutoffDate = new Date(
    Date.now() - AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );

  const [
    directMessageAuditResult,
    friendRequestAuditResult,
    friendRequestReportResult,
    postInteractionAuditResult,
    postCommentReportResult,
    postReportResult,
  ] =
    await Promise.all([
      DirectMessageAuditModel.deleteMany({
        createdAt: { $lt: cutoffDate },
      }),
      FriendRequestAuditModel.deleteMany({
        createdAt: { $lt: cutoffDate },
      }),
      FriendRequestReportModel.deleteMany({
        status: { $in: RETAINED_REPORT_STATUSES },
        updatedAt: { $lt: cutoffDate },
      }),
      PostInteractionAuditModel.deleteMany({
        createdAt: { $lt: cutoffDate },
      }),
      PostCommentReportModel.deleteMany({
        status: { $in: RETAINED_REPORT_STATUSES },
        updatedAt: { $lt: cutoffDate },
      }),
      PostReportModel.deleteMany({
        status: { $in: RETAINED_REPORT_STATUSES },
        updatedAt: { $lt: cutoffDate },
      }),
    ]);

  console.info(
    JSON.stringify({
      scope: "audit-retention",
      action: "cleanup",
      timestamp: new Date().toISOString(),
      retentionDays: AUDIT_LOG_RETENTION_DAYS,
      deleted: {
        directMessageAudits: directMessageAuditResult.deletedCount ?? 0,
        friendRequestAudits: friendRequestAuditResult.deletedCount ?? 0,
        friendRequestReports: friendRequestReportResult.deletedCount ?? 0,
        postInteractionAudits: postInteractionAuditResult.deletedCount ?? 0,
        postCommentReports: postCommentReportResult.deletedCount ?? 0,
        postReports: postReportResult.deletedCount ?? 0,
      },
    })
  );
};

export const startAuditRetentionJob = () => {
  const intervalMs = AUDIT_LOG_CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;

  void runAuditRetentionCleanup().catch((error) => {
    console.error("[audit-retention] initial cleanup failed", error);
  });

  setInterval(() => {
    void runAuditRetentionCleanup().catch((error) => {
      console.error("[audit-retention] scheduled cleanup failed", error);
    });
  }, intervalMs);
};
