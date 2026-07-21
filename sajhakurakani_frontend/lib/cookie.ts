import "server-only";

import { cookies } from "next/headers";
import { headers } from "next/headers";
import {
  ADMIN_REAUTH_COOKIE_NAME,
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  TWO_FACTOR_PRE_AUTH_COOKIE_NAME,
} from "./security-constants";
const FIFTEEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 15;
const TEN_MINUTES_IN_SECONDS = 60 * 10;

export async function getAuthToken() {
  const headerStore = await headers();
  const headerToken = headerStore.get("x-auth-token");
  if (headerToken) {
    return headerToken;
  }

  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
}

export async function setAuthToken(token: string) {
  const cookieStore = await cookies();
  // secure cookie flags
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TEN_MINUTES_IN_SECONDS,
    priority: "high",
  });
}

export async function clearAuthToken() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getRefreshToken() {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_COOKIE_NAME)?.value ?? null;
}

export async function setRefreshToken(token: string) {
  const cookieStore = await cookies();
  // secure cookie flags
  cookieStore.set(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: FIFTEEN_DAYS_IN_SECONDS,
    priority: "high",
  });
}

export async function clearRefreshToken() {
  const cookieStore = await cookies();
  cookieStore.delete(REFRESH_COOKIE_NAME);
}

export async function getAdminReauthToken() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_REAUTH_COOKIE_NAME)?.value ?? null;
}

export async function setAdminReauthToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_REAUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TEN_MINUTES_IN_SECONDS,
    priority: "high",
  });
}

export async function clearAdminReauthToken() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_REAUTH_COOKIE_NAME);
}

export async function setSessionTokens(accessToken: string, refreshToken: string) {
  await setAuthToken(accessToken);
  await setRefreshToken(refreshToken);
}

export async function clearSessionTokens() {
  await clearAuthToken();
  await clearRefreshToken();
  await clearAdminReauthToken();
}

export async function getTwoFactorPreAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get(TWO_FACTOR_PRE_AUTH_COOKIE_NAME)?.value ?? null;
}

export async function setTwoFactorPreAuthToken(token: string) {
  const cookieStore = await cookies();
  // secure cookie flags
  cookieStore.set(TWO_FACTOR_PRE_AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TEN_MINUTES_IN_SECONDS,
    priority: "high",
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
