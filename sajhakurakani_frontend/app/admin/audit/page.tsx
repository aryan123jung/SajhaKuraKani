import { getAdminActivity, getAdminAuditLogs } from "@/lib/api/admin";

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default async function AdminAuditPage() {
  const [auditResponse, activityResponse] = await Promise.all([
    getAdminAuditLogs({ page: 1, size: 30 }),
    getAdminActivity(1, 20),
  ]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ef744b]">
          Audit Logs
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1d243f]">
          Immutable admin history
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#efe2d9] text-[#8c8690]">
                <th className="px-3 py-3 font-semibold">Action</th>
                <th className="px-3 py-3 font-semibold">Target</th>
                <th className="px-3 py-3 font-semibold">Result</th>
                <th className="px-3 py-3 font-semibold">When</th>
              </tr>
            </thead>
            <tbody>
              {auditResponse.data.data.map((log) => (
                <tr key={log._id} className="border-b border-[#f3e7df] align-top">
                  <td className="px-3 py-3 font-medium text-[#1d243f]">{log.action}</td>
                  <td className="px-3 py-3 text-[#6a7282]">
                    {log.targetType}
                    {log.targetId ? ` · ${log.targetId}` : ""}
                  </td>
                  <td className="px-3 py-3 text-[#6a7282]">{log.result}</td>
                  <td className="px-3 py-3 text-[#6a7282]">{formatDate(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ef744b]">
          Activity Feed
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1d243f]">
          Recent admin actions
        </h2>
        <div className="mt-4 space-y-3">
          {activityResponse.data.data.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[18px] border border-[#efe2d9] bg-[#fffaf6] px-4 py-3"
            >
              <p className="text-sm font-semibold text-[#1d243f]">{entry.action}</p>
              <p className="mt-1 text-sm text-[#6a7282]">
                {entry.targetType}
                {entry.targetId ? ` · ${entry.targetId}` : ""}
              </p>
              <p className="mt-2 text-xs text-[#8c8690]">{formatDate(entry.createdAt)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
