import fs from "fs";
import path from "path";
import { HttpError } from "../errors/http-error";
import { IPostMedia } from "../models/post.model";
import { PostRepository } from "../repositories/post.repository";
import { UserRepository } from "../repositories/user.repository";
import { CreatePostInput } from "../dtos/post.dtos";

const postRepository = new PostRepository();
const userRepository = new UserRepository();

const removeUploadedFiles = (files: Express.Multer.File[]) => {
  for (const file of files) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      // Best-effort cleanup if validation fails after upload.
    }
  }
};

const mapPostMedia = (files: Express.Multer.File[]): IPostMedia[] =>
  files.map((file) => ({
    url: `/uploads/posts/${file.mimetype.startsWith("video/") ? "videos" : "images"}/${file.filename}`,
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
      removeUploadedFiles(files);
      throw new HttpError(404, "Author was not found");
    }

    const title = payload.title?.trim();
    const content = payload.content?.trim();
    const media = mapPostMedia(files);

    if (!title && !content && media.length === 0) {
      removeUploadedFiles(files);
      throw new HttpError(400, "A post must include text or at least one media file");
    }

    if (media.length > 4) {
      removeUploadedFiles(files);
      throw new HttpError(400, "A post can include up to 4 media files");
    }

    const createdPost = await postRepository.createPost({
      author: author._id,
      title,
      content,
      visibility: payload.visibility,
      media,
    });

    if (!createdPost) {
      throw new HttpError(500, "Post could not be created");
    }

    return createdPost;
  }

  async getPersonalPosts(authorId: string, page: number, size: number) {
    const author = await userRepository.getUserById(authorId);
    if (!author) {
      throw new HttpError(404, "Author was not found");
    }

    return postRepository.listPostsByAuthor(authorId, page, size);
  }
}
