import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  TWO_FACTOR_PRE_AUTH_COOKIE_NAME,
} from "./lib/security-constants";

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 30 * 1000;

const createCsrfToken = () =>
  `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;

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

const buildCookieHeader = (
  request: NextRequest,
  overrides: Record<string, string | undefined>
) => {
  const cookieMap = new Map(
    request.cookies.getAll().map((cookie) => [cookie.name, cookie.value])
  );

  for (const [cookieName, cookieValue] of Object.entries(overrides)) {
    if (cookieValue) {
      cookieMap.set(cookieName, cookieValue);
    } else {
      cookieMap.delete(cookieName);
    }
  }

  return Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
};

const clearSessionCookies = (response: NextResponse) => {
  response.cookies.delete(AUTH_COOKIE_NAME);
  response.cookies.delete(REFRESH_COOKIE_NAME);
};

async function tryRefreshSession(request: NextRequest) {
  const refreshUrl = new URL("/api/session/refresh", request.url);
  const shouldAllowLocalSelfSignedCert =
    process.env.NODE_ENV !== "production" &&
    refreshUrl.protocol === "https:" &&
    refreshUrl.hostname === "localhost";
  const previousTlsSetting = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

  try {
    if (shouldAllowLocalSelfSignedCert) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    const refreshResponse = await fetch(refreshUrl, {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        "user-agent": request.headers.get("user-agent") ?? "",
      },
      cache: "no-store",
    });

    if (shouldAllowLocalSelfSignedCert) {
      if (typeof previousTlsSetting === "string") {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTlsSetting;
      } else {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      }
    }

    if (!refreshResponse.ok) {
      return null;
    }

    const data = (await refreshResponse.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };

    if (!data.accessToken || !data.refreshToken) {
      return null;
    }

    return data;
  } catch {
    return null;
  } finally {
    if (shouldAllowLocalSelfSignedCert) {
      if (typeof previousTlsSetting === "string") {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTlsSetting;
      } else {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      }
    }
  }
}

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  const twoFactorPreAuthToken =
    request.cookies.get(TWO_FACTOR_PRE_AUTH_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";
  const isRequestResetPasswordPage = pathname === "/request-reset-password";
  const isResetPasswordPage = pathname === "/reset-password";
  const isResendVerificationPage = pathname === "/resend-verification";
  const isVerifyEmailPage = pathname === "/verify-email";
  const isVerifyTwoFactorPage = pathname === "/verify-2fa";
  const isProtectedApiRoute = pathname.startsWith("/api/messages");
  const isProtectedPage =
    pathname === "/" ||
    pathname === "/settings" ||
    pathname.startsWith("/user") ||
    pathname.startsWith("/admin");

  let currentAccessToken = accessToken;
  let currentRefreshToken = refreshToken;
  let refreshedSession = false;
  const requestHeaders = new Headers(request.headers);

  if (!isAccessTokenFresh(currentAccessToken) && currentRefreshToken) {
    const refreshedTokens = await tryRefreshSession(request);

    if (refreshedTokens) {
      refreshedSession = true;
      currentAccessToken = refreshedTokens.accessToken;
      currentRefreshToken = refreshedTokens.refreshToken;
      if (currentAccessToken && currentRefreshToken) {
        requestHeaders.set("x-auth-token", currentAccessToken);
        requestHeaders.set(
          "cookie",
          buildCookieHeader(request, {
            [AUTH_COOKIE_NAME]: currentAccessToken,
            [REFRESH_COOKIE_NAME]: currentRefreshToken,
          })
        );
      }
    }
  }

  const hasActiveSession = Boolean(currentAccessToken && isAccessTokenFresh(currentAccessToken));
  let response: NextResponse;

  if ((isLoginPage || isRegisterPage) && hasActiveSession) {
    response = NextResponse.redirect(new URL("/", request.url));
  } else if (isVerifyTwoFactorPage && !twoFactorPreAuthToken) {
    response = NextResponse.redirect(new URL("/login", request.url));
  } else if (isProtectedPage && !hasActiveSession) {
    response = NextResponse.redirect(new URL("/login", request.url));
    clearSessionCookies(response);
  } else {
    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  if (refreshedSession && currentAccessToken && currentRefreshToken) {
    // refresh token rotation
    // secure cookie flags
    response.cookies.set(AUTH_COOKIE_NAME, currentAccessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
      priority: "high",
    });
    response.cookies.set(REFRESH_COOKIE_NAME, currentRefreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 15,
      priority: "high",
    });
  } else if (!hasActiveSession && (isLoginPage || isRegisterPage) && refreshToken) {
    clearSessionCookies(response);
  }

  if (
    !request.cookies.get(CSRF_COOKIE_NAME) &&
    (isLoginPage ||
      isRegisterPage ||
      isRequestResetPasswordPage ||
      isResetPasswordPage ||
      isResendVerificationPage ||
      isVerifyEmailPage ||
      isVerifyTwoFactorPage ||
      isProtectedPage ||
      isProtectedApiRoute)
  ) {
    // csrf protection
    // secure cookie flags
    response.cookies.set(CSRF_COOKIE_NAME, createCsrfToken(), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      priority: "high",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/settings",
    "/login",
    "/register",
    "/request-reset-password",
    "/reset-password",
    "/resend-verification",
    "/verify-email",
    "/verify-2fa",
    "/api/messages/:path*",
    "/user/:path*",
    "/admin/:path*",
  ],
};
