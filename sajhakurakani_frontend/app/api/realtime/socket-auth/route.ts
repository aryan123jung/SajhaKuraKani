import { NextResponse } from "next/server";
import { refreshSession } from "@/lib/api/auth";
import { getAuthToken, getRefreshToken } from "@/lib/cookie";
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/security-constants";

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 30 * 1000;
const TEN_MINUTES_IN_SECONDS = 60 * 10;
const FIFTEEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 15;

const decodeJwtExpiry = (token?: string | null) => {
  if (!token) {
    return null;
  }

  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = JSON.parse(atob(normalizedPayload)) as { exp?: number };
    return typeof decodedPayload.exp === "number" ? decodedPayload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const isAccessTokenFresh = (token?: string | null) => {
  const expiry = decodeJwtExpiry(token);
  return typeof expiry === "number" && expiry > Date.now() + ACCESS_TOKEN_REFRESH_BUFFER_MS;
};

export async function GET() {
  const accessToken = await getAuthToken();

  if (isAccessTokenFresh(accessToken)) {
    return NextResponse.json({
      success: true,
      token: accessToken,
    });
  }

  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    return NextResponse.json(
      {
        success: false,
        message: "Your session has expired. Please sign in again.",
      },
      { status: 401 }
    );
  }

  try {
    const response = await refreshSession(refreshToken);
    const nextResponse = NextResponse.json({
      success: true,
      token: response.accessToken,
    });

    nextResponse.cookies.set(AUTH_COOKIE_NAME, response.accessToken as string, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TEN_MINUTES_IN_SECONDS,
      priority: "high",
    });
    nextResponse.cookies.set(REFRESH_COOKIE_NAME, response.refreshToken as string, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: FIFTEEN_DAYS_IN_SECONDS,
      priority: "high",
    });

    return nextResponse;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to prepare realtime access right now.",
      },
      { status: 401 }
    );
  }
}
