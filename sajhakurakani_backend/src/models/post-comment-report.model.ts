import mongoose, { Document, Schema } from "mongoose";

export type PostCommentReportReason =
  | "spam"
  | "hate-speech"
  | "harassment"
  | "nsfw"
  | "misinformation"
  | "self-harm"
  | "other";

export type PostCommentReportStatus =
  | "open"
  | "reviewed"
  | "resolved"
  | "dismissed";

export interface IPostCommentReport extends Document {
  _id: mongoose.Types.ObjectId;
  comment: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  reporter: mongoose.Types.ObjectId;
  reason: PostCommentReportReason;
  details?: string;
  status: PostCommentReportStatus;
  createdAt: Date;
  updatedAt: Date;
}

const postCommentReportSchema = new Schema<IPostCommentReport>(
  {
    comment: {
      type: Schema.Types.ObjectId,
      ref: "PostComment",
      required: true,
      index: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: [
        "spam",
        "hate-speech",
        "harassment",
        "nsfw",
        "misinformation",
        "self-harm",
        "other",
      ],
      required: true,
    },
    details: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
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

postCommentReportSchema.index(
  { comment: 1, reporter: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "open" },
  }
);

export const PostCommentReportModel = mongoose.model<IPostCommentReport>(
  "PostCommentReport",
  postCommentReportSchema
);
