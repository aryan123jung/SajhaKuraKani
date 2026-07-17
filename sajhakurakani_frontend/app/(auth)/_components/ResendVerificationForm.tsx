"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resendVerificationAction } from "@/lib/actions/auth";
import { initialResendVerificationActionState } from "@/lib/actions/auth-state";
import AuthShell from "./AuthShell";

type ResendVerificationFormProps = {
  csrfToken: string;
  initialEmail?: string;
};

export default function ResendVerificationForm({
  csrfToken,
  initialEmail,
}: ResendVerificationFormProps) {
  const [state, formAction, isPending] = useActionState(
    resendVerificationAction,
    initialResendVerificationActionState
  );

  const safeEmail = state.email || initialEmail || "";

  return (
    <AuthShell
      eyebrow="Email verification"
      title="Resend verification link"
      description="Enter your email address and we’ll send another verification link if the account still needs to be confirmed."
      footer={
        <Link href="/login" className="auth-link text-sm">
          Back to sign in
        </Link>
      }
    >
      <form action={formAction} className="space-y-5">
          <input type="hidden" name="_csrf" value={csrfToken} />

          <div className="auth-field">
            <label
              htmlFor="email"
              className="auth-field-label"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={safeEmail}
              placeholder="you@example.com"
              autoComplete="email"
              className="auth-input"
            />
          </div>

          {state.message ? (
            <div
              className="auth-message"
              data-tone={state.success ? "success" : "error"}
            >
              {state.message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="auth-button-primary"
          >
            {isPending ? "Sending verification link..." : "Send Verification Link"}
          </button>
      </form>
    </AuthShell>
  );
}
