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

export default function SessionManager({
  csrfToken,
  sessions,
  notice,
}: SessionManagerProps) {
  const otherSessionsCount = sessions.filter((session) => !session.current).length;

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-[#ffb089]">
            Session Management
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
            Active device sessions
          </h2>
          <p className="text-sm leading-7 text-white/58">
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
              className="inline-flex rounded-2xl border border-white/12 bg-white/4 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/8"
            >
              Sign Out Other Devices
            </button>
          </form>
        ) : null}
      </div>

      {notice ? (
        <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {notice}
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="rounded-3xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-base font-semibold text-white">
                    {session.userAgent}
                  </p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      session.current
                        ? "bg-emerald-500/16 text-emerald-100"
                        : "bg-white/8 text-white/62"
                    }`}
                  >
                    {session.current ? "Current session" : "Active"}
                  </span>
                </div>

                <div className="grid gap-3 text-sm text-white/58 sm:grid-cols-3">
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
                    className="inline-flex rounded-2xl border border-[#ff885f]/35 bg-[#ff885f]/10 px-4 py-2.5 text-sm font-semibold text-[#ffd4c4] transition hover:bg-[#ff885f]/18"
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
