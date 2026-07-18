import mongoose, { Document, Schema } from "mongoose";

export type FriendRequestAuditAction =
  | "sent"
  | "accepted"
  | "declined"
  | "cancelled"
  | "blocked";

export interface IFriendRequestAudit extends Document {
  _id: mongoose.Types.ObjectId;
  action: FriendRequestAuditAction;
  friendRequest?: mongoose.Types.ObjectId;
  actorUserId: mongoose.Types.ObjectId;
  targetUserId: mongoose.Types.ObjectId;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const friendRequestAuditSchema = new Schema<IFriendRequestAudit>(
  {
    action: {
      type: String,
      enum: ["sent", "accepted", "declined", "cancelled", "blocked"],
      required: true,
      index: true,
    },
    friendRequest: {
      type: Schema.Types.ObjectId,
      ref: "FriendRequest",
      required: false,
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
    ipAddress: {
      type: String,
      required: false,
      trim: true,
      maxlength: 128,
    },
  },
  {
    timestamps: true,
  }
);

friendRequestAuditSchema.index({ actorUserId: 1, createdAt: -1 });
friendRequestAuditSchema.index({ targetUserId: 1, createdAt: -1 });

export const FriendRequestAuditModel = mongoose.model<IFriendRequestAudit>(
  "FriendRequestAudit",
  friendRequestAuditSchema
);
