import mongoose, { Document, Schema } from "mongoose";
import { getAdminAuditDb } from "../../database/admin-audit.mongodb";

export type AdminSecurityAlertType =
  | "new_ip_login"
  | "late_night_activity"
  | "mass_action_detected"
  | "failed_login_lockout"
  | "suspicious_user_agent"
  | "network_isolation_violation"
  | "waf_verification_failed"
  | "client_certificate_missing"
  | "device_posture_failed";

export interface IAdminSecurityAlert extends Document {
  _id: mongoose.Types.ObjectId;
  adminUserId?: mongoose.Types.ObjectId;
  type: AdminSecurityAlertType;
  severity: "medium" | "high" | "critical";
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const adminSecurityAlertSchema = new Schema<IAdminSecurityAlert>(
  {
    adminUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "new_ip_login",
        "late_night_activity",
        "mass_action_detected",
        "failed_login_lockout",
        "suspicious_user_agent",
        "network_isolation_violation",
        "waf_verification_failed",
        "client_certificate_missing",
        "device_posture_failed",
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["medium", "high", "critical"],
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      required: false,
      trim: true,
      maxlength: 128,
    },
    userAgent: {
      type: String,
      required: false,
      trim: true,
      maxlength: 512,
    },
    details: {
      type: Schema.Types.Mixed,
      required: false,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

adminSecurityAlertSchema.index({ type: 1, createdAt: -1 });
adminSecurityAlertSchema.index({ adminUserId: 1, createdAt: -1 });

const adminAuditDb = getAdminAuditDb();

export const AdminSecurityAlertModel =
  (adminAuditDb.models.AdminSecurityAlert as mongoose.Model<IAdminSecurityAlert>) ||
  adminAuditDb.model<IAdminSecurityAlert>("AdminSecurityAlert", adminSecurityAlertSchema);
