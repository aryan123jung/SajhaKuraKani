import "server-only";

import axios from "axios";
import axiosInstance from "./axios";

export type LoginPayload = {
  email: string;
  password: string;
  totpCode?: string;
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
  role: "user" | "admin";
  profileUrl?: string | null;
  coverUrl?: string | null;
  totpEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  token?: string;
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

type TotpSetupData = {
  manualEntryKey: string;
  otpAuthUrl: string;
};

const getSafeErrorMessage = (
  error: unknown,
  fallback: string,
  context: "login" | "register" | "oauth"
) => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const responseMessage =
    ((error.response?.data as { message?: string } | undefined)?.message || "").toLowerCase();
  const status = error.response?.status;

  if (context === "login") {
    if (responseMessage.includes("totp code is required")) {
      return "This account needs a verification code. Continue with your 6-digit TOTP code.";
    }

    if (responseMessage.includes("invalid totp code")) {
      return "The 6-digit authenticator code is incorrect.";
    }

    if (status === 423 || responseMessage.includes("temporarily locked")) {
      return "Too many sign-in attempts were made. Please wait a bit and try again.";
    }

    if (status === 401 || responseMessage.includes("invalid email or password")) {
      return "The email or password you entered is incorrect.";
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

  return fallback;
};

export async function login(payload: LoginPayload) {
  try {
    const response = await axiosInstance.post<ApiResponse<AuthUser>>(
      "/api/auth/login",
      payload
    );

    if (!response.data.token) {
      throw new Error("Authentication token was not returned by the server.");
    }

    return response.data;
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

    return response.data;
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

    if (!response.data.data.requiresTotp && !response.data.token) {
      throw new Error("Authentication token was not returned by the server.");
    }

    return response.data;
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

    if (!response.data.token) {
      throw new Error("Authentication token was not returned by the server.");
    }

    return response.data;
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

export async function getCurrentUser() {
  try {
    const response = await axiosInstance.get<ApiResponse<AuthUser>>(
      "/api/auth/whoami"
    );

    return response.data;
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
