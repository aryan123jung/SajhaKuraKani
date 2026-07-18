import mongoose, { Document, Schema } from "mongoose";

export type PostVisibility =
  | "public"
  | "private"
  | "friends-only";
export type PostMediaType = "image" | "video";
export type PostInteractionPrivacy =
  | "everyone"
  | "friends-only"
  | "no-one";

export interface IPostMedia {
  url: string;
  type: PostMediaType;
  mimeType: string;
}

export interface IPost extends Document {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  title?: string;
  content?: string;
  titleEncrypted?: string;
  contentEncrypted?: string;
  contentHash?: string;
  duplicateFingerprint?: string;
  visibility: PostVisibility;
  commentPrivacy: PostInteractionPrivacy;
  sharePrivacy: PostInteractionPrivacy;
  media: IPostMedia[];
  createdAt: Date;
  updatedAt: Date;
}

const postMediaSchema = new Schema<IPostMedia>(
  {
    url: { type: String, required: true, trim: true, maxlength: 255 },
    type: { type: String, enum: ["image", "video"], required: true },
    mimeType: { type: String, required: true, trim: true, maxlength: 120 },
  },
  { _id: false }
);

const postSchema = new Schema<IPost>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: false,
      trim: true,
      maxlength: 140,
      select: false,
    },
    content: {
      type: String,
      required: false,
      trim: true,
      maxlength: 5000,
      select: false,
    },
    titleEncrypted: {
      type: String,
      required: false,
      trim: true,
      maxlength: 512,
    },
    contentEncrypted: {
      type: String,
      required: false,
      trim: true,
      maxlength: 8192,
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
    visibility: {
      type: String,
      enum: ["public", "private", "friends-only"],
      default: "public",
      index: true,
    },
    commentPrivacy: {
      type: String,
      enum: ["everyone", "friends-only", "no-one"],
      default: "everyone",
    },
    sharePrivacy: {
      type: String,
      enum: ["everyone", "friends-only", "no-one"],
      default: "everyone",
    },
    media: {
      type: [postMediaSchema],
      default: [],
      validate: {
        validator: (value: IPostMedia[]) => value.length <= 4,
        message: "A post can include up to 4 media files",
      },
    },
  },
  {
    timestamps: true,
  }
);

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ author: 1, duplicateFingerprint: 1, createdAt: -1 });

export const PostModel = mongoose.model<IPost>("Post", postSchema);
