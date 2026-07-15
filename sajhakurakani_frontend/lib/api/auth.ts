import "server-only";

import axios from "axios";
import axiosInstance from "./axios";

export type LoginPayload = {
  email: string;
  password: string;
  totpCode?: string;
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

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { message?: string } | undefined)?.message ||
      error.message ||
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message;
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
    throw new Error(getApiErrorMessage(error, "Unable to sign in right now."));
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
      getApiErrorMessage(error, "Unable to start Google sign-in right now.")
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
      getApiErrorMessage(error, "Unable to complete Google sign-in right now.")
    );
  }
}
