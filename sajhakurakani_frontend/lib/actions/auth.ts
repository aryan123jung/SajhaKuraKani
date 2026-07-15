"use server";

import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import {
  getGoogleOAuthUrl,
  login,
  register,
  verifyLoginTotp,
  verifyGoogleOAuthTotp,
} from "../api/auth";
import {
  clearAuthToken,
  clearTwoFactorPreAuthToken,
  getTwoFactorPreAuthToken,
  setAuthToken,
  setTwoFactorPreAuthToken,
} from "../cookie";
import type {
  LoginActionState,
  RegisterActionState,
  VerifyTotpActionState,
} from "./auth-state";

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  void _previousState;

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return {
      success: false,
      message: "Email and password are required.",
      fields: {
        email,
        password: "",
      },
    };
  }

  try {
    const response = await login({ email, password });

    if (response.data.requiresTotp && response.data.preAuthToken) {
      await setTwoFactorPreAuthToken(response.data.preAuthToken);
      redirect(`/verify-2fa?email=${encodeURIComponent(email)}&method=password`);
    }

    await setAuthToken(response.token as string);
  } catch (error) {
    unstable_rethrow(error);

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to sign in right now.",
      fields: {
        email,
        password: "",
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
  await clearTwoFactorPreAuthToken();
  redirect("/login");
}

export async function completeTotpLoginAction(
  _previousState: VerifyTotpActionState,
  formData: FormData
): Promise<VerifyTotpActionState> {
  void _previousState;

  const code = String(formData.get("code") || "").trim();
  const method = String(formData.get("method") || "password").trim();
  const preAuthToken = await getTwoFactorPreAuthToken();

  if (!preAuthToken) {
    return {
      success: false,
      message: "Your two-factor verification session expired. Start again.",
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
    const response =
      method === "google"
        ? await verifyGoogleOAuthTotp({ preAuthToken, code })
        : await verifyLoginTotp({ preAuthToken, code });
    await setAuthToken(response.token as string);
    await clearTwoFactorPreAuthToken();
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to complete sign-in right now.",
      code: "",
    };
  }

  redirect("/");
}

export async function cancelTotpLoginAction() {
  await clearTwoFactorPreAuthToken();
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
