import { PasswordResetTokenModel, type IPasswordResetToken } from "../models/password-reset-token.model";

export class PasswordResetTokenRepository {
  async createToken(data: Partial<IPasswordResetToken>) {
    const token = new PasswordResetTokenModel(data);
    await token.save();
    return token;
  }

  async getTokenByHash(tokenHash: string) {
    return PasswordResetTokenModel.findOne({ tokenHash });
  }

  async invalidateActiveTokensForUser(userId: string) {
    await PasswordResetTokenModel.updateMany(
      {
        userId,
        usedAt: { $exists: false },
      },
      {
        $set: {
          usedAt: new Date(),
        },
      }
    );
  }

  async markTokenUsed(
    tokenId: string,
    usedIpHash?: string,
    usedUserAgent?: string
  ) {
    return PasswordResetTokenModel.findByIdAndUpdate(
      tokenId,
      {
        usedAt: new Date(),
        usedIpHash,
        usedUserAgent,
      },
      { returnDocument: "after" }
    );
  }
}
