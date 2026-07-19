import mongoose, { Document, Schema } from "mongoose";

export interface IPostComment extends Document {
  _id: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content?: string;
  contentEncrypted?: string;
  contentHash?: string;
  duplicateFingerprint?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const postCommentSchema = new Schema<IPostComment>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: false,
      trim: true,
      maxlength: 1000,
      select: false,
    },
    contentEncrypted: {
      type: String,
      required: false,
      trim: true,
      maxlength: 4096,
    },
    contentHash: {
      type: String,
      required: false,
      trim: true,
      maxlength: 128,
      select: false,
      index: true,
    },
    duplicateFingerprint: {
      type: String,
      required: false,
      trim: true,
      maxlength: 128,
      select: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      required: false,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

postCommentSchema.index({ post: 1, createdAt: -1 });
postCommentSchema.index({ post: 1, author: 1, createdAt: -1 });
postCommentSchema.index({ author: 1, createdAt: -1 });

export const PostCommentModel = mongoose.model<IPostComment>(
  "PostComment",
  postCommentSchema
);
