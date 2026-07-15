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
    const response = await axiosInstance.post<ApiResponse<AuthUser>>(
      "/api/auth/oauth/google/exchange",
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
