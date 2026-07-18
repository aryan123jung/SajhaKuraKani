import dotenv from 'dotenv'
dotenv.config();
import path from "path";
import fs from "fs";
import type { Algorithm } from "jsonwebtoken";

const parseNumber = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const loadFileIfPresent = (filePath?: string) => {
    if (!filePath) {
        return "";
    }

    try {
        return fs.readFileSync(filePath, "utf8");
    } catch {
        return "";
    }
};

export const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 6060;
export const LOCAL_HTTPS: boolean = process.env.LOCAL_HTTPS === "true";
export const HTTPS_KEY_PATH: string = process.env.HTTPS_KEY_PATH || path.resolve(process.cwd(), "certs/local/localhost-key.pem");
export const HTTPS_CERT_PATH: string = process.env.HTTPS_CERT_PATH || path.resolve(process.cwd(), "certs/local/localhost-cert.pem");

export const MONGODB_URI:string = process.env.MONGODB_URI || 'mongodb://localhost:27017/default_db';

export const JWT_ALGORITHM: Algorithm = "RS256";
export const JWT_PRIVATE_KEY_PATH: string =
    process.env.JWT_PRIVATE_KEY_PATH ||
    path.resolve(process.cwd(), "keys/local/jwt-private.pem");
export const JWT_PUBLIC_KEY_PATH: string =
    process.env.JWT_PUBLIC_KEY_PATH ||
    path.resolve(process.cwd(), "keys/local/jwt-public.pem");
export const JWT_PRIVATE_KEY: string =
    process.env.JWT_PRIVATE_KEY || loadFileIfPresent(JWT_PRIVATE_KEY_PATH);
export const JWT_PUBLIC_KEY: string =
    process.env.JWT_PUBLIC_KEY || loadFileIfPresent(JWT_PUBLIC_KEY_PATH);
export const ACCESS_TOKEN_EXPIRES_IN: string =
    process.env.ACCESS_TOKEN_EXPIRES_IN || '10m';
export const REFRESH_TOKEN_EXPIRES_IN: string =
    process.env.REFRESH_TOKEN_EXPIRES_IN || '15d';
export const JWT_ISSUER: string = process.env.JWT_ISSUER || 'sajhakurakani-api';
export const JWT_AUDIENCE: string = process.env.JWT_AUDIENCE || 'sajhakurakani-client';
export const TOTP_ENCRYPTION_KEY: string = process.env.TOTP_ENCRYPTION_KEY || "";
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
export const EMAIL_VERIFICATION_TOKEN_EXPIRY_MS: number = parseNumber(
    process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY_MS,
    24 * 60 * 60 * 1000
);
export const RESET_PASSWORD_ENFORCE_IP_MATCH: boolean = process.env.RESET_PASSWORD_ENFORCE_IP_MATCH === "true";
export const REDIS_URL: string = process.env.REDIS_URL || "";
export const REDIS_KEY_PREFIX: string = process.env.REDIS_KEY_PREFIX || "sajhakurakani";
export const TOTP_ISSUER: string = process.env.TOTP_ISSUER || 'SajhaKuraKani';
export const EMAIL_USER: string = process.env.EMAIL_USER || "";
export const EMAIL_PASS: string = process.env.EMAIL_PASS || "";
export const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET: string = process.env.GOOGLE_CLIENT_SECRET || '';
export const GOOGLE_REDIRECT_URI: string = process.env.GOOGLE_REDIRECT_URI || `${CLIENT_URL}/oauth/google/callback`;
export const FRIEND_RATE_LIMIT_WINDOW_MS: number = parseNumber(
    process.env.FRIEND_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
);
export const FRIEND_ACTION_RATE_LIMIT_MAX_REQUESTS: number = parseNumber(
    process.env.FRIEND_ACTION_RATE_LIMIT_MAX_REQUESTS,
    20
);
export const FRIEND_LIST_RATE_LIMIT_MAX_REQUESTS: number = parseNumber(
    process.env.FRIEND_LIST_RATE_LIMIT_MAX_REQUESTS,
    60
);
export const FRIEND_OUTGOING_REQUEST_DAILY_LIMIT: number = parseNumber(
    process.env.FRIEND_OUTGOING_REQUEST_DAILY_LIMIT,
    50
);
export const FRIEND_OUTGOING_REQUEST_NEW_ACCOUNT_DAILY_LIMIT: number = parseNumber(
    process.env.FRIEND_OUTGOING_REQUEST_NEW_ACCOUNT_DAILY_LIMIT,
    15
);
export const FRIEND_OUTGOING_REQUEST_HOURLY_LIMIT: number = parseNumber(
    process.env.FRIEND_OUTGOING_REQUEST_HOURLY_LIMIT,
    100
);
export const FRIEND_OUTGOING_REQUEST_NEW_ACCOUNT_HOURLY_LIMIT: number = parseNumber(
    process.env.FRIEND_OUTGOING_REQUEST_NEW_ACCOUNT_HOURLY_LIMIT,
    25
);
export const FRIEND_NEW_ACCOUNT_WINDOW_DAYS: number = parseNumber(
    process.env.FRIEND_NEW_ACCOUNT_WINDOW_DAYS,
    7
);
export const FRIEND_REQUEST_PENDING_EXPIRY_DAYS: number = parseNumber(
    process.env.FRIEND_REQUEST_PENDING_EXPIRY_DAYS,
    30
);
export const POST_WRITE_RATE_LIMIT_WINDOW_MS: number = parseNumber(
    process.env.POST_WRITE_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
);
export const POST_WRITE_RATE_LIMIT_MAX_REQUESTS: number = parseNumber(
    process.env.POST_WRITE_RATE_LIMIT_MAX_REQUESTS,
    10
);
export const POST_UPDATE_RATE_LIMIT_MAX_REQUESTS: number = parseNumber(
    process.env.POST_UPDATE_RATE_LIMIT_MAX_REQUESTS,
    20
);
export const POST_DELETE_RATE_LIMIT_MAX_REQUESTS: number = parseNumber(
    process.env.POST_DELETE_RATE_LIMIT_MAX_REQUESTS,
    10
);
export const POST_READ_RATE_LIMIT_WINDOW_MS: number = parseNumber(
    process.env.POST_READ_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
);
export const POST_READ_RATE_LIMIT_MAX_REQUESTS: number = parseNumber(
    process.env.POST_READ_RATE_LIMIT_MAX_REQUESTS,
    120
);
export const POST_MEDIA_RATE_LIMIT_MAX_REQUESTS: number = parseNumber(
    process.env.POST_MEDIA_RATE_LIMIT_MAX_REQUESTS,
    60
);
export const POST_MEDIA_MAX_FILE_SIZE_BYTES: number = parseNumber(
    process.env.POST_MEDIA_MAX_FILE_SIZE_BYTES,
    5 * 1024 * 1024
);
export const POST_IMAGE_MAX_FILE_SIZE_BYTES: number = parseNumber(
    process.env.POST_IMAGE_MAX_FILE_SIZE_BYTES,
    5 * 1024 * 1024
);
export const POST_VIDEO_MAX_FILE_SIZE_BYTES: number = parseNumber(
    process.env.POST_VIDEO_MAX_FILE_SIZE_BYTES,
    25 * 1024 * 1024
);
export const POST_MEDIA_RESCAN_ON_READ: boolean =
    process.env.POST_MEDIA_RESCAN_ON_READ === "true";
export const POST_MEDIA_REQUIRE_VIDEO_PROCESSING: boolean =
    process.env.POST_MEDIA_REQUIRE_VIDEO_PROCESSING !== "false";
export const POST_ANTIVIRUS_ENABLED: boolean =
    process.env.POST_ANTIVIRUS_ENABLED === "true";
export const POST_ANTIVIRUS_FAIL_CLOSED: boolean =
    process.env.POST_ANTIVIRUS_FAIL_CLOSED === "true";
export const POST_ANTIVIRUS_PROVIDER: "clamav" | "virustotal" =
    process.env.POST_ANTIVIRUS_PROVIDER === "virustotal" ? "virustotal" : "clamav";
export const CLAMAV_HOST: string = process.env.CLAMAV_HOST || "127.0.0.1";
export const CLAMAV_PORT: number = parseNumber(process.env.CLAMAV_PORT, 3310);
export const VIRUSTOTAL_API_KEY: string = process.env.VIRUSTOTAL_API_KEY || "";
export const POST_CONTENT_MODERATION_ENABLED: boolean =
    process.env.POST_CONTENT_MODERATION_ENABLED === "true";
export const POST_CONTENT_BLOCKLIST: string[] = (
    process.env.POST_CONTENT_BLOCKLIST || ""
)
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
export const POST_DATA_ENCRYPTION_KEY: string =
    process.env.POST_DATA_ENCRYPTION_KEY || "";
export const SIPS_PATH: string = process.env.SIPS_PATH || "/usr/bin/sips";
export const FFMPEG_PATH: string = process.env.FFMPEG_PATH || "ffmpeg";
export const POST_PROFANITY_BLOCKLIST: string[] = (
    process.env.POST_PROFANITY_BLOCKLIST || "fuck,shit,bitch,bastard"
)
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
export const POST_HATE_SPEECH_BLOCKLIST: string[] = (
    process.env.POST_HATE_SPEECH_BLOCKLIST || "kill yourself,go kill yourself"
)
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
export const POST_NSFW_BLOCKLIST: string[] = (
    process.env.POST_NSFW_BLOCKLIST || "porn,porno,nude,sex video"
)
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
export const POST_BLOCKED_LINK_HOSTS: string[] = (
    process.env.POST_BLOCKED_LINK_HOSTS || "localhost,127.0.0.1,0.0.0.0"
)
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
export const POST_MAX_LINKS_PER_POST: number = parseNumber(
    process.env.POST_MAX_LINKS_PER_POST,
    5
);
export const POST_DUPLICATE_WINDOW_MS: number = parseNumber(
    process.env.POST_DUPLICATE_WINDOW_MS,
    10 * 60 * 1000
);
export const POST_REPORT_RATE_LIMIT_MAX_REQUESTS: number = parseNumber(
    process.env.POST_REPORT_RATE_LIMIT_MAX_REQUESTS,
    10
);
export const POST_REPORT_AUTO_RESOLVE_DAYS: number = parseNumber(
    process.env.POST_REPORT_AUTO_RESOLVE_DAYS,
    14
);
export const AUDIT_LOG_RETENTION_DAYS: number = parseNumber(
    process.env.AUDIT_LOG_RETENTION_DAYS,
    90
);
export const AUDIT_LOG_CLEANUP_INTERVAL_HOURS: number = parseNumber(
    process.env.AUDIT_LOG_CLEANUP_INTERVAL_HOURS,
    24
);
