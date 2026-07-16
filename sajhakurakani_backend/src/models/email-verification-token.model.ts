import mongoose, { Document, Schema } from "mongoose";

export interface IEmailVerificationToken extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  requestedIpHash?: string;
  requestedUserAgent?: string;
  usedAt?: Date;
  usedIpHash?: string;
  usedUserAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const emailVerificationTokenSchema = new Schema<IEmailVerificationToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    requestedIpHash: {
      type: String,
      required: false,
      maxlength: 128,
    },
    requestedUserAgent: {
      type: String,
      required: false,
      maxlength: 512,
    },
    usedAt: {
      type: Date,
      required: false,
    },
    usedIpHash: {
      type: String,
      required: false,
      maxlength: 128,
    },
    usedUserAgent: {
      type: String,
      required: false,
      maxlength: 512,
    },
  },
  {
    timestamps: true,
  }
);

emailVerificationTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 }
);

export const EmailVerificationTokenModel = mongoose.model<IEmailVerificationToken>(
  "EmailVerificationToken",
  emailVerificationTokenSchema
);
