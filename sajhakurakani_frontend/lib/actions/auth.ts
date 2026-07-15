"use server";

import { redirect } from "next/navigation";
import { getGoogleOAuthUrl, login, register } from "../api/auth";
import { clearAuthToken, setAuthToken } from "../cookie";
import type { LoginActionState, RegisterActionState } from "./auth-state";

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

export async function logoutAction() {
  await clearAuthToken();
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
