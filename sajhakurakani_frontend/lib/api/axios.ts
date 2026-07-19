import "server-only";

import axios, { AxiosHeaders } from "axios";
import https from "https";
import { getAuthToken } from "../cookie";
import { getCsrfToken } from "../csrf";
import { CSRF_COOKIE_NAME } from "../security-constants";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const useLocalHttpsAgent =
  process.env.NODE_ENV !== "production" &&
  typeof BASE_URL === "string" &&
  BASE_URL.startsWith("https://localhost");

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // https implementation
  httpsAgent: useLocalHttpsAgent
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined,
});

const STATE_CHANGING_METHODS = new Set(["post", "put", "patch", "delete"]);

const appendCookieHeader = (existingCookieHeader: unknown, nextCookie: string) => {
  if (typeof existingCookieHeader === "string" && existingCookieHeader.trim()) {
    return `${existingCookieHeader}; ${nextCookie}`;
  }

  return nextCookie;
};

axiosInstance.interceptors.request.use(
  async (config) => {
    const headers = AxiosHeaders.from(config.headers);
    const token = await getAuthToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (STATE_CHANGING_METHODS.has((config.method ?? "get").toLowerCase())) {
      const csrfToken = await getCsrfToken();

      if (csrfToken) {
        // csrf protection
        headers.set("X-CSRF-Token", csrfToken);
        headers.set(
          "Cookie",
          appendCookieHeader(
            headers.get("Cookie") ?? headers.get("cookie"),
            `${CSRF_COOKIE_NAME}=${encodeURIComponent(csrfToken)}`
          )
        );
      }
    }

    config.headers = headers;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
