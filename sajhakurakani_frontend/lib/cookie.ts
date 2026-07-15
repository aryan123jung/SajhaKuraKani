import "server-only";

import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "sajhakurakani_auth_token";
export const GOOGLE_TOTP_PENDING_COOKIE_NAME =
  "sajhakurakani_google_totp_pending";
const FIFTEEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 15;
const TEN_MINUTES_IN_SECONDS = 60 * 10;

export async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
}

export async function setAuthToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: FIFTEEN_DAYS_IN_SECONDS,
  });
}

export async function clearAuthToken() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getGoogleTotpPreAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get(GOOGLE_TOTP_PENDING_COOKIE_NAME)?.value ?? null;
}

export async function setGoogleTotpPreAuthToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_TOTP_PENDING_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TEN_MINUTES_IN_SECONDS,
  });
}

export async function clearGoogleTotpPreAuthToken() {
  const cookieStore = await cookies();
  cookieStore.delete(GOOGLE_TOTP_PENDING_COOKIE_NAME);
}
