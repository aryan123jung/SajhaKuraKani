import "server-only";

import axios from "axios";
import axiosInstance from "./axios";

export type FriendProfile = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileUrl?: string | null;
};

export type FriendRequestSummary = {
  id: string;
  createdAt: string;
  user: FriendProfile;
};

export type FriendOverview = {
  friends: FriendProfile[];
  incomingRequests: FriendRequestSummary[];
  outgoingRequests: FriendRequestSummary[];
  discoverUsers: FriendProfile[];
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

const getSafeFriendErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const status = error.response?.status;
  const responseMessage =
    ((error.response?.data as { message?: string } | undefined)?.message || "").toLowerCase();

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 404 && responseMessage.includes("not found")) {
    return "That friend item no longer exists.";
  }

  if (status === 409 && responseMessage.includes("already")) {
    return "That friend request already exists.";
  }

  if (status === 429) {
    return "Too many friend actions were made. Please wait a bit and try again.";
  }

  return fallback;
};

export async function getFriendOverview(search?: string) {
  try {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const response = await axiosInstance.get<ApiResponse<FriendOverview>>(
      `/api/auth/friends${query}`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeFriendErrorMessage(error, "Unable to load your friends right now.")
    );
  }
}

export async function sendFriendRequest(recipientUserId: string) {
  try {
    const response = await axiosInstance.post<ApiResponse<null>>(
      "/api/auth/friends/request",
      { recipientUserId }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeFriendErrorMessage(error, "Unable to send that friend request right now.")
    );
  }
}

export async function acceptFriendRequest(requestId: string) {
  try {
    const response = await axiosInstance.post<ApiResponse<null>>(
      `/api/auth/friends/request/${encodeURIComponent(requestId)}/accept`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeFriendErrorMessage(error, "Unable to accept that request right now.")
    );
  }
}

export async function rejectFriendRequest(requestId: string) {
  try {
    const response = await axiosInstance.post<ApiResponse<null>>(
      `/api/auth/friends/request/${encodeURIComponent(requestId)}/reject`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeFriendErrorMessage(error, "Unable to reject that request right now.")
    );
  }
}

export async function cancelFriendRequest(requestId: string) {
  try {
    const response = await axiosInstance.post<ApiResponse<null>>(
      `/api/auth/friends/request/${encodeURIComponent(requestId)}/cancel`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeFriendErrorMessage(error, "Unable to cancel that request right now.")
    );
  }
}

export async function removeFriend(friendUserId: string) {
  try {
    const response = await axiosInstance.delete<ApiResponse<null>>(
      `/api/auth/friends/${encodeURIComponent(friendUserId)}`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeFriendErrorMessage(error, "Unable to remove that friend right now.")
    );
  }
}
