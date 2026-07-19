import { QueryFilter } from "mongoose";
import { IPostComment, PostCommentModel } from "../models/post-comment.model";

export class PostCommentRepository {
  async createComment(commentData: Partial<IPostComment>) {
    const comment = new PostCommentModel(commentData);
    await comment.save();
    return this.getCommentById(comment._id.toString());
  }

  async getCommentById(commentId: string) {
    return PostCommentModel.findById(commentId)
      .select("+content +contentHash +duplicateFingerprint")
      .populate("author", "firstName lastName username profileUrl")
      .populate("post", "author visibility commentPrivacy");
  }

  async getCommentByIdForModeration(commentId: string) {
    return PostCommentModel.findById(commentId).select(
      "+content +contentHash +duplicateFingerprint"
    );
  }

  async updateComment(commentId: string, commentData: Partial<IPostComment>) {
    await PostCommentModel.findByIdAndUpdate(commentId, commentData, {
      returnDocument: "after",
      runValidators: true,
    });

    return this.getCommentById(commentId);
  }

  async listCommentsByPost(postId: string, page: number, size: number) {
    const filter: QueryFilter<IPostComment> = { post: postId, isDeleted: false };

    const [comments, total] = await Promise.all([
      PostCommentModel.find(filter)
        .select("+content")
        .populate("author", "firstName lastName username profileUrl")
        .sort({ createdAt: 1 })
        .skip((page - 1) * size)
        .limit(size),
      PostCommentModel.countDocuments(filter),
    ]);

    return { comments, total };
  }

  async findRecentDuplicateByAuthorOnPost(
    authorId: string,
    postId: string,
    duplicateFingerprint: string,
    createdAtThreshold: Date
  ) {
    return PostCommentModel.findOne({
      author: authorId,
      post: postId,
      duplicateFingerprint,
      isDeleted: false,
      createdAt: { $gte: createdAtThreshold },
    }).select("+content +duplicateFingerprint");
  }
}
