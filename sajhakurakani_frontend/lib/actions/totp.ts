"use server";

import { redirect } from "next/navigation";
import { disableTotp, enableTotp, startTotpSetup } from "../api/auth";
import type {
  TotpCodeActionState,
  TotpSetupActionState,
} from "./auth-state";

export async function beginTotpSetupAction(
  _previousState: TotpSetupActionState
): Promise<TotpSetupActionState> {
  void _previousState;

  try {
    const response = await startTotpSetup();

    return {
      success: true,
      message:
        "Scan the secret in your authenticator app, then enter the 6-digit code to enable 2FA.",
      manualEntryKey: response.data.manualEntryKey,
      otpAuthUrl: response.data.otpAuthUrl,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to start two-factor setup right now.",
      manualEntryKey: "",
      otpAuthUrl: "",
    };
  }
}

export async function enableTotpAction(
  _previousState: TotpCodeActionState,
  formData: FormData
): Promise<TotpCodeActionState> {
  const code = String(formData.get("code") || "").trim();

  if (!/^\d{6}$/.test(code)) {
    return {
      success: false,
      message: "Enter the 6-digit code from your authenticator app.",
      code,
    };
  }

  try {
    await enableTotp(code);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to enable two-factor authentication right now.",
      code: "",
    };
  }

  redirect("/");
}

export async function disableTotpAction(
  _previousState: TotpCodeActionState,
  formData: FormData
): Promise<TotpCodeActionState> {
  const code = String(formData.get("code") || "").trim();

  if (!/^\d{6}$/.test(code)) {
    return {
      success: false,
      message: "Enter the current 6-digit code from your authenticator app.",
      code,
    };
  }

  try {
    await disableTotp(code);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to disable two-factor authentication right now.",
      code: "",
    };
  }

  redirect("/");
}
