import mongoose, { Document, Schema } from "mongoose";
import type { AdminRole } from "../../admin/admin.constants";
import { getAdminAuditDb } from "../../database/admin-audit.mongodb";

export type AdminAuditAction =
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

export type AdminAuditTargetType =
  | "report"
  | "user"
  | "post"
  | "comment"
  | "system"
  | "admin-session";

export interface IAdminAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  adminUserId: mongoose.Types.ObjectId;
  adminRole: AdminRole;
  action: AdminAuditAction;
  targetType: AdminAuditTargetType;
  targetId?: string;
  reason?: string;
  ipAddress?: string;
  sessionId?: string;
  result: "success" | "failure";
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const adminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    adminUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    adminRole: {
      type: String,
      enum: ["admin"],
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        "admin.login",
        "admin.logout",
        "admin.reauth",
        "report.view",
        "report.dismiss",
        "report.action",
        "user.suspend",
        "user.ban",
        "user.unban",
        "user.revoke-sessions",
        "user.delete",
        "post.hide",
        "post.delete",
        "comment.hide",
        "comment.delete",
      ],
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["report", "user", "post", "comment", "system", "admin-session"],
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: false,
      trim: true,
      maxlength: 64,
      index: true,
    },
    reason: {
      type: String,
      required: false,
      trim: true,
      maxlength: 280,
    },
    ipAddress: {
      type: String,
      required: false,
      trim: true,
      maxlength: 128,
    },
    sessionId: {
      type: String,
      required: false,
      trim: true,
      maxlength: 64,
      index: true,
    },
    result: {
      type: String,
      enum: ["success", "failure"],
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: false,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

adminAuditLogSchema.index({ adminUserId: 1, createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

const blockAuditMutation = () => {
  throw new Error("Admin audit logs are immutable");
};

adminAuditLogSchema.pre("findOneAndUpdate", blockAuditMutation);
adminAuditLogSchema.pre("updateOne", blockAuditMutation);
adminAuditLogSchema.pre("updateMany", blockAuditMutation);
adminAuditLogSchema.pre("deleteOne", blockAuditMutation);
adminAuditLogSchema.pre("deleteMany", blockAuditMutation);
adminAuditLogSchema.pre("findOneAndDelete", blockAuditMutation);

const adminAuditDb = getAdminAuditDb();

export const AdminAuditLogModel =
  (adminAuditDb.models.AdminAuditLog as mongoose.Model<IAdminAuditLog>) ||
  adminAuditDb.model<IAdminAuditLog>("AdminAuditLog", adminAuditLogSchema);
