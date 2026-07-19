"use server";

import { revalidatePath } from "next/cache";
import { assertValidCsrfToken } from "../csrf";
import {
  createPost,
  createComment,
  deleteComment,
  deletePost,
  getPostComments,
  getPostEngagement,
  likePost,
  type PostInteractionPrivacy,
  type PostVisibility,
  unlikePost,
  updatePost,
} from "../api/posts";
import type {
  CommentMutationActionResult,
  CreatePostActionState,
  DeletePostActionState,
  LikeMutationActionResult,
  LoadCommentsActionResult,
  UpdatePostActionState,
} from "./post-state";

const normalizeOptionalField = (value: FormDataEntryValue | null) => {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
};

export async function createPostAction(
  _previousState: CreatePostActionState,
  formData: FormData
): Promise<CreatePostActionState> {
  try {
    await assertValidCsrfToken(formData);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Your session security check failed. Refresh and try again.",
      fields: {
        title: "",
        content: "",
        visibility: "public",
        commentPrivacy: "everyone",
        sharePrivacy: "everyone",
      },
    };
  }

  const title = normalizeOptionalField(formData.get("title"));
  const content = normalizeOptionalField(formData.get("content"));
  const visibility = String(formData.get("visibility") || "public").trim() as PostVisibility;
  const commentPrivacy = String(
    formData.get("commentPrivacy") || "everyone"
  ).trim() as PostInteractionPrivacy;
  const sharePrivacy = String(
    formData.get("sharePrivacy") || "everyone"
  ).trim() as PostInteractionPrivacy;

  try {
    await createPost(formData);

    revalidatePath("/user/home");
    revalidatePath("/user/profile");

    return {
      success: true,
      message: "Post published successfully.",
      fields: {
        title: "",
        content: "",
        visibility,
        commentPrivacy,
        sharePrivacy,
      },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to publish your post right now.",
      fields: {
        title: title ?? "",
        content: content ?? "",
        visibility,
        commentPrivacy,
        sharePrivacy,
      },
    };
  }
}

export async function loadPostCommentsAction(
  postId: string
): Promise<LoadCommentsActionResult> {
  if (!postId.trim()) {
    return {
      success: false,
      message: "This post could not be identified.",
      postId,
      comments: [],
      commentCount: 0,
      commentsAvailable: false,
      canComment: false,
    };
  }

  try {
    const [commentsResponse, engagementResponse] = await Promise.all([
      getPostComments(postId, 1, 20),
      getPostEngagement(postId),
    ]);

    return {
      success: true,
      message: "",
      postId,
      comments: commentsResponse.data,
      commentCount: commentsResponse.pagination.total,
      commentsAvailable: engagementResponse.data.commentsAvailable,
      canComment: engagementResponse.data.canComment,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to load comments right now.",
      postId,
      comments: [],
      commentCount: 0,
      commentsAvailable: false,
      canComment: false,
    };
  }
}

export async function likePostAction(
  postId: string
): Promise<LikeMutationActionResult> {
  if (!postId.trim()) {
    return {
      success: false,
      message: "This post could not be identified.",
      postId,
      liked: false,
      likeCount: 0,
      commentCount: 0,
      commentsAvailable: false,
      canComment: false,
    };
  }

  try {
    const [likeResponse, engagementResponse] = await Promise.all([
      likePost(postId),
      getPostEngagement(postId),
    ]);

    revalidatePath("/user/home");
    revalidatePath("/user/profile");

    return {
      success: true,
      message: "",
      postId,
      liked: true,
      likeCount: likeResponse.data.likeCount,
      commentCount: engagementResponse.data.commentCount,
      commentsAvailable: engagementResponse.data.commentsAvailable,
      canComment: engagementResponse.data.canComment,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to like this post right now.",
      postId,
      liked: false,
      likeCount: 0,
      commentCount: 0,
      commentsAvailable: false,
      canComment: false,
    };
  }
}

export async function unlikePostAction(
  postId: string
): Promise<LikeMutationActionResult> {
  if (!postId.trim()) {
    return {
      success: false,
      message: "This post could not be identified.",
      postId,
      liked: true,
      likeCount: 0,
      commentCount: 0,
      commentsAvailable: false,
      canComment: false,
    };
  }

  try {
    const [unlikeResponse, engagementResponse] = await Promise.all([
      unlikePost(postId),
      getPostEngagement(postId),
    ]);

    revalidatePath("/user/home");
    revalidatePath("/user/profile");

    return {
      success: true,
      message: "",
      postId,
      liked: false,
      likeCount: unlikeResponse.data.likeCount,
      commentCount: engagementResponse.data.commentCount,
      commentsAvailable: engagementResponse.data.commentsAvailable,
      canComment: engagementResponse.data.canComment,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to remove your like right now.",
      postId,
      liked: true,
      likeCount: 0,
      commentCount: 0,
      commentsAvailable: false,
      canComment: false,
    };
  }
}

export async function createCommentAction(
  formData: FormData
): Promise<CommentMutationActionResult> {
  try {
    await assertValidCsrfToken(formData);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Your session security check failed. Refresh and try again.",
      postId: "",
      comments: [],
      commentCount: 0,
      commentsAvailable: false,
      canComment: false,
    };
  }

  const postId = String(formData.get("postId") || "").trim();
  const content = normalizeOptionalField(formData.get("content")) || "";

  if (!postId) {
    return {
      success: false,
      message: "This post could not be identified.",
      postId,
      comments: [],
      commentCount: 0,
      commentsAvailable: false,
      canComment: false,
    };
  }

  try {
    await createComment(postId, { content });
    const [commentsResponse, engagementResponse] = await Promise.all([
      getPostComments(postId, 1, 20),
      getPostEngagement(postId),
    ]);

    revalidatePath("/user/home");
    revalidatePath("/user/profile");

    return {
      success: true,
      message: "",
      postId,
      comments: commentsResponse.data,
      commentCount: commentsResponse.pagination.total,
      commentsAvailable: engagementResponse.data.commentsAvailable,
      canComment: engagementResponse.data.canComment,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to publish this comment right now.",
      postId,
      comments: [],
      commentCount: 0,
      commentsAvailable: false,
      canComment: false,
    };
  }
}

export async function deleteCommentAction(
  formData: FormData
): Promise<CommentMutationActionResult> {
  try {
    await assertValidCsrfToken(formData);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Your session security check failed. Refresh and try again.",
      postId: "",
      comments: [],
      commentCount: 0,
      commentsAvailable: false,
      canComment: false,
    };
  }

  const postId = String(formData.get("postId") || "").trim();
  const commentId = String(formData.get("commentId") || "").trim();

  if (!postId || !commentId) {
    return {
      success: false,
      message: "This comment could not be identified.",
      postId,
      comments: [],
      commentCount: 0,
      commentsAvailable: false,
      canComment: false,
    };
  }

  try {
    await deleteComment(commentId);
    const [commentsResponse, engagementResponse] = await Promise.all([
      getPostComments(postId, 1, 20),
      getPostEngagement(postId),
    ]);

    revalidatePath("/user/home");
    revalidatePath("/user/profile");

    return {
      success: true,
      message: "",
      postId,
      comments: commentsResponse.data,
      commentCount: commentsResponse.pagination.total,
      commentsAvailable: engagementResponse.data.commentsAvailable,
      canComment: engagementResponse.data.canComment,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to delete this comment right now.",
      postId,
      comments: [],
      commentCount: 0,
      commentsAvailable: false,
      canComment: false,
    };
  }
}

export async function updatePostAction(
  _previousState: UpdatePostActionState,
  formData: FormData
): Promise<UpdatePostActionState> {
  try {
    await assertValidCsrfToken(formData);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Your session security check failed. Refresh and try again.",
      activePostId: "",
      fields: {
        title: "",
        content: "",
        visibility: "public",
      },
    };
  }

  const postId = String(formData.get("postId") || "").trim();
  const title = normalizeOptionalField(formData.get("title"));
  const content = normalizeOptionalField(formData.get("content"));
  const visibility = String(formData.get("visibility") || "public").trim() as PostVisibility;

  if (!postId) {
    return {
      success: false,
      message: "This post could not be identified.",
      activePostId: "",
      fields: {
        title: title ?? "",
        content: content ?? "",
        visibility,
      },
    };
  }

  try {
    await updatePost(postId, {
      title,
      content,
      visibility,
    });

    revalidatePath("/user/profile");
    revalidatePath("/user/home");

    return {
      success: true,
      message: "Post updated successfully.",
      activePostId: postId,
      fields: {
        title: title ?? "",
        content: content ?? "",
        visibility,
      },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update this post right now.",
      activePostId: postId,
      fields: {
        title: title ?? "",
        content: content ?? "",
        visibility,
      },
    };
  }
}

export async function deletePostAction(
  _previousState: DeletePostActionState,
  formData: FormData
): Promise<DeletePostActionState> {
  try {
    await assertValidCsrfToken(formData);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Your session security check failed. Refresh and try again.",
      activePostId: "",
    };
  }

  const postId = String(formData.get("postId") || "").trim();

  if (!postId) {
    return {
      success: false,
      message: "This post could not be identified.",
      activePostId: "",
    };
  }

  try {
    await deletePost(postId);
    revalidatePath("/user/profile");
    revalidatePath("/user/home");

    return {
      success: true,
      message: "Post deleted successfully.",
      activePostId: postId,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to delete this post right now.",
      activePostId: postId,
    };
  }
}
