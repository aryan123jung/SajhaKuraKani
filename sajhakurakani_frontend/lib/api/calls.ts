import "server-only";

import axios from "axios";
import axiosInstance from "./axios";
import type { CallSession, CallStatus, CallType } from "../call-types";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type PaginatedApiResponse<T> = ApiResponse<T[]> & {
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
};

const getSafeCallError = (
  error: unknown,
  fallback: string,
  context: "active" | "history" | "initiate" | "accept" | "decline" | "end"
) => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const status = error.response?.status;
  const responseMessage =
    ((error.response?.data as { message?: string } | undefined)?.message || "").toLowerCase();

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 404) {
    if (context === "active") {
      return "No active call was found.";
    }

    return "This call is no longer available.";
  }

  if (status === 409) {
    if (responseMessage.includes("already in another call")) {
      return "One of you is already in another call.";
    }

    if (responseMessage.includes("already an active or pending call")) {
      return "There is already a call in progress for this conversation.";
    }

    return "This call action is no longer available.";
  }

  if (status === 410) {
    return "This call expired before it could be answered.";
  }

  if (status === 429) {
    return "Too many call attempts were made. Please wait a bit and try again.";
  }

  return fallback;
};

export async function getActiveCall() {
  try {
    const response = await axiosInstance.get<ApiResponse<CallSession | null>>("/api/calls/active");
    return response.data;
  } catch (error) {
    throw new Error(
      getSafeCallError(error, "Unable to load the active call right now.", "active")
    );
  }
}

export async function listCallHistory(page = 1, size = 20, status?: CallStatus) {
  try {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });

    if (status) {
      params.set("status", status);
    }

    const response = await axiosInstance.get<PaginatedApiResponse<CallSession>>(
      `/api/calls/history?${params.toString()}`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeCallError(error, "Unable to load call history right now.", "history")
    );
  }
}

export async function initiateCall(calleeUserId: string, callType: CallType) {
  try {
    const response = await axiosInstance.post<
      ApiResponse<{
        call: CallSession;
        recipientUserId: string;
      }>
    >("/api/calls/initiate", {
      calleeUserId,
      callType,
    });

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeCallError(error, "Unable to start the call right now.", "initiate")
    );
  }
}

export async function acceptCall(callId: string) {
  try {
    const response = await axiosInstance.post<
      ApiResponse<{
        call: CallSession;
        otherUserId: string;
      }>
    >(`/api/calls/${encodeURIComponent(callId)}/accept`);

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeCallError(error, "Unable to accept the call right now.", "accept")
    );
  }
}

export async function declineCall(callId: string) {
  try {
    const response = await axiosInstance.post<
      ApiResponse<{
        call: CallSession;
        otherUserId: string;
      }>
    >(`/api/calls/${encodeURIComponent(callId)}/decline`);

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeCallError(error, "Unable to decline the call right now.", "decline")
    );
  }
}

export async function endCall(callId: string) {
  try {
    const response = await axiosInstance.post<
      ApiResponse<{
        call: CallSession;
        otherUserId: string;
      }>
    >(`/api/calls/${encodeURIComponent(callId)}/end`);

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeCallError(error, "Unable to end the call right now.", "end")
    );
  }
}
