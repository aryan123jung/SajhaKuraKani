import mongoose, { Document, Schema } from "mongoose";

export type PostInteractionAuditAction =
  | "comment.create"
  | "comment.update"
  | "comment.delete"
  | "comment.report"
  | "like.create"
  | "like.delete";

export interface IPostInteractionAudit extends Document {
  _id: mongoose.Types.ObjectId;
  action: PostInteractionAuditAction;
  post?: mongoose.Types.ObjectId;
  comment?: mongoose.Types.ObjectId;
  actorUserId: mongoose.Types.ObjectId;
  targetUserId: mongoose.Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  contentHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const postInteractionAuditSchema = new Schema<IPostInteractionAudit>(
  {
    action: {
      type: String,
      enum: [
        "comment.create",
        "comment.update",
        "comment.delete",
        "comment.report",
        "like.create",
        "like.delete",
      ],
      required: true,
      index: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: false,
      index: true,
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "PostComment",
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
    userAgent: {
      type: String,
      required: false,
      trim: true,
      maxlength: 512,
    },
    contentHash: {
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

postInteractionAuditSchema.index({ actorUserId: 1, createdAt: -1 });
postInteractionAuditSchema.index({ targetUserId: 1, createdAt: -1 });

export const PostInteractionAuditModel = mongoose.model<IPostInteractionAudit>(
  "PostInteractionAudit",
  postInteractionAuditSchema
);
