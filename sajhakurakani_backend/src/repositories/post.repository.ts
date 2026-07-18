import { QueryFilter } from "mongoose";
import { IPost, PostModel } from "../models/post.model";

export class PostRepository {
  async createPost(postData: Partial<IPost>) {
    const post = new PostModel(postData);
    await post.save();
    return this.getPostById(post._id.toString());
  }

  async getPostById(postId: string) {
    return PostModel.findById(postId).populate(
      "author",
      "firstName lastName username profileUrl"
    );
  }

  async listPostsByAuthor(authorId: string, page: number, size: number) {
    const filter: QueryFilter<IPost> = { author: authorId };

    const [posts, total] = await Promise.all([
      PostModel.find(filter)
        .populate("author", "firstName lastName username profileUrl")
        .sort({ createdAt: -1 })
        .skip((page - 1) * size)
        .limit(size),
      PostModel.countDocuments(filter),
    ]);

    return { posts, total };
  }
}
