"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  cancelTotpLoginAction,
  completeTotpLoginAction,
} from "@/lib/actions/auth";
import {
  initialVerifyTotpActionState,
} from "@/lib/actions/auth-state";
import AuthShell from "@/app/(auth)/_components/AuthShell";

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
    <AuthShell
      eyebrow="Two-factor verification"
      title={heading}
      description={`${description}${email ? ` Account: ${email}.` : ""}`}
      width="narrow"
      footer={
        <Link href="/login" className="auth-link text-sm">
          Start over
        </Link>
      }
    >
      <form action={formAction} className="space-y-5">
          <input type="hidden" name="_csrf" value={csrfToken} />
          <input type="hidden" name="method" value={method} />

          <div className="auth-field">
            <label
              htmlFor="code"
              className="auth-field-label"
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
              className="auth-input"
            />
          </div>

          {state.message ? (
            <div className="auth-message" data-tone="error">
              {state.message}
            </div>
          ) : null}

          <div className="auth-actions pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="auth-button-primary"
            >
              {isPending ? "Verifying..." : "Verify And Continue"}
            </button>

            <button
              type="submit"
              formAction={cancelTotpLoginAction}
              className="auth-button-secondary"
            >
              Cancel
            </button>
          </div>
      </form>
    </AuthShell>
  );
}
