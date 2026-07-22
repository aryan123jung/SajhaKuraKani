import SessionManager from "@/app/_components/SessionManager";
import TotpManager from "@/app/_components/TotpManager";
import { getCurrentUser, getSessions } from "@/lib/api/auth";
import { getAuthToken } from "@/lib/cookie";
import { getCsrfToken } from "@/lib/csrf";

type UserSettingsPageProps = {
  searchParams: Promise<{
    sessionRevoked?: string;
    otherSessionsRevoked?: string;
    sessionError?: string;
  }>;
};

export default async function UserSettingsPage({
  searchParams,
}: UserSettingsPageProps) {
  const params = await searchParams;
  const token = await getAuthToken();
  const csrfToken = await getCsrfToken();
  let user = null;
  let sessions = [] as Awaited<ReturnType<typeof getSessions>>["data"];

  if (token) {
    try {
      const [userResponse, sessionsResponse] = await Promise.all([
        getCurrentUser(),
        getSessions(),
      ]);
      user = userResponse.data;
      sessions = sessionsResponse.data;
    } catch {
      user = null;
      sessions = [];
    }
  }

  const sessionNotice =
    params.sessionRevoked === "1"
      ? "The selected device session has been revoked."
      : params.otherSessionsRevoked === "1"
        ? "All other device sessions have been revoked."
        : params.sessionError === "1"
          ? "We could not update your sessions right now."
          : null;

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-[#ead6ca] bg-white/94 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
        <div className="max-w-3xl space-y-3">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ef744b]">
            Settings
          </p>
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-[#1d243f] sm:text-[2.4rem]">
            Account security controls
          </h1>
          <p className="text-[0.98rem] leading-7 text-[#6f7585]">
            Manage your core account protection here, including two-factor
            authentication and active device sessions.
          </p>
        </div>
      </section>

      {user ? (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[20px] border border-[#ead6ca] bg-white/94 p-5 shadow-[0_14px_32px_rgba(88,57,38,0.06)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#8d8794]">
              Account
            </p>
            <p className="mt-3 text-[1.05rem] font-semibold text-[#1d243f]">
              {user.firstName} {user.lastName}
            </p>
          </div>

          <div className="rounded-[20px] border border-[#ead6ca] bg-white/94 p-5 shadow-[0_14px_32px_rgba(88,57,38,0.06)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#8d8794]">
              Username
            </p>
            <p className="mt-3 text-[1.05rem] font-semibold text-[#1d243f]">
              @{user.username}
            </p>
          </div>

          <div className="rounded-[20px] border border-[#ead6ca] bg-white/94 p-5 shadow-[0_14px_32px_rgba(88,57,38,0.06)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#8d8794]">
              2FA Status
            </p>
            <p className="mt-3 text-[1.05rem] font-semibold text-[#1d243f]">
              {user.totpEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
        </section>
      ) : null}

      {user ? (
        <TotpManager csrfToken={csrfToken} totpEnabled={Boolean(user.totpEnabled)} />
      ) : null}

      {user && sessions.length > 0 ? (
        <SessionManager
          csrfToken={csrfToken}
          sessions={sessions}
          notice={sessionNotice}
        />
      ) : null}
    </div>
  );
}
