import {
  CreateUserDto,
  FriendOverviewQueryDto,
  LoginUserDto,
  SendFriendRequestDto,
  UpdateUserDto,
} from "../dtos/user.dtos";
import bcryptjs from "bcryptjs";
import { UserRepository } from "../repositories/user.repository";
import jwt from "jsonwebtoken";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  AUTH_LOCK_WINDOW_MS,
  AUTH_MAX_FAILED_ATTEMPTS,
  CLIENT_URL,
  EMAIL_VERIFICATION_TOKEN_EXPIRY_MS,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_ISSUER,
  JWT_PRIVATE_KEY,
  JWT_PUBLIC_KEY,
  REFRESH_TOKEN_EXPIRES_IN,
  RESET_PASSWORD_ENFORCE_IP_MATCH,
  RESET_TOKEN_EXPIRY_MS,
  TOTP_ISSUER,
} from "../configs";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import mongoose from "mongoose";
import { HttpError } from "../errors/http-error";
import { sendEmail } from "../configs/email";
import { FriendRequestModel } from "../models/friend-request.model";
import { IUser, UserModel } from "../models/user.model";
import { AuthSessionRepository } from "../repositories/auth-session.repository";
import { EmailVerificationTokenRepository } from "../repositories/email-verification-token.repository";
import { PasswordResetTokenRepository } from "../repositories/password-reset-token.repository";
import { LoginDefenseSecurity } from "../security/login-defense.security";
import { decryptText, encryptText } from "../utils/crypto.util";
import { consumeOAuthState, createOAuthState } from "../utils/oauth.util";
import { generateOtpAuthUrl, generateTotpSecret, verifyTotpCode } from "../utils/totp.util";

const userRepository = new UserRepository();
const authSessionRepository = new AuthSessionRepository();
const emailVerificationTokenRepository = new EmailVerificationTokenRepository();
const passwordResetTokenRepository = new PasswordResetTokenRepository();
const loginDefenseSecurity = new LoginDefenseSecurity();
const PASSWORD_HASH_ROUNDS = 12;
const PASSWORD_TOTP_CHALLENGE_EXPIRES_IN = "5m";
const PASSWORD_TOTP_CHALLENGE_TYPE = "password_login_totp";
const GOOGLE_TOTP_CHALLENGE_EXPIRES_IN = "10m";
const GOOGLE_TOTP_CHALLENGE_TYPE = "google_oauth_totp";
const DUMMY_PASSWORD_HASH =
  "$2b$12$tHmPxQF95C4C82Bbfkvtn.9zTzD/rif7Yi4Ee0Q5T3dJv3ikm/xmC";
const GENERIC_LOGIN_FAILURE_MESSAGE = "The credential you entered is incorrect.";
const ACCOUNT_LOCKED_MESSAGE = "Too many sign-in attempts. Try again later.";
const IP_BLOCKED_MESSAGE = "Too many sign-in attempts from this network. Try again later.";
const EMAIL_VERIFICATION_REQUIRED_MESSAGE = "Verify email first";
const FRIEND_REQUEST_ALREADY_SENT_MESSAGE = "A friend request has already been sent.";
const FRIEND_REQUEST_ALREADY_RECEIVED_MESSAGE =
  "This user already sent you a friend request.";
const ALREADY_FRIENDS_MESSAGE = "You are already connected as friends.";

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

interface TotpChallengePayload extends jwt.JwtPayload {
  id: string;
  tokenType: string;
}

interface SessionTokenPayload extends jwt.JwtPayload {
  id: string;
  sid: string;
  tokenType: "access" | "refresh";
}

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

const FRIEND_PROFILE_SELECT =
  "firstName lastName username profileUrl coverUrl createdAt updatedAt";

const toFriendProfile = (user: Partial<IUser> & { _id: mongoose.Types.ObjectId | string }) => ({
  id: user._id.toString(),
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  username: user.username || "",
  profileUrl: user.profileUrl || null,
});

const hashPassword = async (password: string) => {
  return bcryptjs.hash(password, PASSWORD_HASH_ROUNDS);
};

const createResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
};
const hashSessionToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");
const hashResetMetadata = (value?: string) =>
  value ? crypto.createHash("sha256").update(value).digest("hex") : undefined;
const truncateUserAgent = (value?: string) => value?.slice(0, 512);

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeUsername = (username: string) => username.trim().toLowerCase();
const normalizeNamePart = (value: string | undefined, fallback: string) =>
  value?.trim().slice(0, 50) || fallback;
const randomPassword = () => crypto.randomBytes(24).toString("base64url");
const createFriendPairKey = (firstUserId: string, secondUserId: string) =>
  [firstUserId, secondUserId].sort().join(":");
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

const resolveExpiryDate = (expiresIn: string) => {
  const match = expiresIn.trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    return new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  }

  const [, rawAmount, unit] = match;
  const amount = Number(rawAmount);
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + amount * multipliers[unit.toLowerCase()]);
};

export class UserService {
  async backfillEmailVerificationState() {
    return userRepository.backfillEmailVerificationState();
  }

  private logSecurityEvent(event: string, details: Record<string, unknown>) {
    console.info(
      JSON.stringify({
        level: "info",
        category: "security",
        event,
        timestamp: new Date().toISOString(),
        ...details,
      })
    );
  }

  private async getPendingFriendRequestForActor(
    requestId: string,
    actorUserId: string,
    actorRole: "sender" | "recipient"
  ) {
    const ownershipField = actorRole === "sender" ? "sender" : "recipient";

    const request = await FriendRequestModel.findOne({
      _id: requestId,
      status: "pending",
      // access control
      [ownershipField]: actorUserId,
    });

    if (!request) {
      throw new HttpError(404, "Friend request not found");
    }

    return request;
  }

  private createAccessTokenForUser(user: IUser, sessionId: string) {
    if (!JWT_PRIVATE_KEY) {
      throw new HttpError(500, "JWT private key is not configured on the server");
    }

    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      sid: sessionId,
      tokenType: "access" as const,
    };

    return jwt.sign(payload, JWT_PRIVATE_KEY, {
      algorithm: JWT_ALGORITHM,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      subject: user._id.toString(),
    });
  }

  private createRefreshTokenForUser(user: IUser, sessionId: string) {
    if (!JWT_PRIVATE_KEY) {
      throw new HttpError(500, "JWT private key is not configured on the server");
    }

    return jwt.sign(
      {
        id: user._id.toString(),
        sid: sessionId,
        tokenType: "refresh" as const,
      },
      JWT_PRIVATE_KEY,
      {
        algorithm: JWT_ALGORITHM,
        expiresIn: REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions["expiresIn"],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        subject: user._id.toString(),
      }
    );
  }

  private verifySessionToken(
    token: string,
    expectedTokenType: "access" | "refresh",
    invalidMessage: string
  ) {
    let decodedToken: SessionTokenPayload;

    if (!JWT_PUBLIC_KEY) {
      throw new HttpError(500, "JWT public key is not configured on the server");
    }

    try {
      decodedToken = jwt.verify(token, JWT_PUBLIC_KEY, {
        algorithms: [JWT_ALGORITHM],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }) as SessionTokenPayload;
    } catch {
      throw new HttpError(401, `${invalidMessage} is invalid or expired`);
    }

    if (
      !decodedToken.id ||
      !decodedToken.sid ||
      decodedToken.tokenType !== expectedTokenType
    ) {
      throw new HttpError(401, `${invalidMessage} is invalid`);
    }

    return decodedToken;
  }

  private async createAuthSession(
    user: IUser,
    requestIp?: string,
    userAgent?: string
  ) {
    const sessionId = new mongoose.Types.ObjectId();
    const refreshToken = this.createRefreshTokenForUser(user, sessionId.toString());
    const refreshTokenHash = hashSessionToken(refreshToken);
    const ipHash = hashResetMetadata(requestIp);
    const sanitizedUserAgent = truncateUserAgent(userAgent);

    // session management
    await authSessionRepository.createSession(sessionId, {
      userId: user._id,
      refreshTokenHash,
      expiresAt: resolveExpiryDate(REFRESH_TOKEN_EXPIRES_IN),
      createdIpHash: ipHash,
      lastIpHash: ipHash,
      userAgent: sanitizedUserAgent,
      lastUsedAt: new Date(),
    });

    return {
      accessToken: this.createAccessTokenForUser(user, sessionId.toString()),
      refreshToken,
      sessionId: sessionId.toString(),
    };
  }

  private async rotateSessionTokens(
    user: IUser,
    sessionId: string,
    requestIp?: string,
    userAgent?: string
  ) {
    const refreshToken = this.createRefreshTokenForUser(user, sessionId);
    const refreshTokenHash = hashSessionToken(refreshToken);

    // refresh token rotation
    await authSessionRepository.rotateRefreshToken(
      sessionId,
      refreshTokenHash,
      resolveExpiryDate(REFRESH_TOKEN_EXPIRES_IN),
      hashResetMetadata(requestIp),
      truncateUserAgent(userAgent)
    );

    return {
      accessToken: this.createAccessTokenForUser(user, sessionId),
      refreshToken,
      sessionId,
    };
  }

  private async registerFailedAuthAttempt(
    user: IUser,
    requestIp?: string,
    failureMessage = GENERIC_LOGIN_FAILURE_MESSAGE
  ) {
    const failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    const isLocked = failedLoginAttempts >= AUTH_MAX_FAILED_ATTEMPTS;
    const ipReputation = await loginDefenseSecurity.recordFailedAttempt(
      requestIp,
      user.email
    );

    await userRepository.updateUser(user._id.toString(), {
      failedLoginAttempts,
      lockUntil: isLocked ? new Date(Date.now() + AUTH_LOCK_WINDOW_MS) : undefined,
    });

    if (ipReputation.blocked) {
      // ip reputation
      this.logSecurityEvent("ip_reputation_blocked", {
        ipAddress: requestIp,
        failureCount: ipReputation.failureCount,
        targetedAccounts: ipReputation.targetedAccounts,
      });
      throw new HttpError(429, IP_BLOCKED_MESSAGE);
    }

    if (isLocked) {
      // account lockout
      this.logSecurityEvent("account_locked_after_failed_sign_in_attempts", {
        userId: user._id.toString(),
        email: user.email,
        failedLoginAttempts,
        ipAddress: requestIp,
      });
      throw new HttpError(423, ACCOUNT_LOCKED_MESSAGE);
    }

    throw new HttpError(401, failureMessage);
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

  private async sendEmailVerificationEmailToUser(
    user: IUser,
    requestIp?: string,
    userAgent?: string
  ) {
    const { rawToken, tokenHash } = createResetToken();
    const verificationLink = `${CLIENT_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;
    const requestedIpHash = hashResetMetadata(requestIp);
    const requestedUserAgent = truncateUserAgent(userAgent);

    await emailVerificationTokenRepository.invalidateActiveTokensForUser(
      user._id.toString()
    );
    await emailVerificationTokenRepository.createToken({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_EXPIRY_MS),
      requestedIpHash,
      requestedUserAgent,
    });

    const html = `
      <p>Welcome to SajhaKuraKani.</p>
      <p>Please verify your email address to activate your account:</p>
      <p><a href="${verificationLink}">${verificationLink}</a></p>
      <p>This verification link expires in 24 hours and can only be used once.</p>
      <p>If you did not create this account, you can safely ignore this email.</p>
    `;
    const text = `Verify your SajhaKuraKani account with this one-time link (expires in 24 hours): ${verificationLink}`;

    // email verification
    await sendEmail(user.email, "Verify Your Email", html, text);
    this.logSecurityEvent("email_verification_sent", {
      userId: user._id.toString(),
      email: user.email,
      requestedIpHash,
    });
  }

  private createTotpChallengeToken(
    user: IUser,
    tokenType: string,
    expiresIn: string
  ) {
    if (!JWT_PRIVATE_KEY) {
      throw new HttpError(500, "JWT private key is not configured on the server");
    }

    return jwt.sign(
      {
        id: user._id.toString(),
        tokenType,
      },
      JWT_PRIVATE_KEY,
      {
        algorithm: JWT_ALGORITHM,
        expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        subject: user._id.toString(),
      }
    );
  }

  private verifyTotpChallengeToken(
    token: string,
    expectedTokenType: string,
    invalidMessage: string
  ) {
    let decodedToken: TotpChallengePayload;

    if (!JWT_PUBLIC_KEY) {
      throw new HttpError(500, "JWT public key is not configured on the server");
    }

    try {
      decodedToken = jwt.verify(token, JWT_PUBLIC_KEY, {
        algorithms: [JWT_ALGORITHM],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }) as TotpChallengePayload;
    } catch {
      throw new HttpError(401, `${invalidMessage} is invalid or expired`);
    }

    if (
      !decodedToken.id ||
      decodedToken.tokenType !== expectedTokenType
    ) {
      throw new HttpError(401, `${invalidMessage} is invalid`);
    }

    return decodedToken;
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
        emailVerified: true,
        emailVerifiedAt: existingUser.emailVerifiedAt || new Date(),
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
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

    const createdUser = await userRepository.getUserById(newUser._id.toString(), true);
    if (!createdUser) {
      throw new HttpError(500, "Failed to create OAuth user");
    }

    return createdUser;
  }

  async registerUser(userData: CreateUserDto, requestIp?: string, userAgent?: string) {
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
      emailVerified: false,
    });

    await this.sendEmailVerificationEmailToUser(newUser, requestIp, userAgent);

    return sanitizeUser(newUser);
  }

  async loginUser(loginData: LoginUserDto, requestIp?: string, userAgent?: string) {
    const normalizedEmail = normalizeEmail(loginData.email);

    if (await loginDefenseSecurity.isIpBlocked(requestIp)) {
      // ip reputation
      throw new HttpError(429, IP_BLOCKED_MESSAGE);
    }

    const user = await userRepository.getUserByEmail(normalizedEmail, true);

    if (!user) {
      await bcryptjs.compare(loginData.password, DUMMY_PASSWORD_HASH);
      const ipReputation = await loginDefenseSecurity.recordFailedAttempt(
        requestIp,
        normalizedEmail
      );

      if (ipReputation.blocked) {
        // ip reputation
        this.logSecurityEvent("ip_reputation_blocked", {
          ipAddress: requestIp,
          failureCount: ipReputation.failureCount,
          targetedAccounts: ipReputation.targetedAccounts,
        });
        throw new HttpError(429, IP_BLOCKED_MESSAGE);
      }

      throw new HttpError(401, GENERIC_LOGIN_FAILURE_MESSAGE);
    }

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      // account lockout
      throw new HttpError(423, ACCOUNT_LOCKED_MESSAGE);
    }

    const validPassword = await bcryptjs.compare(loginData.password, user.password);

    if (!validPassword) {
      await this.registerFailedAuthAttempt(user, requestIp);
    }

    if (!user.emailVerified) {
      await this.clearFailedAuthAttempts(user);
      this.logSecurityEvent("blocked_unverified_login_attempt", {
        userId: user._id.toString(),
        email: user.email,
        ipAddress: requestIp,
      });
      throw new HttpError(403, EMAIL_VERIFICATION_REQUIRED_MESSAGE);
    }

    if (user.totpEnabled) {
      if (!user.totpSecretEncrypted) {
        throw new HttpError(400, "Two-factor authentication is not configured correctly");
      }

      return {
        requiresTotp: true as const,
        preAuthToken: this.createTotpChallengeToken(
          user,
          PASSWORD_TOTP_CHALLENGE_TYPE,
          PASSWORD_TOTP_CHALLENGE_EXPIRES_IN
        ),
        user: sanitizeUser(user),
      };
    }

    await this.clearFailedAuthAttempts(user);

    const session = await this.createAuthSession(user, requestIp, userAgent);

    return {
      requiresTotp: false as const,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: sanitizeUser(user),
    };
  }

  async getGoogleOAuthUrl() {
    await this.ensureGoogleOAuthConfigured();
    const state = createOAuthState();
    return {
      state,
      authorizationUrl: buildGoogleAuthUrl(state),
    };
  }

  async loginWithGoogleOAuth(code: string, state: string, requestIp?: string, userAgent?: string) {
    if (!consumeOAuthState(state)) {
      throw new HttpError(401, "Invalid or expired OAuth state");
    }

    const tokenResponse = await this.exchangeGoogleCodeForAccessToken(code);
    const googleProfile = await this.fetchGoogleUserProfile(tokenResponse.access_token);
    const user = await this.findOrCreateGoogleUser(googleProfile);

    if (user.totpEnabled) {
      return {
        requiresTotp: true as const,
        preAuthToken: this.createTotpChallengeToken(
          user,
          GOOGLE_TOTP_CHALLENGE_TYPE,
          GOOGLE_TOTP_CHALLENGE_EXPIRES_IN
        ),
        user: sanitizeUser(user),
      };
    }

    const session = await this.createAuthSession(user, requestIp, userAgent);

    return {
      requiresTotp: false as const,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: sanitizeUser(user),
    };
  }

  async completeGoogleTotpLogin(
    preAuthToken: string,
    code: string,
    requestIp?: string,
    userAgent?: string
  ) {
    const decodedToken = this.verifyTotpChallengeToken(
      preAuthToken,
      GOOGLE_TOTP_CHALLENGE_TYPE,
      "Google sign-in verification session"
    );
    const user = await userRepository.getUserById(decodedToken.id, true);

    if (!user) {
      throw new HttpError(404, "User not found");
    }

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      // account lockout
      throw new HttpError(423, ACCOUNT_LOCKED_MESSAGE);
    }

    if (!user.totpEnabled || !user.totpSecretEncrypted) {
      throw new HttpError(400, "Two-factor authentication is not enabled for this account");
    }

    const decryptedSecret = decryptText(user.totpSecretEncrypted);
    if (!verifyTotpCode(decryptedSecret, code)) {
      await this.registerFailedAuthAttempt(user, undefined, "Invalid TOTP code");
    }

    await this.clearFailedAuthAttempts(user);
    const session = await this.createAuthSession(user, requestIp, userAgent);

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: sanitizeUser(user),
    };
  }

  async completePasswordTotpLogin(
    preAuthToken: string,
    code: string,
    requestIp?: string,
    userAgent?: string
  ) {
    const decodedToken = this.verifyTotpChallengeToken(
      preAuthToken,
      PASSWORD_TOTP_CHALLENGE_TYPE,
      "Two-factor verification session"
    );
    const user = await userRepository.getUserById(decodedToken.id, true);

    if (!user) {
      throw new HttpError(404, "User not found");
    }

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      // account lockout
      throw new HttpError(423, ACCOUNT_LOCKED_MESSAGE);
    }

    if (!user.totpEnabled || !user.totpSecretEncrypted) {
      throw new HttpError(400, "Two-factor authentication is not enabled for this account");
    }

    const decryptedSecret = decryptText(user.totpSecretEncrypted);
    if (!verifyTotpCode(decryptedSecret, code)) {
      await this.registerFailedAuthAttempt(user, undefined, "Invalid TOTP code");
    }

    await this.clearFailedAuthAttempts(user);
    const session = await this.createAuthSession(user, requestIp, userAgent);

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: sanitizeUser(user),
    };
  }

  async refreshSession(refreshToken: string, requestIp?: string, userAgent?: string) {
    const decodedToken = this.verifySessionToken(
      refreshToken,
      "refresh",
      "Refresh token"
    );
    const session = await authSessionRepository.getActiveSessionById(decodedToken.sid);

    if (!session) {
      throw new HttpError(401, "Refresh token is invalid or expired");
    }

    if (session.userId.toString() !== decodedToken.id) {
      await authSessionRepository.revokeSession(session._id.toString(), "refresh_token_user_mismatch");
      throw new HttpError(401, "Refresh token is invalid or expired");
    }

    if (session.refreshTokenHash !== hashSessionToken(refreshToken)) {
      await authSessionRepository.revokeSession(session._id.toString(), "refresh_token_mismatch");
      throw new HttpError(401, "Refresh token is invalid or expired");
    }

    const user = await userRepository.getUserById(decodedToken.id, true);
    if (!user) {
      await authSessionRepository.revokeSession(session._id.toString(), "user_not_found");
      throw new HttpError(401, "Refresh token is invalid or expired");
    }

    if (
      user.passwordChangedAt &&
      decodedToken.iat &&
      decodedToken.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      await authSessionRepository.revokeSession(session._id.toString(), "password_changed");
      throw new HttpError(401, "Refresh token is invalid or expired");
    }

    const rotatedSession = await this.rotateSessionTokens(
      user,
      session._id.toString(),
      requestIp,
      userAgent
    );

    return {
      accessToken: rotatedSession.accessToken,
      refreshToken: rotatedSession.refreshToken,
      user: sanitizeUser(user),
    };
  }

  async listUserSessions(userId: string, currentSessionId?: string) {
    const sessions = await authSessionRepository.listActiveSessionsForUser(userId);

    return sessions.map((session) => ({
      id: session._id.toString(),
      current: session._id.toString() === currentSessionId,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt ?? session.updatedAt,
      expiresAt: session.expiresAt,
      userAgent: session.userAgent ?? "Unknown device",
    }));
  }

  async revokeCurrentSession(userId: string, currentSessionId?: string) {
    if (!currentSessionId) {
      throw new HttpError(400, "Current session could not be identified");
    }

    const session = await authSessionRepository.getActiveSessionById(currentSessionId);
    if (!session || session.userId.toString() !== userId) {
      throw new HttpError(404, "Session not found");
    }

    await authSessionRepository.revokeSession(currentSessionId, "user_logout");
  }

  async revokeSessionById(userId: string, sessionId: string, currentSessionId?: string) {
    const session = await authSessionRepository.getActiveSessionById(sessionId);
    if (!session || session.userId.toString() !== userId) {
      throw new HttpError(404, "Session not found");
    }

    if (session._id.toString() === currentSessionId) {
      throw new HttpError(400, "Use logout to revoke the current session");
    }

    await authSessionRepository.revokeSession(sessionId, "user_revoked_session");
  }

  async revokeOtherSessions(userId: string, currentSessionId?: string) {
    if (!currentSessionId) {
      throw new HttpError(400, "Current session could not be identified");
    }

    await authSessionRepository.revokeAllSessionsForUser(
      userId,
      "user_revoked_other_sessions",
      currentSessionId
    );
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

  async listFriendOverview(userId: string, query: FriendOverviewQueryDto) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
      throw new HttpError(404, "User not found");
    }

    const trimmedSearch = query.search?.trim();
    const searchRegex = trimmedSearch ? new RegExp(trimmedSearch, "i") : undefined;
    const friendIds = (user.friends || []).map((friendId) => friendId.toString());

    const friendFilter: Record<string, unknown> = {
      _id: { $in: friendIds },
      role: "user",
      emailVerified: true,
    };

    if (searchRegex) {
      friendFilter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { username: searchRegex },
      ];
    }

    const friends = friendIds.length
      ? await UserModel.find(friendFilter)
          .select(FRIEND_PROFILE_SELECT)
          .sort({ firstName: 1, lastName: 1 })
      : [];

    const incomingRequests = await FriendRequestModel.find({
      recipient: user._id,
      status: "pending",
    })
      .populate("sender", FRIEND_PROFILE_SELECT)
      .sort({ createdAt: -1 });

    const outgoingRequests = await FriendRequestModel.find({
      sender: user._id,
      status: "pending",
    })
      .populate("recipient", FRIEND_PROFILE_SELECT)
      .sort({ createdAt: -1 });

    const excludedIds = new Set<string>([userId, ...friendIds]);

    incomingRequests.forEach((request) => {
      const sender = request.sender as unknown as IUser;
      excludedIds.add(sender._id.toString());
    });
    outgoingRequests.forEach((request) => {
      const recipient = request.recipient as unknown as IUser;
      excludedIds.add(recipient._id.toString());
    });

    const discoverFilter: Record<string, unknown> = {
      _id: { $nin: Array.from(excludedIds) },
      role: "user",
      emailVerified: true,
    };

    if (searchRegex) {
      discoverFilter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { username: searchRegex },
      ];
    }

    const discoverUsers = await UserModel.find(discoverFilter)
      .select(FRIEND_PROFILE_SELECT)
      .sort({ createdAt: -1 })
      .limit(trimmedSearch ? 12 : 8);

    return {
      friends: friends.map((friend) => toFriendProfile(friend)),
      incomingRequests: incomingRequests.map((request) => ({
        id: request._id.toString(),
        createdAt: request.createdAt,
        user: toFriendProfile(request.sender as unknown as IUser),
      })),
      outgoingRequests: outgoingRequests.map((request) => ({
        id: request._id.toString(),
        createdAt: request.createdAt,
        user: toFriendProfile(request.recipient as unknown as IUser),
      })),
      discoverUsers: discoverUsers.map((discoverUser) => toFriendProfile(discoverUser)),
    };
  }

  async sendFriendRequest(userId: string, payload: SendFriendRequestDto) {
    if (userId === payload.recipientUserId) {
      throw new HttpError(400, "You cannot send a friend request to yourself");
    }

    const [sender, recipient] = await Promise.all([
      userRepository.getUserById(userId),
      userRepository.getUserById(payload.recipientUserId),
    ]);

    if (!sender || !recipient || recipient.role !== "user" || !recipient.emailVerified) {
      throw new HttpError(404, "User not found");
    }

    const senderFriendIds = (sender.friends || []).map((friendId) => friendId.toString());
    if (senderFriendIds.includes(recipient._id.toString())) {
      throw new HttpError(409, ALREADY_FRIENDS_MESSAGE);
    }

    const pairKey = createFriendPairKey(userId, recipient._id.toString());
    const existingRequest = await FriendRequestModel.findOne({ pairKey });

    if (existingRequest?.status === "pending") {
      if (existingRequest.sender.toString() === userId) {
        throw new HttpError(409, FRIEND_REQUEST_ALREADY_SENT_MESSAGE);
      }

      throw new HttpError(409, FRIEND_REQUEST_ALREADY_RECEIVED_MESSAGE);
    }

    if (
      existingRequest?.status === "accepted" &&
      senderFriendIds.includes(recipient._id.toString())
    ) {
      throw new HttpError(409, ALREADY_FRIENDS_MESSAGE);
    }

    if (existingRequest) {
      existingRequest.sender = sender._id;
      existingRequest.recipient = recipient._id;
      existingRequest.status = "pending";
      existingRequest.respondedAt = undefined;
      await existingRequest.save();
    } else {
      await FriendRequestModel.create({
        sender: sender._id,
        recipient: recipient._id,
        pairKey,
        status: "pending",
      });
    }

    this.logSecurityEvent("friend_request_sent", {
      senderUserId: userId,
      recipientUserId: recipient._id.toString(),
    });
  }

  async acceptFriendRequest(userId: string, requestId: string) {
    const request = await this.getPendingFriendRequestForActor(
      requestId,
      userId,
      "recipient"
    );

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // access control
        await UserModel.updateOne(
          { _id: request.sender },
          { $addToSet: { friends: request.recipient } },
          { session }
        );
        await UserModel.updateOne(
          { _id: request.recipient },
          { $addToSet: { friends: request.sender } },
          { session }
        );
        await FriendRequestModel.updateOne(
          { _id: request._id },
          { status: "accepted", respondedAt: new Date() },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    this.logSecurityEvent("friend_request_accepted", {
      requestId,
      recipientUserId: userId,
      senderUserId: request.sender.toString(),
    });
  }

  async rejectFriendRequest(userId: string, requestId: string) {
    const request = await this.getPendingFriendRequestForActor(
      requestId,
      userId,
      "recipient"
    );

    request.status = "rejected";
    request.respondedAt = new Date();
    await request.save();

    this.logSecurityEvent("friend_request_rejected", {
      requestId,
      recipientUserId: userId,
      senderUserId: request.sender.toString(),
    });
  }

  async cancelFriendRequest(userId: string, requestId: string) {
    const request = await this.getPendingFriendRequestForActor(
      requestId,
      userId,
      "sender"
    );

    request.status = "cancelled";
    request.respondedAt = new Date();
    await request.save();

    this.logSecurityEvent("friend_request_cancelled", {
      requestId,
      senderUserId: userId,
      recipientUserId: request.recipient.toString(),
    });
  }

  async removeFriend(userId: string, friendUserId: string) {
    const [user, friend] = await Promise.all([
      userRepository.getUserById(userId),
      userRepository.getUserById(friendUserId),
    ]);

    if (!user || !friend) {
      throw new HttpError(404, "User not found");
    }

    const friendIds = (user.friends || []).map((friendId) => friendId.toString());
    if (!friendIds.includes(friendUserId)) {
      throw new HttpError(404, "Friend connection not found");
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await UserModel.updateOne(
          { _id: user._id },
          { $pull: { friends: friend._id } },
          { session }
        );
        await UserModel.updateOne(
          { _id: friend._id },
          { $pull: { friends: user._id } },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    this.logSecurityEvent("friend_removed", {
      userId,
      removedFriendUserId: friendUserId,
    });
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

  async sendResetPasswordEmail(email?: string, requestIp?: string, userAgent?: string) {
    if (!email) {
      throw new HttpError(400, "Email is required");
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await userRepository.getUserByEmail(normalizedEmail, true);

    if (!user) {
      this.logSecurityEvent("password_reset_requested_for_unknown_email", {
        email: normalizedEmail,
      });
      return;
    }

    const { rawToken, tokenHash } = createResetToken();
    const resetLink = `${CLIENT_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const requestedIpHash = hashResetMetadata(requestIp);
    const requestedUserAgent = truncateUserAgent(userAgent);

    await passwordResetTokenRepository.invalidateActiveTokensForUser(user._id.toString());
    await passwordResetTokenRepository.createToken({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
      requestedIpHash,
      requestedUserAgent,
    });

    const html = `
      <p>You requested a password reset for SajhaKuraKani.</p>
      <p>Open this link to reset your password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link expires in 5 minutes and can only be used once.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `;

    const text = `Reset your password with this one-time link (expires in 5 minutes): ${resetLink}`;

    await sendEmail(user.email, "Password Reset", html, text);
    this.logSecurityEvent("password_reset_requested", {
      userId: user._id.toString(),
      email: user.email,
      requestedIpHash,
    });
  }

  async resendEmailVerificationEmail(
    email?: string,
    requestIp?: string,
    userAgent?: string
  ) {
    if (!email) {
      throw new HttpError(400, "Email is required");
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await userRepository.getUserByEmail(normalizedEmail, true);

    if (!user) {
      this.logSecurityEvent("email_verification_requested_for_unknown_email", {
        email: normalizedEmail,
      });
      return;
    }

    if (user.emailVerified) {
      this.logSecurityEvent("email_verification_requested_for_verified_email", {
        userId: user._id.toString(),
        email: user.email,
      });
      return;
    }

    await this.sendEmailVerificationEmailToUser(user, requestIp, userAgent);
  }

  async verifyEmail(token?: string, requestIp?: string, userAgent?: string) {
    if (!token) {
      throw new HttpError(400, "Verification token is required");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const verificationRecord = await emailVerificationTokenRepository.getTokenByHash(
      tokenHash
    );

    if (
      !verificationRecord ||
      verificationRecord.usedAt ||
      verificationRecord.expiresAt.getTime() < Date.now()
    ) {
      throw new HttpError(400, "Invalid or expired verification link");
    }

    const user = await userRepository.getUserById(
      verificationRecord.userId.toString(),
      true
    );
    if (!user) {
      throw new HttpError(400, "Invalid or expired verification link");
    }

    await userRepository.updateUser(user._id.toString(), {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
    await emailVerificationTokenRepository.markTokenUsed(
      verificationRecord._id.toString(),
      hashResetMetadata(requestIp),
      truncateUserAgent(userAgent)
    );
    await emailVerificationTokenRepository.invalidateActiveTokensForUser(
      user._id.toString()
    );

    this.logSecurityEvent("email_verified", {
      userId: user._id.toString(),
      email: user.email,
    });

    return {
      email: user.email,
    };
  }

  async validateResetPasswordToken(token?: string, requestIp?: string) {
    if (!token) {
      throw new HttpError(400, "Token is required");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const resetRecord = await passwordResetTokenRepository.getTokenByHash(tokenHash);

    if (
      !resetRecord ||
      resetRecord.usedAt ||
      resetRecord.expiresAt.getTime() < Date.now()
    ) {
      throw new HttpError(400, "Invalid or expired token");
    }

    const requestIpHash = hashResetMetadata(requestIp);
    if (
      RESET_PASSWORD_ENFORCE_IP_MATCH &&
      resetRecord.requestedIpHash &&
      requestIpHash &&
      resetRecord.requestedIpHash !== requestIpHash
    ) {
      throw new HttpError(400, "Invalid or expired token");
    }

    const user = await userRepository.getUserById(resetRecord.userId.toString(), true);
    if (!user) {
      throw new HttpError(400, "Invalid or expired token");
    }

    return {
      email: user.email,
      expiresAt: resetRecord.expiresAt,
    };
  }

  async resetPassword(
    token?: string,
    newPassword?: string,
    requestIp?: string,
    userAgent?: string
  ) {
    if (!token || !newPassword) {
      throw new HttpError(400, "Token and new password are required");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const resetRecord = await passwordResetTokenRepository.getTokenByHash(tokenHash);

    if (
      !resetRecord ||
      resetRecord.usedAt ||
      resetRecord.expiresAt.getTime() < Date.now()
    ) {
      throw new HttpError(400, "Invalid or expired token");
    }

    const requestIpHash = hashResetMetadata(requestIp);
    if (
      RESET_PASSWORD_ENFORCE_IP_MATCH &&
      resetRecord.requestedIpHash &&
      requestIpHash &&
      resetRecord.requestedIpHash !== requestIpHash
    ) {
      throw new HttpError(400, "Invalid or expired token");
    }

    const user = await userRepository.getUserById(resetRecord.userId.toString(), true);
    if (!user) {
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
    });

    await passwordResetTokenRepository.markTokenUsed(
      resetRecord._id.toString(),
      requestIpHash,
      truncateUserAgent(userAgent)
    );
    await passwordResetTokenRepository.invalidateActiveTokensForUser(user._id.toString());
    await authSessionRepository.revokeAllSessionsForUser(
      user._id.toString(),
      "password_reset"
    );

    const html = `
      <p>Your SajhaKuraKani password was changed successfully.</p>
      <p>If you made this change, you can safely ignore this email.</p>
      <p>If you did not reset your password, secure your account immediately.</p>
    `;
    const text =
      "Your SajhaKuraKani password was changed successfully. If you did not make this change, secure your account immediately.";

    await sendEmail(user.email, "Password Reset Confirmation", html, text);
    this.logSecurityEvent("password_reset_completed", {
      userId: user._id.toString(),
      email: user.email,
      requestedIpHash: resetRecord.requestedIpHash,
      usedIpHash: requestIpHash,
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
