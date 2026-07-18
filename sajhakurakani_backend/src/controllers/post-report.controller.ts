import { Request, Response } from "express";
import z from "zod";
import { CreatePostReportDto, ListPostsQueryDto } from "../dtos/post.dtos";
import { getClientIp } from "../middleware/rate-limit.middleware";
import { PostService } from "../services/post.service";
import { logPostAuditEvent } from "../utils/post-audit.util";

const postService = new PostService();

export class PostReportController {
  async createReport(req: Request, res: Response) {
    try {
      const reporterId = req.user?._id?.toString();
      if (!reporterId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const parsedData = CreatePostReportDto.safeParse(req.body);
      if (!parsedData.success) {
        return res.status(400).json({
          success: false,
          message: z.prettifyError(parsedData.error),
        });
      }

      const report = await postService.reportPost(
        reporterId,
        req.params.postId,
        parsedData.data
      );

      logPostAuditEvent({
        action: "post.report",
        postId: req.params.postId,
        userId: reporterId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"],
        contentHash: `${parsedData.data.reason}:${report._id?.toString() ?? "report"}`,
      });

      return res.status(201).json({
        success: true,
        message: "Post reported successfully",
        data: report,
      });
    } catch (error: Error | any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  async getMyReports(req: Request, res: Response) {
    try {
      const reporterId = req.user?._id?.toString();
      if (!reporterId) {
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

      const { reports, total } = await postService.getMyReports(
        reporterId,
        parsedQuery.data.page,
        parsedQuery.data.size
      );

      return res.status(200).json({
        success: true,
        message: "Reports fetched successfully",
        data: reports,
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
}
