import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "sajhakurakani_auth_token";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";
  const isProtectedPage =
    pathname === "/" ||
    pathname.startsWith("/user") ||
    pathname.startsWith("/admin");

  if ((isLoginPage || isRegisterPage) && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isProtectedPage && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/user/:path*", "/admin/:path*"],
};
