import "server-only";

import axios from "axios";
import axiosInstance from "./axios";

export type MessageUserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileUrl?: string | null;
};

export type ConversationMessage = {
  _id: string;
  pairKey: string;
  participants: string[];
  sender: string;
  recipient: string;
  content: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageConversationSummary = {
  pairKey: string;
  otherUser: MessageUserProfile;
  unreadCount: number;
  latestMessage: ConversationMessage;
};

export type ConversationThread = {
  conversation: {
    pairKey: string;
    otherUser: MessageUserProfile;
  };
  messages: ConversationMessage[];
};

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

const getSafeMessageError = (
  error: unknown,
  fallback: string,
  context: "conversations" | "thread" | "send" | "read"
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

  if (status === 404 && context === "thread") {
    return "This conversation is no longer available.";
  }

  if (status === 409 && context === "send") {
    if (responseMessage.includes("similar message")) {
      return "That message looks too similar to one you just sent.";
    }

    return "This message could not be sent right now.";
  }

  if (status === 429) {
    if (context === "send") {
      return "You are sending messages too quickly. Please wait a moment and try again.";
    }

    if (context === "read") {
      return "Message read updates are happening too quickly right now. Please wait a moment and try again.";
    }

    return "Chat is refreshing too quickly right now. Please wait a moment and try again.";
  }

  return fallback;
};

export async function getMessageConversations(search?: string, page = 1, size = 20) {
  try {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });

    if (search?.trim()) {
      params.set("search", search.trim());
    }

    const response = await axiosInstance.get<PaginatedApiResponse<MessageConversationSummary>>(
      `/api/messages/conversations?${params.toString()}`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeMessageError(
        error,
        "Unable to load your conversations right now.",
        "conversations"
      )
    );
  }
}

export async function getConversationMessages(friendUserId: string, page = 1, size = 50) {
  try {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });

    const response = await axiosInstance.get<
      ApiResponse<ConversationThread> & {
        pagination: {
          page: number;
          size: number;
          total: number;
          totalPages: number;
        };
      }
    >(`/api/messages/conversations/${encodeURIComponent(friendUserId)}?${params.toString()}`);

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeMessageError(
        error,
        "Unable to load this conversation right now.",
        "thread"
      )
    );
  }
}

export async function sendConversationMessage(friendUserId: string, content: string) {
  try {
    const response = await axiosInstance.post<
      ApiResponse<{
        pairKey: string;
        recipientUserId: string;
        message: ConversationMessage;
      }>
    >(`/api/messages/conversations/${encodeURIComponent(friendUserId)}`, {
      content,
    });

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeMessageError(error, "Unable to send this message right now.", "send")
    );
  }
}

export async function markConversationRead(friendUserId: string) {
  try {
    const response = await axiosInstance.post<
      ApiResponse<{
        pairKey: string;
        otherUser: MessageUserProfile;
        updatedCount: number;
      }>
    >(`/api/messages/conversations/${encodeURIComponent(friendUserId)}/read`);

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeMessageError(error, "Unable to update this conversation right now.", "read")
    );
  }
}
