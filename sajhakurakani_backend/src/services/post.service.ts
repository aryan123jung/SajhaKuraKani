import fs from "fs";
import path from "path";
import { HttpError } from "../errors/http-error";
import { IPost, IPostMedia } from "../models/post.model";
import { PostRepository } from "../repositories/post.repository";
import { UserRepository } from "../repositories/user.repository";
import { CreatePostInput, UpdatePostInput } from "../dtos/post.dtos";
import { POST_MEDIA_RESCAN_ON_READ } from "../configs";
import { PostReportRepository } from "../repositories/post-report.repository";
import { moderatePostContent } from "./post-moderation.service";
import { scanPostMediaFile } from "./post-antivirus.service";
import {
  createPostContentHash,
  createPostDuplicateFingerprint,
} from "../utils/post-audit.util";
import { sanitizePostText } from "../utils/post-sanitizer.util";
import {
  assertPostContentDoesNotContainSensitiveData,
  decryptPostFields,
  encryptPostFields,
  serializePostForResponse,
  serializePostsForResponse,
} from "../utils/post-data-protection.util";
import {
  buildPostMediaUrl,
  cleanupUploadedFiles,
  getPostMediaKindFromMimeType,
  getPostMediaStoragePath,
  PostMediaStorageKind,
  validateStoredPostMedia,
} from "../utils/post-media-security.util";
import {
  assertCanManagePost,
  assertCanViewPost,
  canViewPost,
} from "../utils/post-visibility.util";
import { assertPostLinksAreSafe } from "../utils/post-link-security.util";

const postRepository = new PostRepository();
const postReportRepository = new PostReportRepository();
const userRepository = new UserRepository();

const mapPostMedia = (files: Express.Multer.File[]): IPostMedia[] =>
  files.map((file) => ({
    url: buildPostMediaUrl(getPostMediaKindFromMimeType(file.mimetype), file.filename),
    type: file.mimetype.startsWith("video/") ? "video" : "image",
    mimeType: file.mimetype,
  }));

export class PostService {
  async createPersonalPost(
    authorId: string,
    payload: CreatePostInput,
    files: Express.Multer.File[]
  ) {
    const author = await userRepository.getUserById(authorId);
    if (!author) {
      cleanupUploadedFiles(files);
      throw new HttpError(404, "Author was not found");
    }

    let postCreated = false;

    try {
      const title = sanitizePostText(payload.title);
      const content = sanitizePostText(payload.content);
      const media = mapPostMedia(files);
      const contentHash = createPostContentHash({
        title,
        content,
        visibility: payload.visibility,
        files,
      });
      const duplicateFingerprint = createPostDuplicateFingerprint({
        title,
        content,
        files,
      });

      if (!title && !content && media.length === 0) {
        throw new HttpError(400, "A post must include text or at least one media file");
      }

      if (media.length > 4) {
        throw new HttpError(400, "A post can include up to 4 media files");
      }

      // sensitive content protection
      assertPostContentDoesNotContainSensitiveData(title, content);
      // malicious link detection
      assertPostLinksAreSafe(title, content);
      // content moderation pipeline
      moderatePostContent(title, content);
      // duplicate post detection
      const recentDuplicate = await postRepository.findRecentDuplicateByAuthor(
        authorId,
        duplicateFingerprint
      );
      if (recentDuplicate) {
        throw new HttpError(
          409,
          "A very similar post was already shared recently. Please avoid duplicate posting."
        );
      }
      // data encryption at rest
      const encryptedFields = encryptPostFields(title, content);

      const createdPost = await postRepository.createPost({
        author: author._id,
        ...encryptedFields,
        contentHash,
        duplicateFingerprint,
        visibility: payload.visibility,
        commentPrivacy: payload.commentPrivacy,
        sharePrivacy: payload.sharePrivacy,
        media,
      });

      if (!createdPost) {
        throw new HttpError(500, "Post could not be created");
      }

      postCreated = true;

      return {
        post: serializePostForResponse(createdPost),
        contentHash,
      };
    } catch (error) {
      if (!postCreated) {
        // rollback cleanup for failed post creation
        cleanupUploadedFiles(files);
      }
      throw error;
    }
  }

  async getPersonalPosts(authorId: string, page: number, size: number) {
    const author = await userRepository.getUserById(authorId);
    if (!author) {
      throw new HttpError(404, "Author was not found");
    }

    const { posts, total } = await postRepository.listPostsByAuthor(
      authorId,
      page,
      size
    );

    return {
      posts: serializePostsForResponse(posts),
      total,
    };
  }

  async getAccessiblePostsByAuthor(
    requesterId: string,
    authorId: string,
    page: number,
    size: number
  ) {
    const author = await userRepository.getUserById(authorId);
    if (!author) {
      throw new HttpError(404, "Author was not found");
    }

    const { posts, total } = await postRepository.listPostsByAuthor(
      authorId,
      page,
      size
    );

    const visiblePosts = posts.filter((post) =>
      canViewPost(
        {
          author:
            typeof post.author === "object" && post.author && "_id" in post.author
              ? (post.author._id as IPost["author"])
              : (post.author as IPost["author"]),
          visibility: post.visibility,
        },
        requesterId
      )
    );

    return {
      posts: serializePostsForResponse(visiblePosts),
      total: visiblePosts.length,
    };
  }

  async getAccessiblePostById(requesterId: string, postId: string) {
    const postForAccess = await postRepository.getPostByIdForAccess(postId);
    if (!postForAccess) {
      throw new HttpError(404, "Post was not found");
    }

    assertCanViewPost(postForAccess, requesterId);

    const post = await postRepository.getPostById(postId);
    if (!post) {
      throw new HttpError(404, "Post was not found");
    }

    return serializePostForResponse(post);
  }

  async updatePersonalPost(
    requesterId: string,
    postId: string,
    payload: UpdatePostInput
  ) {
    const existingPost = await postRepository.getPostByIdForAccess(postId);
    if (!existingPost) {
      throw new HttpError(404, "Post was not found");
    }

    assertCanManagePost(existingPost, requesterId);

    const title =
      payload.title !== undefined ? sanitizePostText(payload.title) : undefined;
    const content =
      payload.content !== undefined
        ? sanitizePostText(payload.content)
        : undefined;
    const existingDecryptedFields = decryptPostFields(existingPost);

    if (
      (title !== undefined || content !== undefined) &&
      !title &&
      !content &&
      existingPost.media.length === 0
    ) {
      throw new HttpError(400, "A post must include text or at least one media file");
    }

    const nextTitle = title ?? existingDecryptedFields.title;
    const nextContent = content ?? existingDecryptedFields.content;
    const nextDuplicateFingerprint = createPostDuplicateFingerprint({
      title: nextTitle,
      content: nextContent,
    });

    assertPostContentDoesNotContainSensitiveData(nextTitle, nextContent);
    assertPostLinksAreSafe(nextTitle, nextContent);
    moderatePostContent(nextTitle, nextContent);

    const encryptedUpdates =
      payload.title !== undefined || payload.content !== undefined
        ? encryptPostFields(nextTitle, nextContent)
        : {};

    const updatedPost = await postRepository.updatePost(postId, {
      ...encryptedUpdates,
      duplicateFingerprint: nextDuplicateFingerprint,
      contentHash: createPostContentHash({
        title: nextTitle,
        content: nextContent,
        visibility: payload.visibility ?? existingPost.visibility,
      }),
      ...(payload.visibility !== undefined ? { visibility: payload.visibility } : {}),
      ...(payload.commentPrivacy !== undefined
        ? { commentPrivacy: payload.commentPrivacy }
        : {}),
      ...(payload.sharePrivacy !== undefined
        ? { sharePrivacy: payload.sharePrivacy }
        : {}),
    });

    if (!updatedPost) {
      throw new HttpError(500, "Post could not be updated");
    }

    return {
      post: serializePostForResponse(updatedPost),
      contentHash: createPostContentHash({
        title: nextTitle,
        content: nextContent,
        visibility: updatedPost.visibility,
      }),
    };
  }

  async deletePersonalPost(requesterId: string, postId: string) {
    const existingPost = await postRepository.getPostByIdForAccess(postId);
    if (!existingPost) {
      throw new HttpError(404, "Post was not found");
    }

    assertCanManagePost(existingPost, requesterId);

    for (const mediaItem of existingPost.media) {
      try {
        const mediaUrl = new URL(mediaItem.url, "http://localhost");
        const segments = mediaUrl.pathname.split("/").filter(Boolean);
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
          fs.unlinkSync(filePath);
        }
      } catch {
        // Best-effort cleanup for deleted post media.
      }
    }

    const deletedPost = await postRepository.deletePost(postId);
    if (!deletedPost) {
      throw new HttpError(500, "Post could not be deleted");
    }

    const deletedDecryptedFields = decryptPostFields(deletedPost);

    return {
      post: deletedPost,
      contentHash: createPostContentHash({
        title: deletedDecryptedFields.title,
        content: deletedDecryptedFields.content,
        visibility: deletedPost.visibility,
      }),
    };
  }

  async getPostMedia(
    requesterId: string,
    kind: string,
    filename: string
  ) {
    if (kind !== "images" && kind !== "videos") {
      throw new HttpError(404, "Media file was not found");
    }

    const normalizedKind = kind as PostMediaStorageKind;
    const mediaUrl = buildPostMediaUrl(normalizedKind, filename);
    const post = await postRepository.getPostByMediaUrl(mediaUrl);

    if (!post) {
      throw new HttpError(404, "Media file was not found");
    }

    assertCanViewPost(post, requesterId);

    const mediaEntry = post.media.find((media) => media.url === mediaUrl);
    if (!mediaEntry) {
      throw new HttpError(404, "Media file was not found");
    }

    const resolvedFilePath = getPostMediaStoragePath(normalizedKind, filename);

    // post-upload validation on retrieval
    validateStoredPostMedia(resolvedFilePath, mediaEntry.mimeType);

    if (POST_MEDIA_RESCAN_ON_READ) {
      // antivirus scanning
      await scanPostMediaFile(resolvedFilePath, "retrieval");
    }

    const fileStats = fs.statSync(resolvedFilePath);

    return {
      filePath: resolvedFilePath,
      mimeType: mediaEntry.mimeType,
      fileSize: fileStats.size,
      fileName: path.basename(resolvedFilePath),
      visibility: post.visibility,
    };
  }

  async reportPost(
    reporterId: string,
    postId: string,
    payload: {
      reason: string;
      details?: string;
    }
  ) {
    const post = await postRepository.getPostByIdForAccess(postId);
    if (!post) {
      throw new HttpError(404, "Post was not found");
    }

    if (post.author.toString() === reporterId) {
      throw new HttpError(400, "You cannot report your own post");
    }

    assertCanViewPost(post, reporterId);

    const existingOpenReport =
      await postReportRepository.getOpenReportByReporterForPost(reporterId, postId);
    if (existingOpenReport) {
      throw new HttpError(409, "You have already reported this post");
    }

    const details = sanitizePostText(payload.details);

    const report = await postReportRepository.createReport({
      post: post._id,
      reporter: reporterId as any,
      reason: payload.reason as any,
      details,
      status: "open",
    });

    if (!report) {
      throw new HttpError(500, "Report could not be created");
    }

    return report;
  }

  async getMyReports(reporterId: string, page: number, size: number) {
    return postReportRepository.listReportsByReporter(reporterId, page, size);
  }

  async deleteAllPersonalPosts(authorId: string) {
    const posts = await postRepository.listAllPostsByAuthor(authorId);

    for (const post of posts) {
      for (const mediaItem of post.media) {
        try {
          const mediaUrl = new URL(mediaItem.url, "http://localhost");
          const segments = mediaUrl.pathname.split("/").filter(Boolean);
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
            fs.unlinkSync(filePath);
          }
        } catch {
          // Best-effort cleanup for bulk deleted post media.
        }
      }
    }

    const deleteResult = await postRepository.deletePostsByAuthor(authorId);
    return {
      deletedCount: deleteResult.deletedCount ?? 0,
    };
  }
}
