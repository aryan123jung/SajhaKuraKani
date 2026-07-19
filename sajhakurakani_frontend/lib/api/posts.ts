import "server-only";

import axios from "axios";
import axiosInstance from "./axios";

export type PostVisibility =
  | "public"
  | "private"
  | "friends-only";

export type PostInteractionPrivacy =
  | "everyone"
  | "friends-only"
  | "no-one";

export type PostMedia = {
  url: string;
  type: "image" | "video";
  mimeType: string;
};

export type PostCommentAuthor = {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  profileUrl?: string | null;
};

export type PostComment = {
  _id: string;
  content?: string;
  isDeleted: boolean;
  author: PostCommentAuthor;
  createdAt: string;
  updatedAt: string;
};

export type PostEngagementSummary = {
  liked: boolean;
  likeCount: number;
  commentCount: number | null;
  commentsAvailable: boolean;
  canComment: boolean;
};

export type UserPost = {
  _id: string;
  title?: string;
  content?: string;
  visibility: PostVisibility;
  commentPrivacy?: PostInteractionPrivacy;
  sharePrivacy?: PostInteractionPrivacy;
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

export async function getPostEngagement(postId: string) {
  try {
    const response = await axiosInstance.get<ApiResponse<PostEngagementSummary>>(
      `/api/posts/${encodeURIComponent(postId)}/engagement`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafePostErrorMessage(error, "Unable to load post activity right now.")
    );
  }
}

export async function getPostComments(postId: string, page = 1, size = 20) {
  try {
    const response = await axiosInstance.get<PaginatedApiResponse<PostComment>>(
      `/api/posts/${encodeURIComponent(postId)}/comments?page=${page}&size=${size}`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafePostErrorMessage(error, "Unable to load comments right now.")
    );
  }
}

export async function createPost(payload: FormData) {
  try {
    const response = await axiosInstance.post<ApiResponse<UserPost>>("/api/posts", payload, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    if (!axios.isAxiosError(error)) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to publish your post right now."
      );
    }

    const status = error.response?.status;
    const responseMessage =
      ((error.response?.data as { message?: string } | undefined)?.message || "").toLowerCase();

    if (status === 401) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    if (status === 429) {
      throw new Error("You are posting too quickly. Please wait a bit and try again.");
    }

    if (status === 409 || responseMessage.includes("duplicate posting")) {
      throw new Error("A very similar post was already shared recently.");
    }

    if (status === 400 && responseMessage.includes("must include text")) {
      throw new Error("Add some text or media before publishing your post.");
    }

    if (status === 400 && responseMessage.includes("up to 4 media files")) {
      throw new Error("You can attach up to 4 media files to a post.");
    }

    if (
      status === 400 &&
      (responseMessage.includes("only image or video files are allowed") ||
        responseMessage.includes("file signature validation") ||
        responseMessage.includes("script content validation") ||
        responseMessage.includes("security checked") ||
        responseMessage.includes("exceeded the allowed file size"))
    ) {
      throw new Error("One or more media files failed the upload security checks.");
    }

    if (status === 400 && responseMessage.includes("sensitive credentials")) {
      throw new Error("Remove passwords, tokens, or other secrets from your post.");
    }

    throw new Error("Unable to publish your post right now.");
  }
}

export async function likePost(postId: string) {
  try {
    const response = await axiosInstance.post<ApiResponse<PostEngagementSummary>>(
      `/api/posts/${encodeURIComponent(postId)}/likes`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafePostErrorMessage(error, "Unable to like this post right now.")
    );
  }
}

export async function unlikePost(postId: string) {
  try {
    const response = await axiosInstance.delete<ApiResponse<PostEngagementSummary>>(
      `/api/posts/${encodeURIComponent(postId)}/likes`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafePostErrorMessage(error, "Unable to remove your like right now.")
    );
  }
}

export async function createComment(
  postId: string,
  payload: {
    content: string;
  }
) {
  try {
    const response = await axiosInstance.post<ApiResponse<PostComment>>(
      `/api/posts/${encodeURIComponent(postId)}/comments`,
      payload
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafePostErrorMessage(error, "Unable to publish this comment right now.")
    );
  }
}

export async function deleteComment(commentId: string) {
  try {
    const response = await axiosInstance.delete<ApiResponse<PostComment>>(
      `/api/posts/comments/${encodeURIComponent(commentId)}`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafePostErrorMessage(error, "Unable to delete this comment right now.")
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
