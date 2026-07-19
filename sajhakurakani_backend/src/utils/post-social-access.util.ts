import { HttpError } from "../errors/http-error";
import { IPost } from "../models/post.model";
import { IUser } from "../models/user.model";

const toUserId = (value: string | { toString(): string }) => value.toString();

export const areFriends = (
  user: Pick<IUser, "friends"> | null | undefined,
  otherUserId: string
) => (user?.friends || []).some((friendId) => friendId.toString() === otherUserId);

export const hasBlockedUser = (
  user: Pick<IUser, "blockedUsers"> | null | undefined,
  otherUserId: string
) =>
  (user?.blockedUsers || []).some(
    (blockedUserId) => blockedUserId.toString() === otherUserId
  );

export const isPostOwnerWithUser = (
  post: Pick<IPost, "author">,
  requesterId: string
) => toUserId(post.author) === requesterId;

export const canViewPostWithUsers = (params: {
  post: Pick<IPost, "author" | "visibility">;
  author: Pick<IUser, "_id" | "friends" | "blockedUsers" | "isBanned">;
  requester: Pick<IUser, "_id" | "friends" | "blockedUsers" | "isBanned"> | null;
  requesterId: string;
}) => {
  const { post, author, requester, requesterId } = params;

  if (author.isBanned) {
    return false;
  }

  if (isPostOwnerWithUser(post, requesterId)) {
    return true;
  }

  if (!requester || requester.isBanned) {
    return false;
  }

  if (
    hasBlockedUser(author, requesterId) ||
    hasBlockedUser(requester, author._id.toString())
  ) {
    return false;
  }

  switch (post.visibility) {
    case "public":
      return true;
    case "private":
      return false;
    case "friends-only":
      return areFriends(author, requesterId);
    default:
      return false;
  }
};

export const assertCanViewPostWithUsers = (params: {
  post: Pick<IPost, "author" | "visibility">;
  author: Pick<IUser, "_id" | "friends" | "blockedUsers" | "isBanned">;
  requester: Pick<IUser, "_id" | "friends" | "blockedUsers" | "isBanned"> | null;
  requesterId: string;
}) => {
  if (!canViewPostWithUsers(params)) {
    throw new HttpError(404, "Post was not found");
  }
};

export const canViewCommentsForPost = (params: {
  post: Pick<IPost, "author" | "visibility" | "commentPrivacy">;
  author: Pick<IUser, "_id" | "friends" | "blockedUsers" | "isBanned">;
  requester: Pick<IUser, "_id" | "friends" | "blockedUsers" | "isBanned"> | null;
  requesterId: string;
}) => {
  const { post, author, requester, requesterId } = params;

  if (
    !canViewPostWithUsers({
      post,
      author,
      requester,
      requesterId,
    })
  ) {
    return false;
  }

  if (isPostOwnerWithUser(post, requesterId)) {
    return true;
  }

  switch (post.commentPrivacy) {
    case "everyone":
      return true;
    case "friends-only":
      return areFriends(author, requesterId);
    case "no-one":
      return false;
    default:
      return false;
  }
};

export const assertCanViewCommentsForPost = (params: {
  post: Pick<IPost, "author" | "visibility" | "commentPrivacy">;
  author: Pick<IUser, "_id" | "friends" | "blockedUsers" | "isBanned">;
  requester: Pick<IUser, "_id" | "friends" | "blockedUsers" | "isBanned"> | null;
  requesterId: string;
}) => {
  if (!canViewCommentsForPost(params)) {
    throw new HttpError(404, "Post was not found");
  }
};

export const assertCanCommentOnPostWithUsers = (params: {
  post: Pick<IPost, "author" | "visibility" | "commentPrivacy">;
  author: Pick<IUser, "_id" | "friends" | "blockedUsers" | "isBanned">;
  requester: Pick<IUser, "_id" | "friends" | "blockedUsers" | "isBanned"> | null;
  requesterId: string;
}) => {
  if (!canViewCommentsForPost(params)) {
    throw new HttpError(404, "Post was not found");
  }
};
