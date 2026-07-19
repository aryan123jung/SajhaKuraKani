import mongoose, { Document, Schema } from "mongoose";

export const ACTIVE_CALL_STATUSES = ["ringing", "active"] as const;
export const FINAL_CALL_STATUSES = [
  "declined",
  "missed",
  "ended",
  "cancelled",
] as const;

export type CallType = "audio" | "video";
export type CallStatus = (typeof ACTIVE_CALL_STATUSES)[number] | (typeof FINAL_CALL_STATUSES)[number];
export type CallEndReason =
  | "declined"
  | "missed"
  | "cancelled"
  | "completed"
  | "blocked"
  | "logout"
  | "session_revoked"
  | "expired"
  | "system";

export interface ICallSession extends Document {
  _id: mongoose.Types.ObjectId;
  pairKey: string;
  callType: CallType;
  status: CallStatus;
  caller: mongoose.Types.ObjectId;
  callee: mongoose.Types.ObjectId;
  callerSessionId: mongoose.Types.ObjectId;
  calleeSessionId?: mongoose.Types.ObjectId;
  initiatedIpAddress?: string;
  acceptByExpiresAt: Date;
  unansweredTimeoutAt: Date;
  acceptedAt?: Date;
  endedAt?: Date;
  endedReason?: CallEndReason;
  endedByUserId?: mongoose.Types.ObjectId;
  lastSignalAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const callSessionSchema = new Schema<ICallSession>(
  {
    pairKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
      maxlength: 80,
    },
    callType: {
      type: String,
      enum: ["audio", "video"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["ringing", "active", "declined", "missed", "ended", "cancelled"],
      required: true,
      default: "ringing",
      index: true,
    },
    caller: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    callee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    callerSessionId: {
      type: Schema.Types.ObjectId,
      ref: "AuthSession",
      required: true,
      index: true,
    },
    calleeSessionId: {
      type: Schema.Types.ObjectId,
      ref: "AuthSession",
      required: false,
      index: true,
    },
    initiatedIpAddress: {
      type: String,
      required: false,
      trim: true,
      maxlength: 128,
    },
    acceptByExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    unansweredTimeoutAt: {
      type: Date,
      required: true,
      index: true,
    },
    acceptedAt: {
      type: Date,
      required: false,
    },
    endedAt: {
      type: Date,
      required: false,
      index: true,
    },
    endedReason: {
      type: String,
      enum: [
        "declined",
        "missed",
        "cancelled",
        "completed",
        "blocked",
        "logout",
        "session_revoked",
        "expired",
        "system",
      ],
      required: false,
      index: true,
    },
    endedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    lastSignalAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

callSessionSchema.index({ caller: 1, status: 1, createdAt: -1 });
callSessionSchema.index({ callee: 1, status: 1, createdAt: -1 });
callSessionSchema.index({ pairKey: 1, status: 1, createdAt: -1 });

export const CallSessionModel = mongoose.model<ICallSession>(
  "CallSession",
  callSessionSchema
);
