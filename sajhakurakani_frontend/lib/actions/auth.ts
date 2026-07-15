"use server";

import { redirect } from "next/navigation";
import { getGoogleOAuthUrl, login } from "../api/auth";
import { setAuthToken } from "../cookie";
import type { LoginActionState } from "./auth-state";

export async function loginAction(
  previousState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const totpCode = String(formData.get("totpCode") || "").trim();

  if (!email || !password) {
    return {
      success: false,
      message: "Email and password are required.",
      requiresTotp: previousState.requiresTotp,
      fields: {
        email,
        password: "",
        totpCode,
      },
    };
  }

  try {
    const response = await login({
      email,
      password,
      totpCode: totpCode || undefined,
    });

    await setAuthToken(response.token as string);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to sign in right now.";
    const requiresTotp =
      previousState.requiresTotp ||
      message.toLowerCase().includes("totp code is required");

    return {
      success: false,
      message:
        message.toLowerCase().includes("totp code is required")
          ? "This account has two-factor authentication enabled. Enter your TOTP code to continue."
          : message,
      requiresTotp,
      fields: {
        email,
        password: "",
        totpCode,
      },
    };
  }

  redirect("/");
}

export async function startGoogleLoginAction() {
  const response = await getGoogleOAuthUrl();
  redirect(response.data.authorizationUrl);
}
