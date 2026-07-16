import "server-only";

import axios from "axios";
import https from "https";
import { getAuthToken } from "../cookie";

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

axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
