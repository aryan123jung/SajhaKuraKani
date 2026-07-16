import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";
import { CSRF_COOKIE_NAME } from "./security-constants";

const CSRF_ERROR_MESSAGE =
  "Your session security check failed. Refresh and try again.";

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
};

export async function getCsrfToken() {
  // csrf protection
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value ?? "";
}

export async function isValidCsrfToken(formData: FormData) {
  // csrf protection
  const submittedToken = String(formData.get("_csrf") || "");
  const cookieToken = await getCsrfToken();

  if (!submittedToken || !cookieToken) {
    return false;
  }

  return safeEqual(submittedToken, cookieToken);
}

export async function assertValidCsrfToken(formData: FormData) {
  // csrf protection
  const isValid = await isValidCsrfToken(formData);

  if (!isValid) {
    throw new Error(CSRF_ERROR_MESSAGE);
  }
}

export { CSRF_ERROR_MESSAGE };
