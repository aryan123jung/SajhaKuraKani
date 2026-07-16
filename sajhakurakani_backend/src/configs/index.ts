import dotenv from 'dotenv'
dotenv.config();
import path from "path";

const parseNumber = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 6060;
export const LOCAL_HTTPS: boolean = process.env.LOCAL_HTTPS === "true";
export const HTTPS_KEY_PATH: string = process.env.HTTPS_KEY_PATH || path.resolve(process.cwd(), "certs/local/localhost-key.pem");
export const HTTPS_CERT_PATH: string = process.env.HTTPS_CERT_PATH || path.resolve(process.cwd(), "certs/local/localhost-cert.pem");

export const MONGODB_URI:string = process.env.MONGODB_URI || 'mongodb://localhost:27017/default_db';

export const JWT_SECRET: string = process.env.JWT_SECRET || 'ungafulga';
export const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '15d';
export const JWT_ISSUER: string = process.env.JWT_ISSUER || 'sajhakurakani-api';
export const JWT_AUDIENCE: string = process.env.JWT_AUDIENCE || 'sajhakurakani-client';
export const CLIENT_URL: string = process.env.CLIENT_URL || 'https://localhost:3000';
export const CORS_ORIGINS: string[] = (process.env.CORS_ORIGINS || CLIENT_URL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
export const AUTH_MAX_FAILED_ATTEMPTS: number = parseNumber(process.env.AUTH_MAX_FAILED_ATTEMPTS, 5);
export const AUTH_LOCK_WINDOW_MS: number = parseNumber(process.env.AUTH_LOCK_WINDOW_MS, 15 * 60 * 1000);
export const GLOBAL_RATE_LIMIT_WINDOW_MS: number = parseNumber(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
export const GLOBAL_RATE_LIMIT_MAX_REQUESTS: number = parseNumber(process.env.GLOBAL_RATE_LIMIT_MAX_REQUESTS, 200);
export const AUTH_RATE_LIMIT_WINDOW_MS: number = parseNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
export const AUTH_RATE_LIMIT_MAX_REQUESTS: number = parseNumber(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 25);
export const AUTH_IP_REPUTATION_WINDOW_MS: number = parseNumber(process.env.AUTH_IP_REPUTATION_WINDOW_MS, 15 * 60 * 1000);
export const AUTH_IP_REPUTATION_MAX_FAILURES: number = parseNumber(process.env.AUTH_IP_REPUTATION_MAX_FAILURES, 10);
export const AUTH_IP_REPUTATION_BLOCK_MS: number = parseNumber(process.env.AUTH_IP_REPUTATION_BLOCK_MS, 15 * 60 * 1000);
export const AUTH_IP_REPUTATION_MIN_DISTINCT_ACCOUNTS: number = parseNumber(process.env.AUTH_IP_REPUTATION_MIN_DISTINCT_ACCOUNTS, 3);
export const RESET_RATE_LIMIT_MAX_REQUESTS: number = parseNumber(process.env.RESET_RATE_LIMIT_MAX_REQUESTS, 5);
export const RESET_TOKEN_EXPIRY_MS: number = parseNumber(process.env.RESET_TOKEN_EXPIRY_MS, 5 * 60 * 1000);
export const RESET_PASSWORD_ENFORCE_IP_MATCH: boolean = process.env.RESET_PASSWORD_ENFORCE_IP_MATCH === "true";
export const REDIS_URL: string = process.env.REDIS_URL || "";
export const REDIS_KEY_PREFIX: string = process.env.REDIS_KEY_PREFIX || "sajhakurakani";
export const TOTP_ISSUER: string = process.env.TOTP_ISSUER || 'SajhaKuraKani';
export const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET: string = process.env.GOOGLE_CLIENT_SECRET || '';
export const GOOGLE_REDIRECT_URI: string = process.env.GOOGLE_REDIRECT_URI || `${CLIENT_URL}/oauth/google/callback`;
