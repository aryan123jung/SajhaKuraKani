import mongoose, { Document, Schema } from "mongoose";

export interface IDirectMessageAudit extends Document {
  _id: mongoose.Types.ObjectId;
  action: "message.send" | "message.read";
  actorUserId: mongoose.Types.ObjectId;
  targetUserId: mongoose.Types.ObjectId;
  pairKey: string;
  message?: mongoose.Types.ObjectId;
  ipAddress: string;
  userAgent?: string;
  contentHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const directMessageAuditMongoSchema = new Schema<IDirectMessageAudit>(
  {
    action: {
      type: String,
      enum: ["message.send", "message.read"],
      required: true,
      index: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pairKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    message: {
      type: Schema.Types.ObjectId,
      ref: "DirectMessage",
      required: false,
      index: true,
    },
    ipAddress: {
      type: String,
      required: true,
      trim: true,
    },
    userAgent: {
      type: String,
      required: false,
      trim: true,
      maxlength: 512,
    },
    contentHash: {
      type: String,
      required: false,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

directMessageAuditMongoSchema.index({ createdAt: 1 });

export const DirectMessageAuditModel = mongoose.model<IDirectMessageAudit>(
  "DirectMessageAudit",
  directMessageAuditMongoSchema
);
