import {
  revokeOtherSessionsAction,
  revokeSessionAction,
} from "@/lib/actions/auth";
import type { AuthSession } from "@/lib/api/auth";

type SessionManagerProps = {
  csrfToken: string;
  sessions: AuthSession[];
  notice?: string | null;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const getSessionLabel = (current: boolean) =>
  current ? "This device session" : "Saved device session";

export default function SessionManager({
  csrfToken,
  sessions,
  notice,
}: SessionManagerProps) {
  const otherSessionsCount = sessions.filter((session) => !session.current).length;

  return (
    <section className="rounded-[24px] border border-[#ead6ca] bg-white/94 p-6 shadow-[0_18px_42px_rgba(88,57,38,0.08)] sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ef744b]">
            Session Management
          </p>
          <h2 className="text-[1.7rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
            Active device sessions
          </h2>
          <p className="text-[0.95rem] leading-7 text-[#6f7585]">
            Each login creates a separate refresh-token session. Access tokens rotate every
            10 minutes, while refresh tokens remain valid for up to 15 days unless you revoke
            them here or log out.
          </p>
        </div>

        {otherSessionsCount > 0 ? (
          <form action={revokeOtherSessionsAction}>
            <input type="hidden" name="_csrf" value={csrfToken} />
            <button
              type="submit"
              className="inline-flex rounded-2xl border border-[#ead6ca] bg-[#fff8f3] px-5 py-3 text-sm font-semibold text-[#526077] transition hover:bg-white"
            >
              Sign Out Other Devices
            </button>
          </form>
        ) : null}
      </div>

      {notice ? (
        <div className="mt-6 rounded-[16px] border border-[#b7dfc6] bg-[#eef9f1] px-4 py-3 text-sm text-[#2d7350]">
          {notice}
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="rounded-[20px] border border-[#eadfd7] bg-[#fffaf7] p-5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-base font-semibold text-[#1d243f]">
                    {getSessionLabel(session.current)}
                  </p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      session.current
                        ? "bg-[#eef9f1] text-[#2d7350]"
                        : "bg-[#f5ede8] text-[#6f7585]"
                    }`}
                  >
                    {session.current ? "Current session" : "Active"}
                  </span>
                </div>

                <div className="grid gap-3 text-sm text-[#6f7585] sm:grid-cols-3">
                  <p>Signed in: {formatDate(session.createdAt)}</p>
                  <p>Last used: {formatDate(session.lastUsedAt)}</p>
                  <p>Expires: {formatDate(session.expiresAt)}</p>
                </div>
              </div>

              {!session.current ? (
                <form action={revokeSessionAction}>
                  <input type="hidden" name="_csrf" value={csrfToken} />
                  <input type="hidden" name="sessionId" value={session.id} />
                  <button
                    type="submit"
                    className="inline-flex rounded-2xl border border-[#efb697] bg-[#fff0e6] px-4 py-2.5 text-sm font-semibold text-[#9c4f2e] transition hover:bg-[#ffe7d8]"
                  >
                    Revoke Session
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
