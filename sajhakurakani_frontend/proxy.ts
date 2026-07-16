import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  TWO_FACTOR_PRE_AUTH_COOKIE_NAME,
} from "./lib/security-constants";

const createCsrfToken = () =>
  `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
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
  const isProtectedPage =
    pathname === "/" ||
    pathname === "/settings" ||
    pathname.startsWith("/user") ||
    pathname.startsWith("/admin");

  let response: NextResponse;

  if ((isLoginPage || isRegisterPage) && token) {
    response = NextResponse.redirect(new URL("/", request.url));
  } else if (isVerifyTwoFactorPage && !twoFactorPreAuthToken) {
    response = NextResponse.redirect(new URL("/login", request.url));
  } else if (isProtectedPage && !token) {
    response = NextResponse.redirect(new URL("/login", request.url));
  } else {
    response = NextResponse.next();
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
      isProtectedPage)
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
    "/user/:path*",
    "/admin/:path*",
  ],
};
