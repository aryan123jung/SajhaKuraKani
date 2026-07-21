import "server-only";

import axios from "axios";
import axiosInstance from "./axios";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type AuthUser = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  bio?: string | null;
  role: "user" | "admin";
  profileUrl?: string | null;
  coverUrl?: string | null;
  totpEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SearchableUserProfile = {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  bio?: string | null;
  profileUrl?: string | null;
  coverUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  relationshipStatus?:
    | "none"
    | "friends"
    | "incoming_request"
    | "outgoing_request";
  pendingRequestId?: string | null;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  accessToken?: string;
  refreshToken?: string;
};

type PaginatedApiResponse<T> = ApiResponse<T[]> & {
  pagination: {
    page: number;
    size: number;
    totalUsers: number;
    totalPages: number;
  };
};

type GoogleLoginUrlData = {
  state: string;
  authorizationUrl: string;
};

type GoogleOAuthExchangeData = {
  user: AuthUser;
  requiresTotp: boolean;
  preAuthToken?: string;
};

type LoginResponseData = {
  user: AuthUser;
  requiresTotp: boolean;
  preAuthToken?: string;
};

export type AuthSession = {
  id: string;
  current: boolean;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  userAgent: string;
};

export type UpdateProfilePayload = {
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
  profileUrl?: File | null;
  coverUrl?: File | null;
};

type TotpSetupData = {
  manualEntryKey: string;
  otpAuthUrl: string;
};

type ResetPasswordValidationData = {
  email: string;
  expiresAt: string;
};

type EmailVerificationData = {
  email: string;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const resolveUploadedUserAssetUrl = (
  value: string | null | undefined,
  type: "profile" | "cover"
) => {
  if (!value) {
    return null;
  }

  if (isAbsoluteUrl(value)) {
    return value;
  }

  if (value.startsWith("/uploads/")) {
    return API_BASE_URL ? `${API_BASE_URL}${value}` : value;
  }

  const normalizedFileName = value.replace(/^\/+/, "");
  const assetPath = `/uploads/${type}/${normalizedFileName}`;

  return API_BASE_URL ? `${API_BASE_URL}${assetPath}` : assetPath;
};

const normalizeAuthUser = (user: AuthUser): AuthUser => ({
  ...user,
  profileUrl: resolveUploadedUserAssetUrl(user.profileUrl, "profile"),
  coverUrl: resolveUploadedUserAssetUrl(user.coverUrl, "cover"),
});

const normalizeSearchableUserProfile = (
  user: SearchableUserProfile
): SearchableUserProfile => ({
  ...user,
  profileUrl: resolveUploadedUserAssetUrl(user.profileUrl, "profile"),
  coverUrl: resolveUploadedUserAssetUrl(user.coverUrl, "cover"),
});

const getSafeErrorMessage = (
  error: unknown,
  fallback: string,
  context: "login" | "register" | "oauth" | "verify-email" | "resend-verification"
) => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const responseMessage =
    ((error.response?.data as { message?: string } | undefined)?.message || "").toLowerCase();
  const status = error.response?.status;

  if (context === "login") {
    if (responseMessage.includes("totp verification is required")) {
      return "This account needs a second verification step to complete sign-in.";
    }

    if (responseMessage.includes("invalid totp code")) {
      return "The 6-digit authenticator code is incorrect.";
    }

    if (responseMessage.includes("two-factor verification session")) {
      return "Your two-factor verification session expired. Please sign in again.";
    }

    if (
      status === 423 ||
      status === 429 ||
      responseMessage.includes("temporarily locked") ||
      responseMessage.includes("too many sign-in attempts")
    ) {
      return "Too many sign-in attempts were made. Please wait a bit and try again.";
    }

    if (
      status === 401 ||
      responseMessage.includes("invalid email or password") ||
      responseMessage.includes("the credential you entered is incorrect")
    ) {
      return "The credential you entered is incorrect.";
    }

    if (status === 403 || responseMessage.includes("verify email first")) {
      return "Verify your email first before signing in.";
    }
  }

  if (context === "register") {
    if (responseMessage.includes("email already in use")) {
      return "That email is already linked to an account.";
    }

    if (responseMessage.includes("username already in use")) {
      return "That username is already taken.";
    }

    if (responseMessage.includes("password do not match")) {
      return "Passwords do not match.";
    }
  }

  if (context === "oauth") {
    if (status === 423 || responseMessage.includes("temporarily locked")) {
      return "Too many verification attempts were made. Please wait a bit and try again.";
    }

    if (responseMessage.includes("invalid totp code")) {
      return "The authenticator code you entered is incorrect.";
    }

    if (
      status === 500 ||
      responseMessage.includes("google oauth is not configured")
    ) {
      return "Google sign-in is not available yet. Please finish its setup and try again.";
    }

    return "Unable to continue with Google sign-in right now.";
  }

  if (context === "verify-email") {
    if (responseMessage.includes("invalid or expired verification link") || status === 400) {
      return "This verification link is invalid or has expired. Request a new one.";
    }

    if (status === 429) {
      return "Too many verification attempts were made. Please wait a bit and try again.";
    }
  }

  if (context === "resend-verification") {
    if (status === 429) {
      return "Too many verification requests were made. Please wait a bit and try again.";
    }

    return "Unable to send a verification email right now.";
  }

  return fallback;
};

export async function login(payload: LoginPayload) {
  try {
    const response = await axiosInstance.post<ApiResponse<LoginResponseData>>(
      "/api/auth/login",
      payload
    );

    if (
      !response.data.data.requiresTotp &&
      (!response.data.accessToken || !response.data.refreshToken)
    ) {
      throw new Error("Authentication tokens were not returned by the server.");
    }

    return {
      ...response.data,
      data: {
        ...response.data.data,
        user: normalizeAuthUser(response.data.data.user),
      },
    };
  } catch (error) {
    throw new Error(
      getSafeErrorMessage(error, "Unable to sign in right now.", "login")
    );
  }
}

export async function register(payload: RegisterPayload) {
  try {
    const response = await axiosInstance.post<ApiResponse<AuthUser>>(
      "/api/auth/register",
      payload
    );

    return {
      ...response.data,
      data: normalizeAuthUser(response.data.data),
    };
  } catch (error) {
    throw new Error(
      getSafeErrorMessage(
        error,
        "Unable to create your account right now.",
        "register"
      )
    );
  }
}

export async function getGoogleOAuthUrl() {
  try {
    const response = await axiosInstance.get<ApiResponse<GoogleLoginUrlData>>(
      "/api/auth/oauth/google/url"
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeErrorMessage(
        error,
        "Unable to start Google sign-in right now.",
        "oauth"
      )
    );
  }
}

export async function exchangeGoogleOAuthCode(payload: {
  code: string;
  state: string;
}) {
  try {
    const response = await axiosInstance.post<ApiResponse<GoogleOAuthExchangeData>>(
      "/api/auth/oauth/google/exchange",
      payload
    );

    if (
      !response.data.data.requiresTotp &&
      (!response.data.accessToken || !response.data.refreshToken)
    ) {
      throw new Error("Authentication tokens were not returned by the server.");
    }

    return {
      ...response.data,
      data: {
        ...response.data.data,
        user: normalizeAuthUser(response.data.data.user),
      },
    };
  } catch (error) {
    throw new Error(
      getSafeErrorMessage(
        error,
        "Unable to complete Google sign-in right now.",
        "oauth"
      )
    );
  }
}

export async function verifyGoogleOAuthTotp(payload: {
  preAuthToken: string;
  code: string;
}) {
  try {
    const response = await axiosInstance.post<ApiResponse<AuthUser>>(
      "/api/auth/oauth/google/verify-totp",
      payload
    );

    if (!response.data.accessToken || !response.data.refreshToken) {
      throw new Error("Authentication tokens were not returned by the server.");
    }

    return {
      ...response.data,
      data: normalizeAuthUser(response.data.data),
    };
  } catch (error) {
    throw new Error(
      getSafeErrorMessage(
        error,
        "Unable to complete Google sign-in right now.",
        "oauth"
      )
    );
  }
}

export async function verifyLoginTotp(payload: {
  preAuthToken: string;
  code: string;
}) {
  try {
    const response = await axiosInstance.post<ApiResponse<AuthUser>>(
      "/api/auth/login/verify-totp",
      payload
    );

    if (!response.data.accessToken || !response.data.refreshToken) {
      throw new Error("Authentication tokens were not returned by the server.");
    }

    return {
      ...response.data,
      data: normalizeAuthUser(response.data.data),
    };
  } catch (error) {
    throw new Error(
      getSafeErrorMessage(
        error,
        "Unable to complete sign-in right now.",
        "login"
      )
    );
  }
}

export async function startTotpSetup() {
  try {
    const response = await axiosInstance.post<ApiResponse<TotpSetupData>>(
      "/api/auth/totp/setup"
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to start two-factor setup right now."
    );
  }
}

export async function enableTotp(code: string) {
  try {
    return await axiosInstance.post<ApiResponse<null>>("/api/auth/totp/enable", {
      code,
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to enable two-factor authentication right now."
    );
  }
}

export async function disableTotp(code: string) {
  try {
    return await axiosInstance.post<ApiResponse<null>>("/api/auth/totp/disable", {
      code,
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to disable two-factor authentication right now."
    );
  }
}

export async function requestPasswordReset(email: string) {
  try {
    const response = await axiosInstance.post<ApiResponse<null>>(
      "/api/auth/send-reset-password-email",
      { email }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      throw new Error("Too many reset requests were made. Please wait a bit and try again.");
    }

    throw new Error("Unable to send a password reset email right now.");
  }
}

export async function resendVerificationEmail(email: string) {
  try {
    const response = await axiosInstance.post<ApiResponse<null>>(
      "/api/auth/resend-verification-email",
      { email }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeErrorMessage(
        error,
        "Unable to send a verification email right now.",
        "resend-verification"
      )
    );
  }
}

export async function verifyEmail(token: string) {
  try {
    const response = await axiosInstance.get<ApiResponse<EmailVerificationData>>(
      `/api/auth/verify-email/${encodeURIComponent(token)}`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeErrorMessage(
        error,
        "Unable to verify your email right now.",
        "verify-email"
      )
    );
  }
}

export async function validatePasswordResetToken(token: string) {
  try {
    const response = await axiosInstance.get<ApiResponse<ResetPasswordValidationData>>(
      `/api/auth/reset-password/${encodeURIComponent(token)}/validate`
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const responseMessage =
        ((error.response?.data as { message?: string } | undefined)?.message || "").toLowerCase();

      if (status === 400 || responseMessage.includes("invalid or expired token")) {
        throw new Error("This reset link is invalid or has expired. Request a new one.");
      }

      if (status === 429) {
        throw new Error("Too many reset attempts were made. Please wait a bit and try again.");
      }
    }

    throw new Error("Unable to verify this reset link right now.");
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    const response = await axiosInstance.post<ApiResponse<null>>(
      `/api/auth/reset-password/${encodeURIComponent(token)}`,
      { newPassword }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const responseMessage =
        ((error.response?.data as { message?: string } | undefined)?.message || "").toLowerCase();

      if (status === 400 || responseMessage.includes("invalid or expired token")) {
        throw new Error("This reset link is invalid or has expired. Request a new one.");
      }

      if (responseMessage.includes("new password must be different")) {
        throw new Error("Choose a new password that is different from the current one.");
      }

      if (status === 429) {
        throw new Error("Too many reset attempts were made. Please wait a bit and try again.");
      }
    }

    throw new Error("Unable to reset your password right now.");
  }
}

export async function getCurrentUser() {
  try {
    const response = await axiosInstance.get<ApiResponse<AuthUser>>(
      "/api/auth/whoami"
    );

    return {
      ...response.data,
      data: normalizeAuthUser(response.data.data),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401) {
        throw new Error("Your session has expired. Please sign in again.");
      }
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to load your account right now."
    );
  }
}

export async function updateCurrentUserProfile(payload: FormData) {
  try {
    const response = await axiosInstance.put<ApiResponse<AuthUser>>(
      "/api/auth/update-profile",
      payload,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return {
      ...response.data,
      data: normalizeAuthUser(response.data.data),
    };
  } catch (error) {
    if (!axios.isAxiosError(error)) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to update your profile right now."
      );
    }

    const status = error.response?.status;
    const responseMessage =
      ((error.response?.data as { message?: string } | undefined)?.message || "").toLowerCase();

    if (status === 401) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    if (responseMessage.includes("username already in use")) {
      throw new Error("That username is already taken.");
    }

    if (responseMessage.includes("email already in use")) {
      throw new Error("That email is already linked to an account.");
    }

    if (status === 400 && responseMessage.includes("username can only contain")) {
      throw new Error("Unable to save that username right now.");
    }

    if (
      status === 400 &&
      (responseMessage.includes("only image or video files are allowed") ||
        responseMessage.includes("file signature validation") ||
        responseMessage.includes("exceeded the allowed file size"))
    ) {
      throw new Error("One or more profile images failed the upload security checks.");
    }

    throw new Error("Unable to update your profile right now.");
  }
}

export async function getUserProfileById(userId: string) {
  try {
    const response = await axiosInstance.get<ApiResponse<SearchableUserProfile>>(
      `/api/auth/users/${encodeURIComponent(userId)}`
    );

    return {
      ...response.data,
      data: normalizeSearchableUserProfile(response.data.data),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      if (status === 404) {
        throw new Error("That profile is no longer available.");
      }
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to load that profile right now."
    );
  }
}

export async function searchUsers(search?: string, page = 1, size = 10) {
  try {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });

    if (search?.trim()) {
      params.set("search", search.trim());
    }

    const response = await axiosInstance.get<PaginatedApiResponse<SearchableUserProfile>>(
      `/api/auth/users?${params.toString()}`
    );

    return {
      ...response.data,
      data: response.data.data.map(normalizeSearchableUserProfile),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      if (status === 429) {
        throw new Error("Too many search requests were made. Please wait a bit and try again.");
      }
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to search users right now."
    );
  }
}

export async function refreshSession(refreshToken: string) {
  try {
    const response = await axiosInstance.post<ApiResponse<AuthUser>>(
      "/api/auth/refresh",
      { refreshToken }
    );

    if (!response.data.accessToken || !response.data.refreshToken) {
      throw new Error("Authentication tokens were not returned by the server.");
    }

    return {
      ...response.data,
      data: normalizeAuthUser(response.data.data),
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    throw new Error("Unable to refresh your session right now.");
  }
}

export async function getSessions() {
  try {
    const response = await axiosInstance.get<ApiResponse<AuthSession[]>>(
      "/api/auth/sessions"
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    throw new Error("Unable to load your active sessions right now.");
  }
}

export async function logoutCurrentSession() {
  try {
    const response = await axiosInstance.post<ApiResponse<null>>(
      "/api/auth/sessions/logout-current"
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    throw new Error("Unable to end this session right now.");
  }
}

export async function revokeSession(sessionId: string) {
  try {
    const response = await axiosInstance.delete<ApiResponse<null>>(
      `/api/auth/sessions/${encodeURIComponent(sessionId)}`
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const responseMessage =
        ((error.response?.data as { message?: string } | undefined)?.message || "").toLowerCase();

      if (status === 400 || responseMessage.includes("use logout")) {
        throw new Error("Use the main logout button to end the current session.");
      }

      if (status === 401) {
        throw new Error("Your session has expired. Please sign in again.");
      }
    }

    throw new Error("Unable to revoke that session right now.");
  }
}

export async function revokeOtherSessions() {
  try {
    const response = await axiosInstance.post<ApiResponse<null>>(
      "/api/auth/sessions/revoke-others"
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    throw new Error("Unable to revoke your other sessions right now.");
  }
}
