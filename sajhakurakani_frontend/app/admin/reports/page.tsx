import { getAdminReports } from "@/lib/api/admin";
import { getCsrfToken } from "@/lib/csrf";
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
  const page = Number(params.page ?? "1");
  const response = await getAdminReports({
    page,
    size: 20,
    status: params.status || "open",
    type: params.type,
  });

  return (
    <div className="space-y-4">
      <AdminReauthPanel csrfToken={csrfToken} />
      <section className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ef744b]">
          Reports
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1d243f]">
          Review open moderation cases
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6a7282]">
          Start from the report reason, then decide whether to dismiss, warn, suspend, ban, or hide the related content.
        </p>
      </section>
      <AdminReportsTable csrfToken={csrfToken} reports={response.data.data} />
    </div>
  );
}
