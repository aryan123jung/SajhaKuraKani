import fs from "fs";
import { Types } from "mongoose";
import { PostCommentReportModel } from "../models/post-comment-report.model";
import { PostCommentModel } from "../models/post-comment.model";
import { PostInteractionAuditModel } from "../models/post-interaction-audit.model";
import { PostLikeModel } from "../models/post-like.model";
import { PostModel } from "../models/post.model";
import { PostReportModel } from "../models/post-report.model";
import {
  getPostMediaStoragePath,
  type PostMediaStorageKind,
} from "./post-media-security.util";

const removeStoredPostMedia = (mediaUrl: string) => {
  try {
    const resolvedMediaUrl = new URL(mediaUrl, "http://localhost");
    const segments = resolvedMediaUrl.pathname.split("/").filter(Boolean);
    const kind = segments[3];
    const filename = segments[4];

    if (
      (kind === "images" || kind === "videos") &&
      typeof filename === "string"
    ) {
      const filePath = getPostMediaStoragePath(
        kind as PostMediaStorageKind,
        filename
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch {
    // Best-effort cleanup only.
  }
};

export const purgePostsByAuthor = async (authorId: string) => {
  const posts = await PostModel.find({ author: authorId }).select("media");
  const postIds = posts.map((post) => post._id as Types.ObjectId);

  for (const post of posts) {
    for (const mediaItem of post.media) {
      removeStoredPostMedia(mediaItem.url);
    }
  }

  if (postIds.length > 0) {
    const commentIds = (
      await PostCommentModel.find({ post: { $in: postIds } }).select("_id")
    ).map((comment) => comment._id as Types.ObjectId);

    await Promise.all([
      PostLikeModel.deleteMany({ post: { $in: postIds } }),
      PostReportModel.deleteMany({ post: { $in: postIds } }),
      PostInteractionAuditModel.deleteMany({ post: { $in: postIds } }),
      PostCommentModel.deleteMany({ post: { $in: postIds } }),
      PostCommentReportModel.deleteMany({
        $or: [
          { post: { $in: postIds } },
          ...(commentIds.length > 0 ? [{ comment: { $in: commentIds } }] : []),
        ],
      }),
    ]);
  }

  const deleteResult = await PostModel.deleteMany({ author: authorId });

  return {
    deletedCount: deleteResult.deletedCount ?? 0,
  };
};
