import { CreateUserDto, LoginUserDto, UpdateUserDto } from "../dtos/user.dtos";
import bcryptjs from "bcryptjs";
import { UserRepository } from "../repositories/user.repository";
import jwt from "jsonwebtoken";
import {
  AUTH_LOCK_WINDOW_MS,
  AUTH_MAX_FAILED_ATTEMPTS,
  CLIENT_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  JWT_AUDIENCE,
  JWT_EXPIRES_IN,
  JWT_ISSUER,
  JWT_SECRET,
  TOTP_ISSUER,
} from "../configs";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { HttpError } from "../errors/http-error";
import { sendEmail } from "../configs/email";
import { IUser } from "../models/user.model";
import { decryptText, encryptText } from "../utils/crypto.util";
import { consumeOAuthState, createOAuthState } from "../utils/oauth.util";
import { generateOtpAuthUrl, generateTotpSecret, verifyTotpCode } from "../utils/totp.util";

const userRepository = new UserRepository();
const PASSWORD_HASH_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH =
  "$2b$12$tHmPxQF95C4C82Bbfkvtn.9zTzD/rif7Yi4Ee0Q5T3dJv3ikm/xmC";

type GoogleTokenResponse = {
  access_token: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

type GoogleUserProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
};

const sanitizeUser = (user: IUser) => {
  const userObject = user.toObject();
  delete userObject.password;
  delete userObject.failedLoginAttempts;
  delete userObject.lockUntil;
  delete userObject.passwordChangedAt;
  delete userObject.resetPasswordTokenHash;
  delete userObject.resetPasswordExpiresAt;
  return userObject;
};

const hashPassword = async (password: string) => {
  return bcryptjs.hash(password, PASSWORD_HASH_ROUNDS);
};

const createResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeUsername = (username: string) => username.trim().toLowerCase();
const normalizeNamePart = (value: string | undefined, fallback: string) =>
  value?.trim().slice(0, 50) || fallback;
const randomPassword = () => crypto.randomBytes(24).toString("base64url");
const buildGoogleAuthUrl = (state: string) => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export class UserService {
  private createJwtForUser(user: IUser) {
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      subject: user._id.toString(),
    });
  }

  private async registerFailedAuthAttempt(user: IUser) {
    const failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    const isLocked = failedLoginAttempts >= AUTH_MAX_FAILED_ATTEMPTS;

    await userRepository.updateUser(user._id.toString(), {
      failedLoginAttempts,
      lockUntil: isLocked ? new Date(Date.now() + AUTH_LOCK_WINDOW_MS) : undefined,
    });

    if (isLocked) {
      throw new HttpError(423, "Account temporarily locked due to too many failed login attempts");
    }

    throw new HttpError(401, "Invalid email or password");
  }

  private async clearFailedAuthAttempts(user: IUser) {
    await userRepository.updateUser(user._id.toString(), {
      failedLoginAttempts: 0,
      lockUntil: undefined,
    });
  }

  private async ensureGoogleOAuthConfigured() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      throw new HttpError(500, "Google OAuth is not configured on the server");
    }
  }

  private async exchangeGoogleCodeForAccessToken(code: string): Promise<GoogleTokenResponse> {
    await this.ensureGoogleOAuthConfigured();

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!response.ok) {
      throw new HttpError(401, "Google OAuth code exchange failed");
    }

    return response.json() as Promise<GoogleTokenResponse>;
  }

  private async fetchGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new HttpError(401, "Failed to fetch Google user profile");
    }

    return response.json() as Promise<GoogleUserProfile>;
  }

  private async createUniqueUsername(baseUsername: string) {
    const normalizedBase = normalizeUsername(baseUsername).replace(/[^a-z0-9_.-]/g, "") || "user";
    let candidate = normalizedBase.slice(0, 24);
    let suffix = 0;

    while (await userRepository.getUserByUsername(candidate)) {
      suffix += 1;
      candidate = `${normalizedBase.slice(0, Math.max(3, 24 - String(suffix).length - 1))}_${suffix}`;
    }

    return candidate;
  }

  private async findOrCreateGoogleUser(profile: GoogleUserProfile) {
    if (!profile.email_verified) {
      throw new HttpError(401, "Google account email must be verified");
    }

    const normalizedEmail = normalizeEmail(profile.email);
    const linkedUser = await userRepository.getUserByOAuth("google", profile.sub, true);
    if (linkedUser) {
      return linkedUser;
    }

    const existingUser = await userRepository.getUserByEmail(normalizedEmail, true);
    if (existingUser) {
      if (existingUser.oauthProvider && existingUser.oauthSubject !== profile.sub) {
        throw new HttpError(409, "This email is already linked to another OAuth identity");
      }

      await userRepository.updateUser(existingUser._id.toString(), {
        oauthProvider: "google",
        oauthSubject: profile.sub,
      });

      const refreshedUser = await userRepository.getUserById(existingUser._id.toString(), true);
      if (!refreshedUser) {
        throw new HttpError(404, "User not found");
      }
      return refreshedUser;
    }

    const emailLocalPart = normalizedEmail.split("@")[0] || "user";
    const username = await this.createUniqueUsername(emailLocalPart);
    const newUser = await userRepository.createUser({
      firstName: normalizeNamePart(profile.given_name, "Google"),
      lastName: normalizeNamePart(profile.family_name, "User"),
      email: normalizedEmail,
      username,
      password: await hashPassword(randomPassword()),
      role: "user",
      oauthProvider: "google",
      oauthSubject: profile.sub,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      totpEnabled: false,
    });

    const createdUser = await userRepository.getUserById(newUser._id.toString(), true);
    if (!createdUser) {
      throw new HttpError(500, "Failed to create OAuth user");
    }

    return createdUser;
  }

  async registerUser(userData: CreateUserDto) {
    const normalizedEmail = normalizeEmail(userData.email);
    const normalizedUsername = normalizeUsername(userData.username);

    const checkEmail = await userRepository.getUserByEmail(normalizedEmail);
    if (checkEmail) {
      throw new HttpError(409, "Email already in use");
    }

    const checkUsername = await userRepository.getUserByUsername(normalizedUsername);
    if (checkUsername) {
      throw new HttpError(409, "Username already in use");
    }

    const { confirmPassword, ...userToSave } = userData;

    userToSave.email = normalizedEmail;
    userToSave.username = normalizedUsername;
    userToSave.password = await hashPassword(userToSave.password);

    const newUser = await userRepository.createUser({
      ...userToSave,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
    });

    return sanitizeUser(newUser);
  }

  async loginUser(loginData: LoginUserDto) {
    const normalizedEmail = normalizeEmail(loginData.email);
    const user = await userRepository.getUserByEmail(normalizedEmail, true);

    if (!user) {
      await bcryptjs.compare(loginData.password, DUMMY_PASSWORD_HASH);
      throw new HttpError(401, "Invalid email or password");
    }

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      throw new HttpError(423, "Account temporarily locked due to too many failed login attempts");
    }

    const validPassword = await bcryptjs.compare(loginData.password, user.password);

    if (!validPassword) {
      await this.registerFailedAuthAttempt(user);
    }

    if (user.totpEnabled) {
      if (!loginData.totpCode || !user.totpSecretEncrypted) {
        throw new HttpError(401, "TOTP code is required");
      }

      const decryptedSecret = decryptText(user.totpSecretEncrypted);
      if (!verifyTotpCode(decryptedSecret, loginData.totpCode)) {
        await this.registerFailedAuthAttempt(user);
      }
    }

    await this.clearFailedAuthAttempts(user);

    return { token: this.createJwtForUser(user), user: sanitizeUser(user) };
  }

  async getGoogleOAuthUrl() {
    await this.ensureGoogleOAuthConfigured();
    const state = createOAuthState();
    return {
      state,
      authorizationUrl: buildGoogleAuthUrl(state),
    };
  }

  async loginWithGoogleOAuth(code: string, state: string) {
    if (!consumeOAuthState(state)) {
      throw new HttpError(401, "Invalid or expired OAuth state");
    }

    const tokenResponse = await this.exchangeGoogleCodeForAccessToken(code);
    const googleProfile = await this.fetchGoogleUserProfile(tokenResponse.access_token);
    const user = await this.findOrCreateGoogleUser(googleProfile);

    return {
      token: this.createJwtForUser(user),
      user: sanitizeUser(user),
    };
  }

  async getUserById(userId: string) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new HttpError(404, "User not found");
    }
    return sanitizeUser(user);
  }

  async searchUsersForUser(currentUserId: string, page?: string, size?: string, search?: string) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const pageSize = size ? parseInt(size, 10) : 10;

    const { users, total } = await userRepository.searchUsersForUser(
      currentUserId,
      pageNumber,
      pageSize,
      search?.trim()
    );

    const pagination = {
      page: pageNumber,
      size: pageSize,
      totalUsers: total,
      totalPages: Math.ceil(total / pageSize),
    };

    return { users, pagination };
  }

  async updateUser(
    userId: string,
    data: UpdateUserDto,
    files?: {
      profileUrl?: Express.Multer.File[];
      coverUrl?: Express.Multer.File[];
    }
  ) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new HttpError(404, "User not found");
    }

    const updatePayload: UpdateUserDto = { ...data };

    if (files?.profileUrl?.[0]) {
      if (user.profileUrl) {
        const oldPath = path.resolve(process.cwd(), "uploads/profile", user.profileUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      updatePayload.profileUrl = files.profileUrl[0].filename;
    }

    if (files?.coverUrl?.[0]) {
      if (user.coverUrl) {
        const oldPath = path.resolve(process.cwd(), "uploads/cover", user.coverUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      updatePayload.coverUrl = files.coverUrl[0].filename;
    }

    if (updatePayload.email) {
      updatePayload.email = normalizeEmail(updatePayload.email);
      if (user.email !== updatePayload.email) {
        const checkEmail = await userRepository.getUserByEmail(updatePayload.email);
        if (checkEmail) {
          throw new HttpError(409, "Email already in use");
        }
      }
    }

    if (updatePayload.username) {
      updatePayload.username = normalizeUsername(updatePayload.username);
      if (user.username !== updatePayload.username) {
        const checkUsername = await userRepository.getUserByUsername(updatePayload.username);
        if (checkUsername) {
          throw new HttpError(409, "Username already in use");
        }
      }
    }

    const updatedUser = await userRepository.updateUser(userId, updatePayload);
    if (!updatedUser) {
      throw new HttpError(404, "User not found");
    }

    return sanitizeUser(updatedUser);
  }

  async sendResetPasswordEmail(email?: string) {
    if (!email) {
      throw new HttpError(400, "Email is required");
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await userRepository.getUserByEmail(normalizedEmail, true);

    if (!user) {
      return;
    }

    const { rawToken, tokenHash } = createResetToken();
    const resetLink = `${CLIENT_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;

    await userRepository.updateUser(user._id.toString(), {
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
    });

    const html = `
      <p>You requested a password reset for SajhaKuraKani.</p>
      <p>Open this link to reset your password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link expires in 1 hour and can only be used once.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `;

    const text = `Reset your password with this one-time link (expires in 1 hour): ${resetLink}`;

    await sendEmail(user.email, "Password Reset", html, text);
  }

  async resetPassword(token?: string, newPassword?: string) {
    if (!token || !newPassword) {
      throw new HttpError(400, "Token and new password are required");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await userRepository.getUserByResetPasswordTokenHash(tokenHash);

    if (!user || !user.resetPasswordExpiresAt || user.resetPasswordExpiresAt.getTime() < Date.now()) {
      throw new HttpError(400, "Invalid or expired token");
    }

    const passwordMatchesExisting = await bcryptjs.compare(newPassword, user.password);
    if (passwordMatchesExisting) {
      throw new HttpError(400, "New password must be different from the current password");
    }

    const hashedPassword = await hashPassword(newPassword);
    await userRepository.updateUser(user._id.toString(), {
      password: hashedPassword,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockUntil: undefined,
      resetPasswordTokenHash: undefined,
      resetPasswordExpiresAt: undefined,
    });
  }

  async startTotpSetup(userId: string) {
    const user = await userRepository.getUserById(userId, true);
    if (!user) {
      throw new HttpError(404, "User not found");
    }

    const secret = generateTotpSecret();
    const encryptedSecret = encryptText(secret);

    await userRepository.updateUser(userId, {
      totpTempSecretEncrypted: encryptedSecret,
    });

    return {
      manualEntryKey: secret,
      otpAuthUrl: generateOtpAuthUrl(TOTP_ISSUER, user.email, secret),
    };
  }

  async enableTotp(userId: string, code: string) {
    const user = await userRepository.getUserById(userId, true);
    if (!user || !user.totpTempSecretEncrypted) {
      throw new HttpError(400, "No pending TOTP setup was found");
    }

    const secret = decryptText(user.totpTempSecretEncrypted);
    if (!verifyTotpCode(secret, code)) {
      throw new HttpError(400, "Invalid TOTP code");
    }

    await userRepository.updateUser(userId, {
      totpEnabled: true,
      totpSecretEncrypted: user.totpTempSecretEncrypted,
      totpTempSecretEncrypted: undefined,
    });

    return true;
  }

  async disableTotp(userId: string, code: string) {
    const user = await userRepository.getUserById(userId, true);
    if (!user || !user.totpEnabled || !user.totpSecretEncrypted) {
      throw new HttpError(400, "TOTP is not enabled for this account");
    }

    const secret = decryptText(user.totpSecretEncrypted);
    if (!verifyTotpCode(secret, code)) {
      throw new HttpError(400, "Invalid TOTP code");
    }

    await userRepository.updateUser(userId, {
      totpEnabled: false,
      totpSecretEncrypted: undefined,
      totpTempSecretEncrypted: undefined,
    });

    return true;
  }
}
