import type { PostVisibility } from "../api/posts";
import type { PostInteractionPrivacy } from "../api/posts";
import type { PostComment } from "../api/posts";

export type CreatePostActionState = {
  success: boolean;
  message: string;
  fields: {
    title: string;
    content: string;
    visibility: PostVisibility;
    commentPrivacy: PostInteractionPrivacy;
    sharePrivacy: PostInteractionPrivacy;
  };
};

export const initialCreatePostActionState: CreatePostActionState = {
  success: false,
  message: "",
  fields: {
    title: "",
    content: "",
    visibility: "public",
    commentPrivacy: "everyone",
    sharePrivacy: "everyone",
  },
};

export type LoadCommentsActionResult = {
  success: boolean;
  message: string;
  postId: string;
  comments: PostComment[];
  commentCount: number | null;
  commentsAvailable: boolean;
  canComment: boolean;
};

export type CommentMutationActionResult = {
  success: boolean;
  message: string;
  postId: string;
  comments: PostComment[];
  commentCount: number | null;
  commentsAvailable: boolean;
  canComment: boolean;
};

export type LikeMutationActionResult = {
  success: boolean;
  message: string;
  postId: string;
  liked: boolean;
  likeCount: number;
  commentCount: number | null;
  commentsAvailable: boolean;
  canComment: boolean;
};

export type UpdatePostActionState = {
  success: boolean;
  message: string;
  activePostId: string;
  fields: {
    title: string;
    content: string;
    visibility: PostVisibility;
  };
};

export const initialUpdatePostActionState: UpdatePostActionState = {
  success: false,
  message: "",
  activePostId: "",
  fields: {
    title: "",
    content: "",
    visibility: "public",
  },
};

export type DeletePostActionState = {
  success: boolean;
  message: string;
  activePostId: string;
};

export const initialDeletePostActionState: DeletePostActionState = {
  success: false,
  message: "",
  activePostId: "",
};
