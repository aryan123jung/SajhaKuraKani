"use client";

import { useActionState } from "react";
import {
  cancelTotpLoginAction,
  completeTotpLoginAction,
} from "@/lib/actions/auth";
import {
  initialVerifyTotpActionState,
} from "@/lib/actions/auth-state";

type VerifyTotpFormProps = {
  csrfToken: string;
  email?: string;
  method: "google" | "password";
};

export default function VerifyTotpForm({
  csrfToken,
  email,
  method,
}: VerifyTotpFormProps) {
  const [state, formAction, isPending] = useActionState(
    completeTotpLoginAction,
    initialVerifyTotpActionState
  );

  const heading =
    method === "google"
      ? "Complete your Google sign-in"
      : "Complete your sign-in";
  const description =
    method === "google"
      ? "Google already verified your account. Enter the current 6-digit code from your authenticator app to finish signing in."
      : "Your password was accepted. Enter the current 6-digit code from your authenticator app to finish signing in.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(255,186,143,0.2),_transparent_26%),linear-gradient(135deg,#120f12_0%,#1d1a1f_40%,#221814_100%)] px-4 py-8 text-white sm:px-6">
      <div className="w-full max-w-md rounded-[34px] border border-white/10 bg-[rgba(20,18,20,0.82)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
        <div className="mb-8 space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#ffb089]">
            Two-Factor Verification
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white">
            {heading}
          </h1>
          <p className="text-sm leading-6 text-white/55">
            {description} {email ? `Account: ${email}.` : ""}
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="_csrf" value={csrfToken} />
          <input type="hidden" name="method" value={method} />

          <div className="space-y-2">
            <label
              htmlFor="code"
              className="text-xs font-medium uppercase tracking-[0.24em] text-white/48"
            >
              TOTP Code
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              maxLength={6}
              defaultValue={state.code}
              placeholder="Enter 6-digit code"
              className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-sm text-white outline-none ring-0 transition focus:border-[#ff9166] focus:bg-white/8"
            />
          </div>

          {state.message ? (
            <div className="rounded-2xl border border-[#ff885f]/35 bg-[#ff885f]/12 px-4 py-3 text-sm text-[#ffd4c4]">
              {state.message}
            </div>
          ) : null}

          <div className="space-y-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7683c_0%,#ff9f6e_100%)] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(247,104,60,0.35)] transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isPending ? "Verifying..." : "Verify And Continue"}
            </button>

            <button
              type="submit"
              formAction={cancelTotpLoginAction}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-white/12 bg-white/4 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/8"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
