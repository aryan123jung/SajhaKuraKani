import { QueryFilter } from "mongoose";
import { IPost, PostModel } from "../models/post.model";
import { POST_DUPLICATE_WINDOW_MS } from "../configs";

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

  async deletePostsByAuthor(authorId: string) {
    return PostModel.deleteMany({ author: authorId });
  }

  async listAllPostsByAuthor(authorId: string) {
    return PostModel.find({ author: authorId }).select("+title +content");
  }

  async findRecentDuplicateByAuthor(
    authorId: string,
    duplicateFingerprint: string
  ) {
    const createdAtThreshold = new Date(Date.now() - POST_DUPLICATE_WINDOW_MS);

    return PostModel.findOne({
      author: authorId,
      duplicateFingerprint,
      createdAt: { $gte: createdAtThreshold },
    }).select("+title +content +duplicateFingerprint");
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
