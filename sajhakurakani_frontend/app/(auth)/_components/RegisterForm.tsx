"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerAction, startGoogleLoginAction } from "@/lib/actions/auth";
import { initialRegisterActionState } from "@/lib/actions/auth-state";
import AuthShell from "./AuthShell";

type RegisterFormProps = {
  csrfToken: string;
};

export default function RegisterForm({ csrfToken }: RegisterFormProps) {
  const [state, formAction, isPending] = useActionState(
    registerAction,
    initialRegisterActionState
  );

  const safeState = {
    ...initialRegisterActionState,
    ...state,
    fields: {
      ...initialRegisterActionState.fields,
      ...(state?.fields ?? {}),
    },
  };
  const [showPasswordHint, setShowPasswordHint] = useState(false);

  const passwordIsStrong = (value: string) => {
    return (
      value.length >= 8 &&
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[^A-Za-z0-9]/.test(value)
    );
  };

  return (
    <AuthShell
      eyebrow="Create account"
      title="Join SajhaKuraKani"
      description="Set up your core profile details first. We’ll send a verification link to your email before password sign-in becomes active."
      width="wide"
      footer={
        <div className="auth-foot-row">
          <p>Already have an account?</p>
          <Link href="/login" className="auth-link">
            Sign in
          </Link>
        </div>
      }
    >
      <form action={formAction} className="space-y-5">
            <input type="hidden" name="_csrf" value={csrfToken} />

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="auth-field">
                <label
                  htmlFor="firstName"
                  className="auth-field-label"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  defaultValue={safeState.fields.firstName}
                  placeholder="John"
                  autoComplete="given-name"
                  className="auth-input"
                />
              </div>

              <div className="auth-field">
                <label
                  htmlFor="lastName"
                  className="auth-field-label"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  defaultValue={safeState.fields.lastName}
                  placeholder="Doe"
                  autoComplete="family-name"
                  className="auth-input"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="auth-field">
                <label
                  htmlFor="username"
                  className="auth-field-label"
                >
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  defaultValue={safeState.fields.username}
                  placeholder="john.secure_123"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  onInput={(event) => {
                    event.currentTarget.value = event.currentTarget.value.toLowerCase();
                  }}
                  className="auth-input"
                />
              </div>

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
                  defaultValue={safeState.fields.email}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="auth-input"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="auth-field">
                <label
                  htmlFor="password"
                  className="auth-field-label"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  defaultValue={safeState.fields.password}
                  placeholder="Create a secure password"
                  autoComplete="new-password"
                  onInput={(event) => {
                    const value = event.currentTarget.value;
                    setShowPasswordHint(value.length > 0 && !passwordIsStrong(value));
                  }}
                  className="auth-input"
                />
              </div>

              <div className="auth-field">
                <label
                  htmlFor="confirmPassword"
                  className="auth-field-label"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  defaultValue={safeState.fields.confirmPassword}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className="auth-input"
                />
              </div>
            </div>

            {showPasswordHint ? (
              <div className="auth-message" data-tone="hint">
                Passwords must be at least 8 characters and include uppercase,
                lowercase, a number, and a special character.
              </div>
            ) : null}

            {safeState.message ? (
              <div className="auth-message" data-tone="error">
                {safeState.message}
              </div>
            ) : null}

            <div className="auth-actions">
              <button
                type="submit"
                disabled={isPending}
                className="auth-button-primary"
              >
                {isPending ? "Creating your account..." : "Create Account"}
              </button>

              <button
                type="submit"
                formAction={startGoogleLoginAction}
                disabled={isPending}
                className="auth-button-secondary"
              >
                <span className="auth-google-mark">G</span>
                Continue with Google
              </button>
            </div>
      </form>
    </AuthShell>
  );
}
