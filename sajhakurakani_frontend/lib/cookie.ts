import "server-only";

import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "sajhakurakani_auth_token";
export const TWO_FACTOR_PRE_AUTH_COOKIE_NAME =
  "sajhakurakani_two_factor_pre_auth";
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

export async function getTwoFactorPreAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get(TWO_FACTOR_PRE_AUTH_COOKIE_NAME)?.value ?? null;
}

export async function setTwoFactorPreAuthToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(TWO_FACTOR_PRE_AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TEN_MINUTES_IN_SECONDS,
  });
}

export async function clearTwoFactorPreAuthToken() {
  const cookieStore = await cookies();
  cookieStore.delete(TWO_FACTOR_PRE_AUTH_COOKIE_NAME);
}

// Backward-compatible aliases for renamed helpers during incremental rebuilds.
export const getGoogleTotpPreAuthToken = getTwoFactorPreAuthToken;
export const setGoogleTotpPreAuthToken = setTwoFactorPreAuthToken;
export const clearGoogleTotpPreAuthToken = clearTwoFactorPreAuthToken;
