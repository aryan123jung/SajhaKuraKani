import { HttpError } from "../errors/http-error";
import { IPost } from "../models/post.model";

const getPostAuthorId = (post: Pick<IPost, "author">) =>
  typeof post.author === "string" ? post.author : post.author?.toString();

export const isPostOwner = (
  post: Pick<IPost, "author">,
  requesterId: string
) => getPostAuthorId(post) === requesterId;

export const canViewPost = (
  post: Pick<IPost, "author" | "visibility">,
  requesterId: string
) => {
  if (isPostOwner(post, requesterId)) {
    return true;
  }

  // access control
  switch (post.visibility) {
    case "public":
      return true;
    case "private":
      return false;
    case "friends-only":
      return false;
    case "community-only":
      return false;
    default:
      return false;
  }
};

export const assertCanViewPost = (
  post: Pick<IPost, "author" | "visibility">,
  requesterId: string
) => {
  if (!canViewPost(post, requesterId)) {
    throw new HttpError(403, "You are not allowed to access this post");
  }
};

export const assertCanManagePost = (
  post: Pick<IPost, "author">,
  requesterId: string
) => {
  if (!isPostOwner(post, requesterId)) {
    throw new HttpError(403, "You can only modify your own posts");
  }
};
