import { getAdminHealth, getAdminSecurityAlerts } from "@/lib/api/admin";

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default async function AdminSecurityPage() {
  const [healthResponse, alertsResponse] = await Promise.all([
    getAdminHealth(),
    getAdminSecurityAlerts(),
  ]);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Mongo ready state",
            value: String(healthResponse.data.mongoReadyState),
          },
          {
            label: "Redis configured",
            value: healthResponse.data.redisConfigured ? "Yes" : "No",
          },
          {
            label: "Uptime",
            value: `${healthResponse.data.uptimeSeconds}s`,
          },
          {
            label: "Admin rate limit",
            value: String(healthResponse.data.adminActionRateLimit),
          },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]"
          >
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#8c8690]">
              {item.label}
            </p>
            <p className="mt-3 text-[1.6rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
              {item.value}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ef744b]">
          Security Alerts
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1d243f]">
          Suspicious admin activity and network violations
        </h2>
        <div className="mt-4 space-y-3">
          {alertsResponse.data.map((alert) => (
            <article
              key={alert._id}
              className="rounded-[18px] border border-[#efe2d9] bg-[#fffaf6] px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#1d243f]">{alert.type}</p>
                  <p className="mt-1 text-xs text-[#8c8690]">
                    {alert.ipAddress ? `${alert.ipAddress} · ` : ""}
                    {formatDate(alert.createdAt)}
                  </p>
                </div>
                <span className="rounded-full bg-[#fff0e6] px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#9c4f2e]">
                  {alert.severity}
                </span>
              </div>
              {alert.userAgent ? (
                <p className="mt-3 text-sm leading-6 text-[#6a7282]">{alert.userAgent}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
