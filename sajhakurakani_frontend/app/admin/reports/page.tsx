import { getAdminReports } from "@/lib/api/admin";
import { getCsrfToken } from "@/lib/csrf";
import AdminPageHeader from "../_components/AdminPageHeader";
import AdminPagination from "../_components/AdminPagination";
import AdminReauthPanel from "../_components/AdminReauthPanel";
import AdminReportsTable from "../_components/AdminReportsTable";

type AdminReportsPageProps = {
  searchParams: Promise<{
    page?: string;
    status?: string;
    type?: "post" | "comment" | "friend-request";
  }>;
};

export default async function AdminReportsPage({ searchParams }: AdminReportsPageProps) {
  const params = await searchParams;
  const csrfToken = await getCsrfToken();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const status = params.status || "open";
  const type = params.type;
  const response = await getAdminReports({
    page,
    size: 20,
    status,
    type,
  });

  const reports = response.data.data;
  const pagination = response.data.pagination;
  const counts = {
    total: pagination.total,
    post: reports.filter((report) => report.type === "post").length,
    comment: reports.filter((report) => report.type === "comment").length,
    friendRequest: reports.filter((report) => report.type === "friend-request").length,
  };

  return (
    <div className="space-y-4">
      <AdminReauthPanel csrfToken={csrfToken} />
      <AdminPageHeader
        eyebrow="Reports"
        title="Review open moderation cases"
        description="Filter cases by status or target type, unlock your admin re-verification once, and then process abuse reports without leaving the queue."
        stats={[
          { label: "Loaded", value: reports.length },
          { label: "Total matches", value: counts.total },
          { label: "Post reports", value: counts.post },
          { label: "Comment or request", value: counts.comment + counts.friendRequest },
        ]}
      />

      <section className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
        <form action="/admin/reports" className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <select
            name="status"
            defaultValue={status}
            className="rounded-[14px] border border-[#ead9ce] bg-[#fffdfa] px-4 py-3 text-sm text-[#1d243f] outline-none"
          >
            <option value="open">Open</option>
            <option value="dismissed">Dismissed</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            name="type"
            defaultValue={type ?? ""}
            className="rounded-[14px] border border-[#ead9ce] bg-[#fffdfa] px-4 py-3 text-sm text-[#1d243f] outline-none"
          >
            <option value="">All report types</option>
            <option value="post">Post</option>
            <option value="comment">Comment</option>
            <option value="friend-request">Friend request</option>
          </select>
          <button
            type="submit"
            className="rounded-[14px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(241,111,56,0.18)]"
          >
            Apply filters
          </button>
        </form>
      </section>

      <AdminReportsTable csrfToken={csrfToken} reports={reports} />
      <AdminPagination
        basePath="/admin/reports"
        page={pagination.page}
        size={pagination.size}
        total={pagination.total}
        query={{ status, type }}
      />
    </div>
  );
}
