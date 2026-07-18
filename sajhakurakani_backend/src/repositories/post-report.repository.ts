import { IPostReport, PostReportModel } from "../models/post-report.model";

export class PostReportRepository {
  async createReport(reportData: Partial<IPostReport>) {
    const report = new PostReportModel(reportData);
    await report.save();
    return this.getReportById(report._id.toString());
  }

  async getReportById(reportId: string) {
    return PostReportModel.findById(reportId)
      .populate("reporter", "firstName lastName username")
      .populate("post", "visibility author");
  }

  async getOpenReportByReporterForPost(reporterId: string, postId: string) {
    return PostReportModel.findOne({
      reporter: reporterId,
      post: postId,
      status: "open",
    });
  }

  async listReportsByReporter(reporterId: string, page: number, size: number) {
    const [reports, total] = await Promise.all([
      PostReportModel.find({ reporter: reporterId })
        .populate("post", "visibility author createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * size)
        .limit(size),
      PostReportModel.countDocuments({ reporter: reporterId }),
    ]);

    return { reports, total };
  }
}
