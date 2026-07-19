import { Request, Response } from "express";
import z from "zod";
import {
  CommentIdParamsDto,
  CreateCommentDto,
  CreateCommentReportDto,
  ListPostsQueryDto,
  PostIdParamsDto,
  UpdateCommentDto,
} from "../dtos/post.dtos";
import { getClientIp } from "../middleware/rate-limit.middleware";
import { PostInteractionService } from "../services/post-interaction.service";

const postInteractionService = new PostInteractionService();

export class PostInteractionController {
  async listComments(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsedParams = PostIdParamsDto.safeParse(req.params);
      const parsedQuery = ListPostsQueryDto.safeParse(req.query);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }
      if (!parsedQuery.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedQuery.error),
        });
      }

      const { comments, total } = await postInteractionService.listComments(
        requesterId,
        parsedParams.data.postId,
        parsedQuery.data.page,
        parsedQuery.data.size
      );

      return res.status(200).json({
        success: true,
        message: "Comments fetched successfully",
        data: comments,
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

  async createComment(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsedParams = PostIdParamsDto.safeParse(req.params);
      const parsedBody = CreateCommentDto.safeParse(req.body);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }
      if (!parsedBody.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedBody.error),
        });
      }

      const comment = await postInteractionService.createComment(
        requesterId,
        parsedParams.data.postId,
        parsedBody.data,
        {
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"],
        }
      );

      return res.status(201).json({
        success: true,
        message: "Comment created successfully",
        data: comment,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async updateComment(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsedParams = CommentIdParamsDto.safeParse(req.params);
      const parsedBody = UpdateCommentDto.safeParse(req.body);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }
      if (!parsedBody.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedBody.error),
        });
      }

      const comment = await postInteractionService.updateComment(
        requesterId,
        parsedParams.data.commentId,
        parsedBody.data,
        {
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"],
        }
      );

      return res.status(200).json({
        success: true,
        message: "Comment updated successfully",
        data: comment,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async deleteComment(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsedParams = CommentIdParamsDto.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }

      const comment = await postInteractionService.deleteComment(
        requesterId,
        parsedParams.data.commentId,
        {
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"],
        }
      );

      return res.status(200).json({
        success: true,
        message: "Comment deleted successfully",
        data: comment,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async reportComment(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsedParams = CommentIdParamsDto.safeParse(req.params);
      const parsedBody = CreateCommentReportDto.safeParse(req.body);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }
      if (!parsedBody.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedBody.error),
        });
      }

      const report = await postInteractionService.reportComment(
        requesterId,
        parsedParams.data.commentId,
        parsedBody.data,
        {
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"],
        }
      );

      return res.status(201).json({
        success: true,
        message: "Comment reported successfully",
        data: report,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async likePost(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsedParams = PostIdParamsDto.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }

      const result = await postInteractionService.likePost(
        requesterId,
        parsedParams.data.postId,
        {
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"],
        }
      );

      return res.status(201).json({
        success: true,
        message: "Post liked successfully",
        data: result,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async unlikePost(req: Request, res: Response) {
    try {
      const requesterId = req.user?._id?.toString();
      if (!requesterId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsedParams = PostIdParamsDto.safeParse(req.params);
      if (!parsedParams.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedParams.error),
        });
      }

      const result = await postInteractionService.unlikePost(
        requesterId,
        parsedParams.data.postId,
        {
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"],
        }
      );

      return res.status(200).json({
        success: true,
        message: "Post unliked successfully",
        data: result,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }
}
