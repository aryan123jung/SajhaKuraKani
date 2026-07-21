import Link from "next/link";
import {
  getAdminActivity,
  getAdminHealth,
  getAdminReports,
  getAdminSecurityAlerts,
  getAdminStats,
} from "@/lib/api/admin";
import { getCsrfToken } from "@/lib/csrf";
import AdminReauthPanel from "./_components/AdminReauthPanel";

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default async function AdminOverviewPage() {
  const csrfToken = await getCsrfToken();
  const [statsResponse, healthResponse, reportsResponse, alertsResponse, activityResponse] =
    await Promise.all([
      getAdminStats(),
      getAdminHealth(),
      getAdminReports({ page: 1, size: 5, status: "open" }),
      getAdminSecurityAlerts(),
      getAdminActivity(1, 6),
    ]);

  return (
    <div className="space-y-4">
      <AdminReauthPanel csrfToken={csrfToken} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Users", value: statsResponse.data.users },
          { label: "Banned users", value: statsResponse.data.bannedUsers },
          { label: "Open reports", value: statsResponse.data.openReports },
          { label: "Rate limit", value: healthResponse.data.adminActionRateLimit },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]"
          >
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#8c8690]">
              {item.label}
            </p>
            <p className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-[#1d243f]">
              {item.value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ef744b]">
                Open Reports
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#1d243f]">
                Abuse cases waiting for review
              </h2>
            </div>
            <Link
              href="/admin/reports"
              className="rounded-[12px] border border-[#ead6ca] bg-[#fff8f3] px-4 py-2 text-sm font-semibold text-[#526077]"
            >
              View all
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {reportsResponse.data.data.map((report) => (
              <div
                key={report._id}
                className="rounded-[18px] border border-[#efe2d9] bg-[#fffaf6] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#1d243f]">
                    {report.type.replace("-", " ")}
                  </p>
                  <p className="text-xs text-[#8c8690]">{formatDate(report.createdAt)}</p>
                </div>
                <p className="mt-2 text-sm text-[#6a7282]">{report.reason || "No reason provided"}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ef744b]">
            System Health
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#1d243f]">
            Security surface snapshot
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] border border-[#efe2d9] bg-[#fffaf6] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8c8690]">Mongo</p>
              <p className="mt-2 text-sm font-semibold text-[#1d243f]">
                Ready state {healthResponse.data.mongoReadyState}
              </p>
            </div>
            <div className="rounded-[18px] border border-[#efe2d9] bg-[#fffaf6] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8c8690]">Redis</p>
              <p className="mt-2 text-sm font-semibold text-[#1d243f]">
                {healthResponse.data.redisConfigured ? "Configured" : "Not configured"}
              </p>
            </div>
            <div className="rounded-[18px] border border-[#efe2d9] bg-[#fffaf6] px-4 py-3 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8c8690]">Uptime</p>
              <p className="mt-2 text-sm font-semibold text-[#1d243f]">
                {healthResponse.data.uptimeSeconds} seconds
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ef744b]">
                Security Alerts
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#1d243f]">
                Recent suspicious signals
              </h2>
            </div>
            <Link
              href="/admin/security"
              className="rounded-[12px] border border-[#ead6ca] bg-[#fff8f3] px-4 py-2 text-sm font-semibold text-[#526077]"
            >
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {alertsResponse.data.slice(0, 5).map((alert) => (
              <div
                key={alert._id}
                className="rounded-[18px] border border-[#efe2d9] bg-[#fffaf6] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#1d243f]">{alert.type}</p>
                  <span className="rounded-full bg-[#fff0e6] px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#9c4f2e]">
                    {alert.severity}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#8c8690]">{formatDate(alert.createdAt)}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ef744b]">
                Recent Admin Activity
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#1d243f]">
                Immutable trail preview
              </h2>
            </div>
            <Link
              href="/admin/audit"
              className="rounded-[12px] border border-[#ead6ca] bg-[#fff8f3] px-4 py-2 text-sm font-semibold text-[#526077]"
            >
              View logs
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {activityResponse.data.data.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[18px] border border-[#efe2d9] bg-[#fffaf6] px-4 py-3"
              >
                <p className="text-sm font-semibold text-[#1d243f]">{entry.action}</p>
                <p className="mt-1 text-sm text-[#6a7282]">
                  {entry.targetType} {entry.targetId ? `· ${entry.targetId}` : ""}
                </p>
                <p className="mt-2 text-xs text-[#8c8690]">{formatDate(entry.createdAt)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
