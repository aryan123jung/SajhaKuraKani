"use server";

import { redirect } from "next/navigation";
import { getGoogleOAuthUrl, login } from "../api/auth";
import { setAuthToken } from "../cookie";

export type LoginActionState = {
  success: boolean;
  message: string;
  fields: {
    email: string;
    password: string;
    totpCode: string;
  };
};

export const initialLoginActionState: LoginActionState = {
  success: false,
  message: "",
  fields: {
    email: "",
    password: "",
    totpCode: "",
  },
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const totpCode = String(formData.get("totpCode") || "").trim();

  if (!email || !password) {
    return {
      success: false,
      message: "Email and password are required.",
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
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to sign in right now.",
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
