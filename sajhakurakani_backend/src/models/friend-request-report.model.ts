import mongoose, { Document, Schema } from "mongoose";

export type FriendRequestReportReason =
  | "harassment"
  | "spam"
  | "impersonation"
  | "unsafe-behavior"
  | "other";

export type FriendRequestReportStatus = "open" | "reviewed" | "resolved" | "dismissed";

export interface IFriendRequestReport extends Document {
  _id: mongoose.Types.ObjectId;
  friendRequest: mongoose.Types.ObjectId;
  reporter: mongoose.Types.ObjectId;
  reportedUser: mongoose.Types.ObjectId;
  reason: FriendRequestReportReason;
  details?: string;
  status: FriendRequestReportStatus;
  createdAt: Date;
  updatedAt: Date;
}

const friendRequestReportSchema = new Schema<IFriendRequestReport>(
  {
    friendRequest: {
      type: Schema.Types.ObjectId,
      ref: "FriendRequest",
      required: true,
      index: true,
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reportedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ["harassment", "spam", "impersonation", "unsafe-behavior", "other"],
      required: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: 500,
      required: false,
    },
    status: {
      type: String,
      enum: ["open", "reviewed", "resolved", "dismissed"],
      default: "open",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

friendRequestReportSchema.index(
  { friendRequest: 1, reporter: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "open" },
  }
);

export const FriendRequestReportModel = mongoose.model<IFriendRequestReport>(
  "FriendRequestReport",
  friendRequestReportSchema
);
