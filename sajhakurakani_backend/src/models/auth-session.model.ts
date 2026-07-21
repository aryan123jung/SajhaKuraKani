import mongoose, { Document, Schema } from "mongoose";

export interface IAuthSession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  expiresAt: Date;
  createdIpHash?: string;
  lastIpHash?: string;
  userAgent?: string;
  lastUsedAt?: Date;
  revokedAt?: Date;
  revokedReason?: string;
  sessionScope: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

const authSessionSchema = new Schema<IAuthSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    createdIpHash: {
      type: String,
      required: false,
      maxlength: 128,
    },
    lastIpHash: {
      type: String,
      required: false,
      maxlength: 128,
    },
    userAgent: {
      type: String,
      required: false,
      maxlength: 512,
    },
    lastUsedAt: {
      type: Date,
      required: false,
    },
    revokedAt: {
      type: Date,
      required: false,
    },
    revokedReason: {
      type: String,
      required: false,
      maxlength: 120,
    },
    sessionScope: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthSessionModel = mongoose.model<IAuthSession>(
  "AuthSession",
  authSessionSchema
);
