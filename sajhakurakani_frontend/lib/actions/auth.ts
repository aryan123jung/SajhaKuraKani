"use server";

import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import {
  getGoogleOAuthUrl,
  login,
  register,
  verifyGoogleOAuthTotp,
} from "../api/auth";
import {
  clearAuthToken,
  clearGoogleTotpPreAuthToken,
  getGoogleTotpPreAuthToken,
  setAuthToken,
} from "../cookie";
import type {
  GoogleTotpActionState,
  LoginActionState,
  RegisterActionState,
} from "./auth-state";

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
  try {
    const response = await getGoogleOAuthUrl();
    redirect(response.data.authorizationUrl);
  } catch (error) {
    unstable_rethrow(error);

    const headerStore = await headers();
    const referer = headerStore.get("referer");
    const fallbackPath = "/login";
    const message =
      error instanceof Error
        ? error.message
        : "Unable to start Google sign-in right now.";

    if (referer) {
      const refererUrl = new URL(referer);
      refererUrl.searchParams.set("oauthError", message);
      redirect(refererUrl.toString());
    }

    redirect(`${fallbackPath}?oauthError=${encodeURIComponent(message)}`);
  }
}

export async function logoutAction() {
  await clearAuthToken();
  await clearGoogleTotpPreAuthToken();
  redirect("/login");
}

export async function completeGoogleTotpAction(
  _previousState: GoogleTotpActionState,
  formData: FormData
): Promise<GoogleTotpActionState> {
  const code = String(formData.get("code") || "").trim();
  const preAuthToken = await getGoogleTotpPreAuthToken();

  if (!preAuthToken) {
    return {
      success: false,
      message: "Your Google sign-in verification session expired. Start again.",
      code: "",
    };
  }

  if (!/^\d{6}$/.test(code)) {
    return {
      success: false,
      message: "Enter the 6-digit code from your authenticator app.",
      code,
    };
  }

  try {
    const response = await verifyGoogleOAuthTotp({ preAuthToken, code });
    await setAuthToken(response.token as string);
    await clearGoogleTotpPreAuthToken();
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to complete Google sign-in right now.",
      code: "",
    };
  }

  redirect("/");
}

export async function cancelGoogleTotpAction() {
  await clearGoogleTotpPreAuthToken();
  redirect("/login");
}

export async function registerAction(
  _previousState: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> {
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
    return {
      success: false,
      message: "All fields are required.",
      fields: {
        firstName,
        lastName,
        username,
        email,
        password: "",
        confirmPassword: "",
      },
    };
  }

  if (firstName.length < 2) {
    return {
      success: false,
      message: "First name must be at least 2 characters long.",
      fields: {
        firstName,
        lastName,
        username,
        email,
        password: "",
        confirmPassword: "",
      },
    };
  }

  if (lastName.length < 2) {
    return {
      success: false,
      message: "Last name must be at least 2 characters long.",
      fields: {
        firstName,
        lastName,
        username,
        email,
        password: "",
        confirmPassword: "",
      },
    };
  }

  if (!/^[a-z0-9_.-]{3,30}$/.test(username)) {
    return {
      success: false,
      message:
        "Username must be 3 to 30 characters and can only use lowercase letters, numbers, dots, dashes, and underscores.",
      fields: {
        firstName,
        lastName,
        username,
        email,
        password: "",
        confirmPassword: "",
      },
    };
  }

  const strongPassword =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  if (!strongPassword) {
    return {
      success: false,
      message:
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      fields: {
        firstName,
        lastName,
        username,
        email,
        password: "",
        confirmPassword: "",
      },
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      message: "Passwords do not match.",
      fields: {
        firstName,
        lastName,
        username,
        email,
        password: "",
        confirmPassword: "",
      },
    };
  }

  try {
    await register({
      firstName,
      lastName,
      username,
      email,
      password,
      confirmPassword,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create your account right now.",
      fields: {
        firstName,
        lastName,
        username,
        email,
        password: "",
        confirmPassword: "",
      },
    };
  }

  redirect(
    `/login?registered=1&email=${encodeURIComponent(email)}`
  );
}
