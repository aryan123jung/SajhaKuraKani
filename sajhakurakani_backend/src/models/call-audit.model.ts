import mongoose, { Document, Schema } from "mongoose";
import type { CallType } from "./call-session.model";

export type CallAuditAction =
  | "initiated"
  | "accepted"
  | "declined"
  | "cancelled"
  | "missed"
  | "ended";

export interface ICallAudit extends Document {
  _id: mongoose.Types.ObjectId;
  action: CallAuditAction;
  callSession: mongoose.Types.ObjectId;
  actorUserId: mongoose.Types.ObjectId;
  otherUserId: mongoose.Types.ObjectId;
  callType: CallType;
  ipAddress?: string;
  durationSeconds?: number;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const callAuditSchema = new Schema<ICallAudit>(
  {
    action: {
      type: String,
      enum: ["initiated", "accepted", "declined", "cancelled", "missed", "ended"],
      required: true,
      index: true,
    },
    callSession: {
      type: Schema.Types.ObjectId,
      ref: "CallSession",
      required: true,
      index: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    otherUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    callType: {
      type: String,
      enum: ["audio", "video"],
      required: true,
    },
    ipAddress: {
      type: String,
      required: false,
      trim: true,
      maxlength: 128,
    },
    durationSeconds: {
      type: Number,
      required: false,
      min: 0,
    },
    reason: {
      type: String,
      required: false,
      trim: true,
      maxlength: 120,
    },
  },
  {
    timestamps: true,
  }
);

callAuditSchema.index({ actorUserId: 1, createdAt: -1 });
callAuditSchema.index({ otherUserId: 1, createdAt: -1 });
callAuditSchema.index({ callSession: 1, createdAt: -1 });

export const CallAuditModel = mongoose.model<ICallAudit>(
  "CallAudit",
  callAuditSchema
);
