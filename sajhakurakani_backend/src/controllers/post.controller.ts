import { Request, Response } from "express";
import z from "zod";
import { CreatePostDto, ListPostsQueryDto } from "../dtos/post.dtos";
import { PostService } from "../services/post.service";

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

      const post = await postService.createPersonalPost(
        authorId,
        parsedData.data,
        mediaFiles
      );

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
}
