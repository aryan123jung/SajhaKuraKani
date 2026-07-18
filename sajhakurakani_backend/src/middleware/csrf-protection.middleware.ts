import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { CORS_ORIGINS, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../configs";
import { HttpError } from "../errors/http-error";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const TRUSTED_ORIGINS = new Set(CORS_ORIGINS);

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const parseCookies = (cookieHeader?: string) => {
  const parsed = new Map<string, string>();

  if (!cookieHeader) {
    return parsed;
  }

  for (const segment of cookieHeader.split(";")) {
    const separatorIndex = segment.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const name = segment.slice(0, separatorIndex).trim();
    const value = segment.slice(separatorIndex + 1).trim();

    if (!name || !value) {
      continue;
    }

    try {
      parsed.set(name, decodeURIComponent(value));
    } catch {
      parsed.set(name, value);
    }
  }

  return parsed;
};

const getRequestOrigin = (req: Request) => {
  const originHeader = req.get("origin");

  if (originHeader) {
    return originHeader.trim();
  }

  const refererHeader = req.get("referer");

  if (!refererHeader) {
    return null;
  }

  try {
    return new URL(refererHeader).origin;
  } catch {
    return null;
  }
};

export const csrfProtectionMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!STATE_CHANGING_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  const requestOrigin = getRequestOrigin(req);

  if (requestOrigin && !TRUSTED_ORIGINS.has(requestOrigin)) {
    return next(new HttpError(403, "Request origin is not allowed."));
  }

  const rawCookieHeader = req.headers.cookie;
  const cookieHeader = Array.isArray(rawCookieHeader)
    ? rawCookieHeader.join("; ")
    : rawCookieHeader;
  const cookies = parseCookies(cookieHeader);
  const cookieToken = cookies.get(CSRF_COOKIE_NAME) ?? "";
  const headerToken =
    req.get(CSRF_HEADER_NAME) ?? req.get("x-xsrf-token") ?? "";
  const authorizationHeader = req.get("authorization") ?? "";
  const isBearerRequest = authorizationHeader.startsWith("Bearer ");
  const hasCsrfArtifacts = Boolean(cookieToken || headerToken);

  if (!hasCsrfArtifacts) {
    // csrf protection
    // Bearer-token server-to-server requests are not cookie-authenticated, so CSRF
    // does not apply in the same way. Browser-originated state changes must still
    // present a CSRF token.
    if (isBearerRequest || !requestOrigin) {
      return next();
    }

    return next(new HttpError(403, "Invalid CSRF token."));
  }

  // csrf protection
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return next(new HttpError(403, "Invalid CSRF token."));
  }

  return next();
};
