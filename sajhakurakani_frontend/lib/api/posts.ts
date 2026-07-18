import "server-only";

import axios from "axios";
import axiosInstance from "./axios";

export type PostVisibility =
  | "public"
  | "private"
  | "friends-only";

export type PostMedia = {
  url: string;
  type: "image" | "video";
  mimeType: string;
};

export type UserPost = {
  _id: string;
  title?: string;
  content?: string;
  visibility: PostVisibility;
  media: PostMedia[];
  createdAt: string;
  updatedAt: string;
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

const getSafePostErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const status = error.response?.status;
  const responseMessage =
    ((error.response?.data as { message?: string } | undefined)?.message || "").toLowerCase();

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You are not allowed to change this post.";
  }

  if (status === 404 || responseMessage.includes("not found")) {
    return "This post is no longer available.";
  }

  if (status === 400 && responseMessage.includes("sensitive credentials")) {
    return "Remove passwords, tokens, or other secrets from your post.";
  }

  return fallback;
};

export async function getCurrentUserPosts(page = 1, size = 20) {
  try {
    const response = await axiosInstance.get<PaginatedApiResponse<UserPost>>(
      `/api/posts/me?page=${page}&size=${size}`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafePostErrorMessage(error, "Unable to load your posts right now.")
    );
  }
}

export async function updatePost(
  postId: string,
  payload: {
    title?: string;
    content?: string;
    visibility?: PostVisibility;
  }
) {
  try {
    const response = await axiosInstance.patch<ApiResponse<UserPost>>(
      `/api/posts/${encodeURIComponent(postId)}`,
      payload
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafePostErrorMessage(error, "Unable to update this post right now.")
    );
  }
}

export async function deletePost(postId: string) {
  try {
    const response = await axiosInstance.delete<ApiResponse<null>>(
      `/api/posts/${encodeURIComponent(postId)}`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafePostErrorMessage(error, "Unable to delete this post right now.")
    );
  }
}
