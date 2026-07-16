import {
  EmailVerificationTokenModel,
  type IEmailVerificationToken,
} from "../models/email-verification-token.model";

export class EmailVerificationTokenRepository {
  async createToken(data: Partial<IEmailVerificationToken>) {
    const token = new EmailVerificationTokenModel(data);
    await token.save();
    return token;
  }

  async getTokenByHash(tokenHash: string) {
    return EmailVerificationTokenModel.findOne({ tokenHash });
  }

  async invalidateActiveTokensForUser(userId: string) {
    await EmailVerificationTokenModel.updateMany(
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
    return EmailVerificationTokenModel.findByIdAndUpdate(
      tokenId,
      {
        usedAt: new Date(),
        usedIpHash,
        usedUserAgent,
      },
      { new: true }
    );
  }
}
