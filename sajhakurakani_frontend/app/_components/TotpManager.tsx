"use client";

import { useActionState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  initialTotpCodeActionState,
  initialTotpSetupActionState,
} from "@/lib/actions/auth-state";
import {
  beginTotpSetupAction,
  disableTotpAction,
  enableTotpAction,
} from "@/lib/actions/totp";

type TotpManagerProps = {
  csrfToken: string;
  totpEnabled: boolean;
};

export default function TotpManager({
  csrfToken,
  totpEnabled,
}: TotpManagerProps) {
  const [setupState, setupAction, isSetupPending] = useActionState(
    beginTotpSetupAction,
    initialTotpSetupActionState
  );
  const [enableState, enableAction, isEnablePending] = useActionState(
    enableTotpAction,
    initialTotpCodeActionState
  );
  const [disableState, disableAction, isDisablePending] = useActionState(
    disableTotpAction,
    initialTotpCodeActionState
  );

  const setupStarted = Boolean(setupState.manualEntryKey);

  return (
    <section className="mt-10 rounded-[32px] border border-white/10 bg-white/5 p-6 sm:p-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.28em] text-[#ffb089]">
          Two-Factor Security
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
          {totpEnabled ? "Two-factor authentication is enabled" : "Add authenticator-based 2FA"}
        </h2>
        <p className="text-sm leading-7 text-white/60">
          {totpEnabled
            ? "Your password sign-in now requires the current 6-digit code from your authenticator app."
            : "Protect your account with a 6-digit TOTP code from Google Authenticator, Authy, or another compatible app."}
        </p>
      </div>

      {!totpEnabled ? (
        <div className="mt-6 space-y-5">
          {!setupStarted ? (
            <form action={setupAction}>
              <input type="hidden" name="_csrf" value={csrfToken} />
              <button
                type="submit"
                disabled={isSetupPending}
                className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7683c_0%,#ff9f6e_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(247,104,60,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSetupPending ? "Preparing setup..." : "Start 2FA Setup"}
              </button>
            </form>
          ) : null}

          {setupState.message ? (
            <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-white/75">
              {setupState.message}
            </div>
          ) : null}

          {setupStarted ? (
            <div className="space-y-5 rounded-3xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-5">
              <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                <div className="flex flex-col items-center rounded-3xl border border-white/10 bg-white p-4">
                  <QRCodeSVG
                    value={setupState.otpAuthUrl}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#111111"
                    includeMargin
                  />
                  <p className="mt-4 text-center text-xs leading-5 text-black/70">
                    Scan this with Google Authenticator, Authy, or another TOTP app.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-white">
                    1. Open your authenticator app and choose “Scan a QR code”.
                  </p>
                  <p className="text-sm font-medium text-white">
                    2. If scanning is unavailable, use this manual backup key:
                  </p>
                  <div className="rounded-2xl border border-white/10 bg-[#161317] px-4 py-3 font-mono text-sm tracking-[0.18em] text-[#ffd6c0]">
                    {setupState.manualEntryKey}
                  </div>
                  <p className="text-xs leading-6 text-white/45">
                    Account type: time-based. Digits: 6. Period: 30 seconds.
                  </p>
                </div>
              </div>

              <form action={enableAction} className="space-y-4">
                <input type="hidden" name="_csrf" value={csrfToken} />

                <div className="space-y-2">
                  <label
                    htmlFor="enable-totp-code"
                    className="text-xs font-medium uppercase tracking-[0.24em] text-white/48"
                  >
                    Verification Code
                  </label>
                  <input
                    id="enable-totp-code"
                    name="code"
                    inputMode="numeric"
                    maxLength={6}
                    defaultValue={enableState.code}
                    placeholder="Enter 6-digit code"
                    className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-sm text-white outline-none ring-0 transition focus:border-[#ff9166] focus:bg-white/8"
                  />
                </div>

                {enableState.message ? (
                  <div className="rounded-2xl border border-[#ff885f]/35 bg-[#ff885f]/12 px-4 py-3 text-sm text-[#ffd4c4]">
                    {enableState.message}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isEnablePending}
                  className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7683c_0%,#ff9f6e_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(247,104,60,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isEnablePending ? "Enabling..." : "Enable 2FA"}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      ) : (
        <form action={disableAction} className="mt-6 space-y-4">
          <input type="hidden" name="_csrf" value={csrfToken} />

          <div className="space-y-2">
            <label
              htmlFor="disable-totp-code"
              className="text-xs font-medium uppercase tracking-[0.24em] text-white/48"
            >
              Current Authenticator Code
            </label>
            <input
              id="disable-totp-code"
              name="code"
              inputMode="numeric"
              maxLength={6}
              defaultValue={disableState.code}
              placeholder="Enter 6-digit code"
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-sm text-white outline-none ring-0 transition focus:border-[#ff9166] focus:bg-white/8"
            />
          </div>

          {disableState.message ? (
            <div className="rounded-2xl border border-[#ff885f]/35 bg-[#ff885f]/12 px-4 py-3 text-sm text-[#ffd4c4]">
              {disableState.message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isDisablePending}
            className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/4 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDisablePending ? "Disabling..." : "Disable 2FA"}
          </button>
        </form>
      )}
    </section>
  );
}
