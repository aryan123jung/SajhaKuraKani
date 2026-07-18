import fs from "fs";
import { Request, Response } from "express";
import z from "zod";
import {
  CreatePostDto,
  ListPostsQueryDto,
  PostAuthorParamsDto,
  PostIdParamsDto,
  PostMediaParamsDto,
  UpdatePostDto,
} from "../dtos/post.dtos";
import { PostService } from "../services/post.service";
import { getClientIp } from "../middleware/rate-limit.middleware";
import { logPostAuditEvent } from "../utils/post-audit.util";

const postService = new PostService();

export class PostController {
  async createPost(req: Request, res: Response) {
    try {
      const authorId = req.user?._id?.toString();
      if (!authorId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const parsedData = CreatePostDto.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedData.error),
        });
      }

      const filesMap =
        req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const mediaFiles = filesMap?.media ?? [];

      const { post, contentHash } = await postService.createPersonalPost(
        authorId,
        parsedData.data,
        mediaFiles
      );

      // post audit logging
      logPostAuditEvent({
        action: "post.create",
        postId: post._id?.toString(),
        userId: authorId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"],
        visibility: post.visibility,
        mediaCount: post.media.length,
        contentHash,
      });

      return res.status(201).json({
        success: true,
        message: "Post created successfully",
        data: post,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async getCurrentUserPosts(req: Request, res: Response) {
    try {
      const authorId = req.user?._id?.toString();
      if (!authorId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const parsedQuery = ListPostsQueryDto.safeParse(req.query);
      if (!parsedQuery.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedQuery.error),
        });
      }

      const { posts, total } = await postService.getPersonalPosts(
        authorId,
        parsedQuery.data.page,
        parsedQuery.data.size
      );

      return res.status(200).json({
        success: true,
        message: "Posts fetched successfully",
        data: posts,
        pagination: {
          page: parsedQuery.data.page,
          size: parsedQuery.data.size,
          total,
          totalPages: Math.ceil(total / parsedQuery.data.size),
        },
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async getUserPosts(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const parsedQuery = ListPostsQueryDto.safeParse(req.query);
      if (!parsedQuery.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedQuery.error),
        });
      }

      const parsedParams = PostAuthorParamsDto.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }

      const { posts, total } = await postService.getAccessiblePostsByAuthor(
        requesterId,
        parsedParams.data.userId,
        parsedQuery.data.page,
        parsedQuery.data.size
      );

      return res.status(200).json({
        success: true,
        message: "Posts fetched successfully",
        data: posts,
        pagination: {
          page: parsedQuery.data.page,
          size: parsedQuery.data.size,
          total,
          totalPages: Math.ceil(total / parsedQuery.data.size),
        },
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async getPostById(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const parsedParams = PostIdParamsDto.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }

      const post = await postService.getAccessiblePostById(
        requesterId,
        parsedParams.data.postId
      );

      return res.status(200).json({
        success: true,
        message: "Post fetched successfully",
        data: post,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async updatePost(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const parsedData = UpdatePostDto.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedData.error),
        });
      }

      const parsedParams = PostIdParamsDto.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }

      const { post, contentHash } = await postService.updatePersonalPost(
        requesterId,
        parsedParams.data.postId,
        parsedData.data
      );

      logPostAuditEvent({
        action: "post.update",
        postId: post._id?.toString(),
        userId: requesterId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"],
        visibility: post.visibility,
        mediaCount: post.media.length,
        contentHash,
      });

      return res.status(200).json({
        success: true,
        message: "Post updated successfully",
        data: post,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async deletePost(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const parsedParams = PostIdParamsDto.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }

      const { post, contentHash } = await postService.deletePersonalPost(
        requesterId,
        parsedParams.data.postId
      );

      logPostAuditEvent({
        action: "post.delete",
        postId: post._id?.toString(),
        userId: requesterId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"],
        visibility: post.visibility,
        mediaCount: post.media.length,
        contentHash,
      });

      return res.status(200).json({
        success: true,
        message: "Post deleted successfully",
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async deleteAllMyPosts(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const result = await postService.deleteAllPersonalPosts(requesterId);

      logPostAuditEvent({
        action: "post.bulk-delete",
        userId: requesterId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"],
        contentHash: `deleted:${result.deletedCount}`,
      });

      return res.status(200).json({
        success: true,
        message: "All of your posts were deleted successfully",
        data: result,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async getPostMedia(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const parsedParams = PostMediaParamsDto.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }

      const mediaAsset = await postService.getPostMedia(
        requesterId,
        parsedParams.data.kind,
        parsedParams.data.filename
      );

      res.setHeader("Content-Type", mediaAsset.mimeType);
      res.setHeader("Content-Length", String(mediaAsset.fileSize));
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, max-age=300");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${mediaAsset.fileName}"`
      );

      return fs.createReadStream(mediaAsset.filePath).pipe(res);
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }
}
