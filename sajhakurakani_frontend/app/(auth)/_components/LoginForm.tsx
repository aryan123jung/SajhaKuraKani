"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  initialLoginActionState,
  loginAction,
  startGoogleLoginAction,
} from "@/lib/actions/auth";

type LoginFormProps = {
  oauthError?: string;
};

export default function LoginForm({ oauthError }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialLoginActionState
  );
  const safeState = {
    ...initialLoginActionState,
    ...state,
    fields: {
      ...initialLoginActionState.fields,
      ...(state?.fields ?? {}),
    },
  };

  return (
    <div className="grid min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,186,143,0.28),_transparent_28%),linear-gradient(135deg,#120f12_0%,#1d1a1f_38%,#291d16_100%)] text-white lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative hidden overflow-hidden px-8 py-10 lg:flex lg:flex-col lg:justify-between xl:px-14">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_45%)]" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-lg font-bold text-[#ffb089] shadow-[0_10px_30px_rgba(0,0,0,0.24)]">
            SK
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/45">
              Secure Social Platform
            </p>
            <h1 className="text-lg font-semibold">SajhaKuraKani</h1>
          </div>
        </div>

        <div className="relative z-10 max-w-xl space-y-7">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.35em] text-[#ffb089]">
              Security Module Demo
            </p>
            <h2 className="max-w-lg text-5xl font-semibold leading-[1.05] tracking-[-0.03em] text-white">
              One login surface built for safer conversation spaces.
            </h2>
            <p className="max-w-md text-base leading-7 text-white/62">
              Email-password auth, optional TOTP verification, backend rate
              limiting, and Google OAuth are all wired into the same entry
              point for your coursework-ready flow.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Brute-force shield",
                value: "10-attempt lockout",
              },
              {
                label: "Second factor",
                value: "TOTP ready",
              },
              {
                label: "External identity",
                value: "Google OAuth",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur-sm"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">
                  {item.label}
                </p>
                <p className="mt-3 text-lg font-semibold text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="max-w-lg rounded-[32px] border border-white/10 bg-black/18 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.3)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">
              Login Flow
            </p>
            <div className="mt-4 grid gap-3">
              {[
                "Enter email and password",
                "Add TOTP code if 2FA is enabled",
                "Receive secure app token in an httpOnly cookie",
              ].map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/6 px-4 py-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ff885f] text-sm font-semibold text-[#1b1210]">
                    {index + 1}
                  </div>
                  <p className="text-sm text-white/72">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="w-full max-w-md rounded-[34px] border border-white/10 bg-[rgba(20,18,20,0.76)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
          <div className="mb-8 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[#ffb089]">
              Welcome Back
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white">
              Sign in to your account
            </h2>
            <p className="text-sm leading-6 text-white/55">
              Use your account credentials. If two-factor authentication is
              enabled, include your 6-digit authenticator code.
            </p>
          </div>

          <form action={formAction} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-[0.24em] text-white/48"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={safeState.fields.email}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-sm text-white outline-none ring-0 transition focus:border-[#ff9166] focus:bg-white/8"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-medium uppercase tracking-[0.24em] text-white/48"
                >
                  Password
                </label>
                <Link
                  href="/request-reset-password"
                  className="text-xs font-medium text-[#ffb089] transition hover:text-[#ffd1b7]"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                defaultValue={safeState.fields.password}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-sm text-white outline-none ring-0 transition focus:border-[#ff9166] focus:bg-white/8"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="totpCode"
                className="text-xs font-medium uppercase tracking-[0.24em] text-white/48"
              >
                TOTP Code
              </label>
              <input
                id="totpCode"
                name="totpCode"
                inputMode="numeric"
                maxLength={6}
                defaultValue={safeState.fields.totpCode}
                placeholder="Only required if 2FA is enabled"
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-sm text-white outline-none ring-0 transition focus:border-[#ff9166] focus:bg-white/8"
              />
            </div>

            {oauthError ? (
              <div className="rounded-2xl border border-[#ff885f]/35 bg-[#ff885f]/12 px-4 py-3 text-sm text-[#ffd4c4]">
                {oauthError}
              </div>
            ) : null}

            {safeState.message ? (
              <div className="rounded-2xl border border-[#ff885f]/35 bg-[#ff885f]/12 px-4 py-3 text-sm text-[#ffd4c4]">
                {safeState.message}
              </div>
            ) : null}

            <div className="space-y-3 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7683c_0%,#ff9f6e_100%)] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(247,104,60,0.35)] transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isPending ? "Signing you in..." : "Enter Secure Workspace"}
              </button>

              <button
                type="submit"
                formAction={startGoogleLoginAction}
                disabled={isPending}
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-white/12 bg-white/4 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/8"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#111]">
                  G
                </span>
                Continue with Google
              </button>
            </div>
          </form>

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/8 pt-6 text-sm text-white/45">
            <p>Need a new account?</p>
            <Link
              href="/register"
              className="font-medium text-[#ffb089] transition hover:text-[#ffd1b7]"
            >
              Create one
            </Link>
          </div>

          <div className="mt-6 rounded-[26px] border border-white/10 bg-black/18 p-4 text-xs leading-6 text-white/48">
            Sensitive sessions are persisted through a secure httpOnly cookie
            layer in the frontend and matched against your protected backend
            routes.
          </div>
        </div>
      </section>
    </div>
  );
}
