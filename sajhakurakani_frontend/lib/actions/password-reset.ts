"use server";

import { redirect } from "next/navigation";
import {
  requestPasswordReset,
  resetPassword,
} from "../api/auth";
import { assertValidCsrfToken } from "../csrf";
import type {
  RequestPasswordResetActionState,
  ResetPasswordActionState,
} from "./auth-state";

const isStrongPassword = (password: string) =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

export async function requestPasswordResetAction(
  _previousState: RequestPasswordResetActionState,
  formData: FormData
): Promise<RequestPasswordResetActionState> {
  void _previousState;
  try {
    await assertValidCsrfToken(formData);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Your session security check failed. Refresh and try again.",
      email: "",
    };
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email) {
    return {
      success: false,
      message: "Enter the email address for the account you want to recover.",
      email,
    };
  }

  try {
    await requestPasswordReset(email);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to send a password reset email right now.",
      email,
    };
  }

  return {
    success: true,
    message:
      "If an account exists for that email, a password reset link has been sent.",
    email,
  };
}

export async function resetPasswordAction(
  token: string,
  _previousState: ResetPasswordActionState,
  formData: FormData
): Promise<ResetPasswordActionState> {
  void _previousState;
  try {
    await assertValidCsrfToken(formData);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Your session security check failed. Refresh and try again.",
      fields: {
        newPassword: "",
        confirmPassword: "",
      },
    };
  }

  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!newPassword || !confirmPassword) {
    return {
      success: false,
      message: "Enter and confirm your new password.",
      fields: {
        newPassword: "",
        confirmPassword: "",
      },
    };
  }

  if (!isStrongPassword(newPassword)) {
    return {
      success: false,
      message:
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      fields: {
        newPassword: "",
        confirmPassword: "",
      },
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      message: "Passwords do not match.",
      fields: {
        newPassword: "",
        confirmPassword: "",
      },
    };
  }

  try {
    await resetPassword(token, newPassword);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to reset your password right now.",
      fields: {
        newPassword: "",
        confirmPassword: "",
      },
    };
  }

  redirect("/login?reset=1");
}
