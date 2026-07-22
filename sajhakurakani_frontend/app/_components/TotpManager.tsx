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
    <section className="rounded-[24px] border border-[#ead6ca] bg-white/94 p-6 shadow-[0_18px_42px_rgba(88,57,38,0.08)] sm:p-7">
      <div className="space-y-3">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ef744b]">
          Two-Factor Security
        </p>
        <h2 className="text-[1.7rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
          {totpEnabled ? "Two-factor authentication is enabled" : "Add authenticator-based 2FA"}
        </h2>
        <p className="text-[0.95rem] leading-7 text-[#6f7585]">
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
            <div className="rounded-[16px] border border-[#eadfd7] bg-[#fff9f5] px-4 py-3 text-sm text-[#6f7585]">
              {setupState.message}
            </div>
          ) : null}

          {setupStarted ? (
            <div className="space-y-5 rounded-[20px] border border-[#eadfd7] bg-[#fffaf7] p-5">
              <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                <div className="flex flex-col items-center rounded-[20px] border border-[#eadfd7] bg-white p-4">
                  <QRCodeSVG
                    value={setupState.otpAuthUrl}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#111111"
                    includeMargin
                  />
                  <p className="mt-4 text-center text-xs leading-5 text-[#6f7585]">
                    Scan this with Google Authenticator, Authy, or another TOTP app.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-[#1d243f]">
                    1. Open your authenticator app and choose “Scan a QR code”.
                  </p>
                  <p className="text-sm font-medium text-[#1d243f]">
                    2. If scanning is unavailable, use this manual backup key:
                  </p>
                  <div className="rounded-[16px] border border-[#eadfd7] bg-[#fff2ea] px-4 py-3 font-mono text-sm tracking-[0.18em] text-[#9c4f2e]">
                    {setupState.manualEntryKey}
                  </div>
                  <p className="text-xs leading-6 text-[#8c8793]">
                    Account type: time-based. Digits: 6. Period: 30 seconds.
                  </p>
                </div>
              </div>

              <form action={enableAction} className="space-y-4">
                <input type="hidden" name="_csrf" value={csrfToken} />

                <div className="space-y-2">
                  <label
                    htmlFor="enable-totp-code"
                    className="text-xs font-medium uppercase tracking-[0.24em] text-[#8c8793]"
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
                    className="w-full rounded-[16px] border border-[#ead6ca] bg-white px-4 py-3.5 text-sm text-[#1d243f] outline-none ring-0 transition focus:border-[#ef744b]"
                  />
                </div>

                {enableState.message ? (
                  <div className="rounded-[16px] border border-[#efb697] bg-[#fff0e6] px-4 py-3 text-sm text-[#9c4f2e]">
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
              className="text-xs font-medium uppercase tracking-[0.24em] text-[#8c8793]"
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
              className="w-full max-w-sm rounded-[16px] border border-[#ead6ca] bg-white px-4 py-3.5 text-sm text-[#1d243f] outline-none ring-0 transition focus:border-[#ef744b]"
            />
          </div>

          {disableState.message ? (
            <div className="rounded-[16px] border border-[#efb697] bg-[#fff0e6] px-4 py-3 text-sm text-[#9c4f2e]">
              {disableState.message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isDisablePending}
            className="inline-flex items-center justify-center rounded-2xl border border-[#ead6ca] bg-[#fff8f3] px-6 py-3.5 text-sm font-semibold text-[#526077] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDisablePending ? "Disabling..." : "Disable 2FA"}
          </button>
        </form>
      )}
    </section>
  );
}
