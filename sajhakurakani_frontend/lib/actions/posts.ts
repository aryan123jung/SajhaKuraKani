"use server";

import { revalidatePath } from "next/cache";
import { assertValidCsrfToken } from "../csrf";
import { deletePost, type PostVisibility, updatePost } from "../api/posts";
import type {
  DeletePostActionState,
  UpdatePostActionState,
} from "./post-state";

const normalizeOptionalField = (value: FormDataEntryValue | null) => {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
};

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
