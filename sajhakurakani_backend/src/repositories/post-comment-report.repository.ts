import {
  IPostCommentReport,
  PostCommentReportModel,
} from "../models/post-comment-report.model";

export class PostCommentReportRepository {
  async createReport(reportData: Partial<IPostCommentReport>) {
    const report = new PostCommentReportModel(reportData);
    await report.save();
    return this.getReportById(report._id.toString());
  }

  async getReportById(reportId: string) {
    return PostCommentReportModel.findById(reportId)
      .populate("reporter", "firstName lastName username")
      .populate("comment", "post author isDeleted")
      .populate("post", "visibility author");
  }

  async getOpenReportByReporterForComment(reporterId: string, commentId: string) {
    return PostCommentReportModel.findOne({
      reporter: reporterId,
      comment: commentId,
      status: "open",
    });
  }
}
