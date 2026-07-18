import mongoose, { Document, Schema } from "mongoose";

export type PostReportReason =
  | "spam"
  | "hate-speech"
  | "harassment"
  | "nsfw"
  | "misinformation"
  | "self-harm"
  | "other";

export type PostReportStatus = "open" | "reviewed" | "resolved" | "dismissed";

export interface IPostReport extends Document {
  _id: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  reporter: mongoose.Types.ObjectId;
  reason: PostReportReason;
  details?: string;
  status: PostReportStatus;
  createdAt: Date;
  updatedAt: Date;
}

const postReportSchema = new Schema<IPostReport>(
  {
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

postReportSchema.index(
  { post: 1, reporter: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "open" },
  }
);

export const PostReportModel = mongoose.model<IPostReport>(
  "PostReport",
  postReportSchema
);
