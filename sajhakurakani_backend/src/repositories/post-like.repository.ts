import { IPostLike, PostLikeModel } from "../models/post-like.model";

export class PostLikeRepository {
  async getLikeByPostAndUser(postId: string, userId: string) {
    return PostLikeModel.findOne({ post: postId, user: userId });
  }

  async createLike(likeData: Partial<IPostLike>) {
    const like = new PostLikeModel(likeData);
    await like.save();
    return like;
  }

  async deleteLikeByPostAndUser(postId: string, userId: string) {
    return PostLikeModel.findOneAndDelete({ post: postId, user: userId });
  }

  async countLikesByPost(postId: string) {
    return PostLikeModel.countDocuments({ post: postId });
  }
}
