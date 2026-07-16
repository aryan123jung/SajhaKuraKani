import ProtectedShell from "@/app/_components/ProtectedShell";
import SessionManager from "@/app/_components/SessionManager";
import TotpManager from "@/app/_components/TotpManager";
import { getAuthToken } from "@/lib/cookie";
import { getCurrentUser, getSessions } from "@/lib/api/auth";
import { getCsrfToken } from "@/lib/csrf";

type SettingsPageProps = {
  searchParams: Promise<{
    sessionRevoked?: string;
    otherSessionsRevoked?: string;
    sessionError?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const token = await getAuthToken();
  const csrfToken = await getCsrfToken();
  let user = null;
  let sessionMessage: string | null = null;
  let sessions = [] as Awaited<ReturnType<typeof getSessions>>["data"];

  if (token) {
    try {
      const [userResponse, sessionsResponse] = await Promise.all([
        getCurrentUser(),
        getSessions(),
      ]);
      const response = userResponse;
      user = response.data;
      sessions = sessionsResponse.data;
    } catch (error) {
      sessionMessage =
        error instanceof Error
          ? error.message
          : "Unable to load your account right now.";
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
    <ProtectedShell
      currentPath="/settings"
      user={user}
      sessionMessage={sessionMessage}
    >
      <div className="max-w-4xl space-y-6">
        <div className="max-w-2xl space-y-4">
          <p className="text-xs uppercase tracking-[0.34em] text-[#ffb089]">
            Settings
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Account security controls
          </h1>
          <p className="text-base leading-8 text-white/62">
            Keep two-factor authentication here so it feels like a proper account
            setting instead of part of the landing screen. Once enabled, both
            password login and Google sign-in will require your authenticator
            code.
          </p>
        </div>

        {user ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">
                Account
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {user.firstName} {user.lastName}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">
                Email
              </p>
              <p className="mt-3 break-all text-lg font-semibold text-white">
                {user.email}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">
                2FA Status
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {user.totpEnabled ? "Enabled" : "Disabled"}
              </p>
            </div>
          </section>
        ) : null}

        {user ? (
          <TotpManager
            csrfToken={csrfToken}
            totpEnabled={Boolean(user.totpEnabled)}
          />
        ) : null}

        {user && sessions.length > 0 ? (
          <SessionManager
            csrfToken={csrfToken}
            sessions={sessions}
            notice={sessionNotice}
          />
        ) : null}
      </div>
    </ProtectedShell>
  );
}
