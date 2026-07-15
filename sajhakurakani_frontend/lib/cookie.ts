import "server-only";

import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "sajhakurakani_auth_token";
const FIFTEEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 15;

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
