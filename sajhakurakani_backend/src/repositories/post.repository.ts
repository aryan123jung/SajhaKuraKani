import { QueryFilter } from "mongoose";
import { IPost, PostModel } from "../models/post.model";

export class PostRepository {
  async createPost(postData: Partial<IPost>) {
    const post = new PostModel(postData);
    await post.save();
    return this.getPostById(post._id.toString());
  }

  async getPostById(postId: string) {
    return PostModel.findById(postId)
      .select("+title +content")
      .populate(
      "author",
      "firstName lastName username profileUrl"
      );
  }

  async getPostByIdForAccess(postId: string) {
    return PostModel.findById(postId).select("+title +content");
  }

  async getPostByMediaUrl(mediaUrl: string) {
    return PostModel.findOne({ "media.url": mediaUrl }).select("+title +content");
  }

  async updatePost(postId: string, postData: Partial<IPost>) {
    await PostModel.findByIdAndUpdate(postId, postData, {
      returnDocument: "after",
      runValidators: true,
    });

    return this.getPostById(postId);
  }

  async deletePost(postId: string) {
    return PostModel.findByIdAndDelete(postId);
  }

  async listPostsByAuthor(authorId: string, page: number, size: number) {
    const filter: QueryFilter<IPost> = { author: authorId };

    const [posts, total] = await Promise.all([
      PostModel.find(filter)
        .select("+title +content")
        .populate("author", "firstName lastName username profileUrl")
        .sort({ createdAt: -1 })
        .skip((page - 1) * size)
        .limit(size),
      PostModel.countDocuments(filter),
    ]);

    return { posts, total };
  }
}
