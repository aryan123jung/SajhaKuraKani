import { HttpError } from "../errors/http-error";
import {
  COMMENT_DUPLICATE_WINDOW_MS,
} from "../configs";
import { IPost } from "../models/post.model";
import { IPostComment } from "../models/post-comment.model";
import { PostInteractionAuditModel } from "../models/post-interaction-audit.model";
import { PostCommentRepository } from "../repositories/post-comment.repository";
import { PostCommentReportRepository } from "../repositories/post-comment-report.repository";
import { PostLikeRepository } from "../repositories/post-like.repository";
import { PostRepository } from "../repositories/post.repository";
import { UserRepository } from "../repositories/user.repository";
import { moderatePostContent } from "./post-moderation.service";
import {
  createCommentContentHash,
  createCommentDuplicateFingerprint,
} from "../utils/post-interaction-audit.util";
import { sanitizePostText } from "../utils/post-sanitizer.util";
import {
  assertPostContentDoesNotContainSensitiveData,
  decryptProtectedText,
  encryptProtectedText,
} from "../utils/post-data-protection.util";
import { assertPostLinksAreSafe } from "../utils/post-link-security.util";
import {
  assertCanCommentOnPostWithUsers,
  assertCanViewCommentsForPost,
  assertCanViewPostWithUsers,
  isPostOwnerWithUser,
} from "../utils/post-social-access.util";

const postRepository = new PostRepository();
const userRepository = new UserRepository();
const postCommentRepository = new PostCommentRepository();
const postCommentReportRepository = new PostCommentReportRepository();
const postLikeRepository = new PostLikeRepository();

const getReferenceId = (value: unknown) => {
  if (value && typeof value === "object" && "_id" in (value as Record<string, unknown>)) {
    return String((value as { _id: unknown })._id);
  }

  return String(value);
};

const getCommentAuthorId = (comment: Pick<IPostComment, "author">) =>
  getReferenceId(comment.author);

const serializeCommentForResponse = <T extends IPostComment>(comment: T) => {
  const serializedComment = comment.toObject ? comment.toObject() : { ...comment };
  const decryptedContent =
    comment.isDeleted
      ? undefined
      : comment.content ?? decryptProtectedText(comment.contentEncrypted);

  return {
    ...serializedComment,
    content: comment.isDeleted ? "[deleted]" : decryptedContent,
    contentEncrypted: undefined,
    contentHash: undefined,
    duplicateFingerprint: undefined,
  };
};

export class PostInteractionService {
  private async resolvePostContext(requesterId: string, postId: string) {
    const post = await postRepository.getPostByIdForAccess(postId);

    if (!post) {
      throw new HttpError(404, "Post was not found");
    }

    const [requester, author] = await Promise.all([
      userRepository.getUserById(requesterId),
      userRepository.getUserById(post.author.toString()),
    ]);

    if (!requester) {
      throw new HttpError(401, "Unauthorized");
    }

    if (!author || author.isBanned) {
      throw new HttpError(404, "Post was not found");
    }

    return { post, requester, author };
  }

  private async logInteractionAuditEvent(params: {
    action:
      | "comment.create"
      | "comment.update"
      | "comment.delete"
      | "comment.report"
      | "like.create"
      | "like.delete";
    actorUserId: string;
    targetUserId: string;
    postId: string;
    commentId?: string;
    ipAddress: string;
    userAgent?: string;
    contentHash?: string;
  }) {
    await PostInteractionAuditModel.create({
      action: params.action,
      actorUserId: params.actorUserId,
      targetUserId: params.targetUserId,
      post: params.postId,
      comment: params.commentId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      contentHash: params.contentHash,
    });
  }

  async listComments(requesterId: string, postId: string, page: number, size: number) {
    const { post, requester, author } = await this.resolvePostContext(requesterId, postId);

    assertCanViewCommentsForPost({
      post,
      author,
      requester,
      requesterId,
    });

    const { comments, total } = await postCommentRepository.listCommentsByPost(
      postId,
      page,
      size
    );

    return {
      comments: comments.map((comment) => serializeCommentForResponse(comment)),
      total,
    };
  }

  async createComment(
    requesterId: string,
    postId: string,
    payload: { content: string },
    auditContext: { ipAddress: string; userAgent?: string }
  ) {
    const { post, requester, author } = await this.resolvePostContext(requesterId, postId);

    assertCanCommentOnPostWithUsers({
      post,
      author,
      requester,
      requesterId,
    });

    const content = sanitizePostText(payload.content);

    if (!content) {
      throw new HttpError(400, "Comment content is required");
    }

    assertPostContentDoesNotContainSensitiveData(undefined, content);
    assertPostLinksAreSafe(undefined, content);
    moderatePostContent(undefined, content);

    const duplicateFingerprint = createCommentDuplicateFingerprint(content);
    const existingDuplicate =
      await postCommentRepository.findRecentDuplicateByAuthorOnPost(
        requesterId,
        postId,
        duplicateFingerprint,
        new Date(Date.now() - COMMENT_DUPLICATE_WINDOW_MS)
      );

    if (existingDuplicate) {
      throw new HttpError(
        409,
        "A very similar comment was already posted recently. Please avoid spam."
      );
    }

    const contentHash = createCommentContentHash(content);
    const createdComment = await postCommentRepository.createComment({
      post: post._id,
      author: requester._id,
      contentEncrypted: encryptProtectedText(content),
      contentHash,
      duplicateFingerprint,
      isDeleted: false,
    });

    if (!createdComment) {
      throw new HttpError(500, "Comment could not be created");
    }

    await this.logInteractionAuditEvent({
      action: "comment.create",
      actorUserId: requesterId,
      targetUserId: author._id.toString(),
      postId,
      commentId: createdComment._id.toString(),
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      contentHash,
    });

    return serializeCommentForResponse(createdComment);
  }

  async updateComment(
    requesterId: string,
    commentId: string,
    payload: { content: string },
    auditContext: { ipAddress: string; userAgent?: string }
  ) {
    const existingComment = await postCommentRepository.getCommentById(commentId);

    if (!existingComment || existingComment.isDeleted) {
      throw new HttpError(404, "Comment was not found");
    }

    const postId =
      getReferenceId(existingComment.post);
    const { post, requester, author } = await this.resolvePostContext(requesterId, postId);

    assertCanCommentOnPostWithUsers({
      post: post as IPost,
      author,
      requester,
      requesterId,
    });

    if (getCommentAuthorId(existingComment) !== requesterId) {
      throw new HttpError(404, "Comment was not found");
    }

    const content = sanitizePostText(payload.content);

    if (!content) {
      throw new HttpError(400, "Comment content is required");
    }

    assertPostContentDoesNotContainSensitiveData(undefined, content);
    assertPostLinksAreSafe(undefined, content);
    moderatePostContent(undefined, content);

    const contentHash = createCommentContentHash(content);
    const updatedComment = await postCommentRepository.updateComment(commentId, {
      contentEncrypted: encryptProtectedText(content),
      contentHash,
      duplicateFingerprint: createCommentDuplicateFingerprint(content),
    });

    if (!updatedComment) {
      throw new HttpError(500, "Comment could not be updated");
    }

    await this.logInteractionAuditEvent({
      action: "comment.update",
      actorUserId: requesterId,
      targetUserId: author._id.toString(),
      postId,
      commentId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      contentHash,
    });

    return serializeCommentForResponse(updatedComment);
  }

  async deleteComment(
    requesterId: string,
    commentId: string,
    auditContext: { ipAddress: string; userAgent?: string }
  ) {
    const existingComment = await postCommentRepository.getCommentById(commentId);

    if (!existingComment || existingComment.isDeleted) {
      throw new HttpError(404, "Comment was not found");
    }

    const postId =
      getReferenceId(existingComment.post);
    const { post, requester, author } = await this.resolvePostContext(requesterId, postId);

    assertCanViewPostWithUsers({
      post,
      author,
      requester,
      requesterId,
    });

    const commentAuthorId = getCommentAuthorId(existingComment);
    const isPostOwner = isPostOwnerWithUser(post, requesterId);
    const isCommentOwner = commentAuthorId === requesterId;

    if (!isPostOwner && !isCommentOwner) {
      throw new HttpError(404, "Comment was not found");
    }

    const decryptedContent =
      existingComment.content ??
      decryptProtectedText(existingComment.contentEncrypted) ??
      "";
    const contentHash = createCommentContentHash(decryptedContent);

    const deletedComment = await postCommentRepository.updateComment(commentId, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: requester._id,
    });

    if (!deletedComment) {
      throw new HttpError(500, "Comment could not be deleted");
    }

    await this.logInteractionAuditEvent({
      action: "comment.delete",
      actorUserId: requesterId,
      targetUserId: commentAuthorId,
      postId,
      commentId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      contentHash,
    });

    return serializeCommentForResponse(deletedComment);
  }

  async reportComment(
    requesterId: string,
    commentId: string,
    payload: { reason: string; details?: string },
    auditContext: { ipAddress: string; userAgent?: string }
  ) {
    const existingComment = await postCommentRepository.getCommentById(commentId);

    if (!existingComment || existingComment.isDeleted) {
      throw new HttpError(404, "Comment was not found");
    }

    const postId =
      getReferenceId(existingComment.post);
    const { post, requester, author } = await this.resolvePostContext(requesterId, postId);

    assertCanViewPostWithUsers({
      post,
      author,
      requester,
      requesterId,
    });

    const commentAuthorId = getCommentAuthorId(existingComment);

    if (commentAuthorId === requesterId) {
      throw new HttpError(400, "You cannot report your own comment");
    }

    const existingReport =
      await postCommentReportRepository.getOpenReportByReporterForComment(
        requesterId,
        commentId
      );

    if (existingReport) {
      throw new HttpError(409, "You have already reported this comment");
    }

    const details = sanitizePostText(payload.details);
    const report = await postCommentReportRepository.createReport({
      comment: existingComment._id,
      post: post._id,
      reporter: requester._id,
      reason: payload.reason as any,
      details,
      status: "open",
    });

    if (!report) {
      throw new HttpError(500, "Comment report could not be created");
    }

    await this.logInteractionAuditEvent({
      action: "comment.report",
      actorUserId: requesterId,
      targetUserId: commentAuthorId,
      postId,
      commentId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return report;
  }

  async likePost(
    requesterId: string,
    postId: string,
    auditContext: { ipAddress: string; userAgent?: string }
  ) {
    const { post, requester, author } = await this.resolvePostContext(requesterId, postId);

    assertCanViewPostWithUsers({
      post,
      author,
      requester,
      requesterId,
    });

    const existingLike = await postLikeRepository.getLikeByPostAndUser(postId, requesterId);

    if (existingLike) {
      throw new HttpError(409, "You have already liked this post");
    }

    await postLikeRepository.createLike({
      post: post._id,
      user: requester._id,
    });

    await this.logInteractionAuditEvent({
      action: "like.create",
      actorUserId: requesterId,
      targetUserId: author._id.toString(),
      postId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return {
      liked: true,
      likeCount: await postLikeRepository.countLikesByPost(postId),
    };
  }

  async unlikePost(
    requesterId: string,
    postId: string,
    auditContext: { ipAddress: string; userAgent?: string }
  ) {
    const { post, requester, author } = await this.resolvePostContext(requesterId, postId);

    assertCanViewPostWithUsers({
      post,
      author,
      requester,
      requesterId,
    });

    const existingLike = await postLikeRepository.getLikeByPostAndUser(postId, requesterId);

    if (!existingLike) {
      throw new HttpError(404, "Like was not found");
    }

    await postLikeRepository.deleteLikeByPostAndUser(postId, requesterId);

    await this.logInteractionAuditEvent({
      action: "like.delete",
      actorUserId: requesterId,
      targetUserId: author._id.toString(),
      postId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return {
      liked: false,
      likeCount: await postLikeRepository.countLikesByPost(postId),
    };
  }
}
