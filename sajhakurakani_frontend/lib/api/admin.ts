import "server-only";

import axios from "axios";
import axiosInstance from "./axios";
import type { AuthUser } from "./auth";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type PaginatedPayload<T> = {
  data: T[];
  pagination: {
    page: number;
    size: number;
    total: number;
  };
};

export type AdminStats = {
  users: number;
  bannedUsers: number;
  openReports: number;
  reportsByType: {
    post: number;
    comment: number;
    friendRequest: number;
  };
};

export type AdminHealth = {
  mongoReadyState: number;
  redisConfigured: boolean;
  uptimeSeconds: number;
  adminActionRateLimit: number;
};

export type AdminReportType = "post" | "comment" | "friend-request";

export type AdminReportItem = {
  _id: string;
  type: AdminReportType;
  reason?: string;
  description?: string;
  status: "open" | "dismissed" | "resolved";
  createdAt: string;
  reporter?: {
    _id?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  post?: {
    _id?: string;
    visibility?: string;
    createdAt?: string;
    author?: {
      _id?: string;
      username?: string;
      firstName?: string;
      lastName?: string;
    } | null;
  } | null;
  comment?: {
    _id?: string;
    post?: string;
    createdAt?: string;
    author?: {
      _id?: string;
      username?: string;
      firstName?: string;
      lastName?: string;
    } | null;
  } | null;
  reportedUser?: {
    _id?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  } | null;
};

export type AdminAuditLog = {
  _id: string;
  adminUserId: string;
  adminRole: "admin";
  action: string;
  targetType: string;
  targetId?: string;
  reason?: string;
  ipAddress?: string;
  result: "success" | "failure";
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type AdminActivityItem = {
  id: string;
  adminUserId: string;
  adminRole: "admin";
  action: string;
  targetType: string;
  targetId?: string;
  reason?: string;
  result: "success" | "failure";
  createdAt: string;
};

export type AdminSecurityAlert = {
  _id: string;
  adminUserId?: string;
  type: string;
  severity: "medium" | "high" | "critical";
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  createdAt: string;
};

export type AdminUserRecord = AuthUser & {
  isBanned?: boolean;
  suspendedUntil?: string | null;
  suspensionReason?: string | null;
  createdAt?: string;
};

export type AdminManagedPost = {
  _id: string;
  title?: string;
  content?: string;
  visibility: "public" | "private" | "friends-only";
  commentCount?: number;
  recentComments?: Array<{
    _id: string;
    content?: string;
    createdAt: string;
    author?: {
      _id?: string;
      firstName?: string;
      lastName?: string;
      username?: string;
      profileUrl?: string | null;
    } | null;
  }>;
  media: Array<{
    url: string;
    type: "image" | "video";
    mimeType: string;
  }>;
  hiddenByAdmin?: boolean;
  softDeletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  author?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    profileUrl?: string | null;
  } | null;
};

export type AdminBanConfirmation = {
  confirmationId: string;
  expiresAt: string;
  message: string;
};

type ReportListQuery = {
  page?: number;
  size?: number;
  status?: string;
  type?: AdminReportType;
};

type UserListQuery = {
  page?: number;
  size?: number;
  search?: string;
};

type PostListQuery = {
  page?: number;
  size?: number;
  search?: string;
};

type AuditListQuery = {
  page?: number;
  size?: number;
  adminUserId?: string;
  action?: string;
  result?: "success" | "failure";
};

const buildQueryString = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && `${value}`.trim() !== "") {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const resolveUploadedAssetUrl = (
  value: string | null | undefined,
  type: "profile" | "cover" | "post"
) => {
  if (!value) {
    return null;
  }

  if (isAbsoluteUrl(value)) {
    return value;
  }

  if (value.startsWith("/uploads/")) {
    return API_BASE_URL ? `${API_BASE_URL}${value}` : value;
  }

  const normalizedFileName = value.replace(/^\/+/, "");
  const assetPath =
    type === "profile"
      ? `/uploads/profile/${normalizedFileName}`
      : type === "cover"
        ? `/uploads/cover/${normalizedFileName}`
        : normalizedFileName.startsWith("uploads/posts/")
          ? `/${normalizedFileName}`
          : normalizedFileName.startsWith("posts/")
            ? `/uploads/${normalizedFileName}`
            : normalizedFileName.startsWith("images/") || normalizedFileName.startsWith("videos/")
              ? `/uploads/posts/${normalizedFileName}`
              : `/uploads/posts/${normalizedFileName}`;

  return API_BASE_URL ? `${API_BASE_URL}${assetPath}` : assetPath;
};

const normalizeAdminUserRecord = (user: AdminUserRecord): AdminUserRecord => ({
  ...user,
  profileUrl: resolveUploadedAssetUrl(user.profileUrl, "profile"),
  coverUrl: resolveUploadedAssetUrl(user.coverUrl, "cover"),
});

const normalizeAdminManagedPost = (post: AdminManagedPost): AdminManagedPost => ({
  ...post,
  media: post.media.map((media) => ({
    ...media,
    url: resolveUploadedAssetUrl(media.url, "post") || media.url,
  })),
  recentComments: post.recentComments?.map((comment) => ({
    ...comment,
    author: comment.author
      ? {
          ...comment.author,
          profileUrl: resolveUploadedAssetUrl(comment.author.profileUrl, "profile"),
        }
      : comment.author,
  })),
  author: post.author
    ? {
        ...post.author,
        profileUrl: resolveUploadedAssetUrl(post.author.profileUrl, "profile"),
      }
    : post.author,
});

const getSafeAdminErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const status = error.response?.status;
  const message = ((error.response?.data as { message?: string } | undefined)?.message || "")
    .trim();
  const lowerMessage = message.toLowerCase();

  if (status === 401) {
    if (lowerMessage.includes("re-authentication")) {
      return "Recent admin verification is required before this action.";
    }

    return "Your admin session has expired. Please sign in again.";
  }

  if (status === 403) {
    if (lowerMessage.includes("protected admin network")) {
      return "Admin access is restricted to the protected admin network.";
    }

    if (lowerMessage.includes("vpn")) {
      return "Admin access is restricted to approved company or VPN networks.";
    }

    return "You do not have permission to perform this admin action.";
  }

  if (status === 404) {
    return "The requested admin record is no longer available.";
  }

  if (status === 409) {
    return message || "That admin action can no longer be completed.";
  }

  if (status === 410) {
    return message || "That admin confirmation has expired. Start again.";
  }

  if (status === 429) {
    return message || "Too many admin actions were made. Please wait a bit.";
  }

  return message || fallback;
};

export async function reauthenticateAdmin(password: string, totpCode: string) {
  try {
    const response = await axiosInstance.post<ApiResponse<{ token: string; expiresIn: string }>>(
      "/api/admin/auth/re-auth",
      {
        password,
        totpCode,
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeAdminErrorMessage(error, "Unable to verify your admin session right now.")
    );
  }
}

export async function getAdminStats() {
  try {
    const response = await axiosInstance.get<ApiResponse<AdminStats>>("/api/admin/stats");
    return response.data;
  } catch (error) {
    throw new Error(getSafeAdminErrorMessage(error, "Unable to load admin stats right now."));
  }
}

export async function getAdminHealth() {
  try {
    const response = await axiosInstance.get<ApiResponse<AdminHealth>>("/api/admin/health");
    return response.data;
  } catch (error) {
    throw new Error(getSafeAdminErrorMessage(error, "Unable to load admin health right now."));
  }
}

export async function getAdminReports(query: ReportListQuery = {}) {
  try {
    const response = await axiosInstance.get<ApiResponse<PaginatedPayload<AdminReportItem>>>(
      `/api/admin/reports${buildQueryString({
        page: query.page ?? 1,
        size: query.size ?? 20,
        status: query.status,
        type: query.type,
      })}`
    );

    return response.data;
  } catch (error) {
    throw new Error(getSafeAdminErrorMessage(error, "Unable to load admin reports right now."));
  }
}

export async function getAdminUsers(query: UserListQuery = {}) {
  try {
    const response = await axiosInstance.get<ApiResponse<PaginatedPayload<AdminUserRecord>>>(
      `/api/admin/users${buildQueryString({
        page: query.page ?? 1,
        size: query.size ?? 20,
        search: query.search?.trim() || undefined,
      })}`
    );

    return {
      ...response.data,
      data: {
        ...response.data.data,
        data: response.data.data.data.map(normalizeAdminUserRecord),
      },
    };
  } catch (error) {
    throw new Error(getSafeAdminErrorMessage(error, "Unable to load admin users right now."));
  }
}

export async function getAdminPosts(query: PostListQuery = {}) {
  try {
    const response = await axiosInstance.get<ApiResponse<PaginatedPayload<AdminManagedPost>>>(
      `/api/admin/posts${buildQueryString({
        page: query.page ?? 1,
        size: query.size ?? 12,
        search: query.search?.trim() || undefined,
      })}`
    );

    return {
      ...response.data,
      data: {
        ...response.data.data,
        data: response.data.data.data.map(normalizeAdminManagedPost),
      },
    };
  } catch (error) {
    throw new Error(getSafeAdminErrorMessage(error, "Unable to load admin posts right now."));
  }
}

export async function getAdminAuditLogs(query: AuditListQuery = {}) {
  try {
    const response = await axiosInstance.get<ApiResponse<PaginatedPayload<AdminAuditLog>>>(
      `/api/admin/audit-logs${buildQueryString({
        page: query.page ?? 1,
        size: query.size ?? 20,
        adminUserId: query.adminUserId,
        action: query.action,
        result: query.result,
      })}`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeAdminErrorMessage(error, "Unable to load admin audit logs right now.")
    );
  }
}

export async function getAdminActivity(page = 1, size = 20) {
  try {
    const response = await axiosInstance.get<ApiResponse<PaginatedPayload<AdminActivityItem>>>(
      `/api/admin/admin-activity${buildQueryString({ page, size })}`
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeAdminErrorMessage(error, "Unable to load recent admin activity right now.")
    );
  }
}

export async function getAdminSecurityAlerts() {
  try {
    const response = await axiosInstance.get<ApiResponse<AdminSecurityAlert[]>>(
      "/api/admin/security/alerts"
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getSafeAdminErrorMessage(error, "Unable to load admin security alerts right now.")
    );
  }
}

export async function dismissAdminReport(reportId: string, reason: string) {
  try {
    const response = await axiosInstance.post<ApiResponse<AdminReportItem>>(
      `/api/admin/reports/${encodeURIComponent(reportId)}/dismiss`,
      { reason }
    );
    return response.data;
  } catch (error) {
    throw new Error(getSafeAdminErrorMessage(error, "Unable to dismiss the report right now."));
  }
}

export async function actionAdminReport(
  reportId: string,
  payload: {
    actionType: "warn" | "suspend" | "ban";
    reason: string;
    durationHours?: number;
  }
) {
  try {
    const response = await axiosInstance.post<ApiResponse<AdminReportItem>>(
      `/api/admin/reports/${encodeURIComponent(reportId)}/action`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(getSafeAdminErrorMessage(error, "Unable to action the report right now."));
  }
}

export async function suspendAdminUser(
  userId: string,
  payload: { reason: string; durationHours?: number }
) {
  try {
    const response = await axiosInstance.post<ApiResponse<AdminUserRecord>>(
      `/api/admin/users/${encodeURIComponent(userId)}/suspend`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(getSafeAdminErrorMessage(error, "Unable to suspend this user right now."));
  }
}

export async function initiateAdminBanUser(userId: string, reason: string) {
  try {
    const response = await axiosInstance.post<ApiResponse<AdminBanConfirmation>>(
      `/api/admin/users/${encodeURIComponent(userId)}/ban`,
      { reason }
    );
    return response.data;
  } catch (error) {
    throw new Error(getSafeAdminErrorMessage(error, "Unable to start the ban confirmation right now."));
  }
}

export async function confirmAdminBanUser(
  userId: string,
  payload: { confirmationId: string; reason: string }
) {
  try {
    const response = await axiosInstance.post<ApiResponse<AdminUserRecord>>(
      `/api/admin/users/${encodeURIComponent(userId)}/ban/confirm`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(getSafeAdminErrorMessage(error, "Unable to complete the ban right now."));
  }
}

export async function unbanAdminUser(userId: string, reason: string) {
  try {
    const response = await axiosInstance.post<ApiResponse<AdminUserRecord>>(
      `/api/admin/users/${encodeURIComponent(userId)}/unban`,
      { reason }
    );
    return response.data;
  } catch (error) {
    throw new Error(getSafeAdminErrorMessage(error, "Unable to unban this user right now."));
  }
}

export async function deleteAdminUser(userId: string, reason: string) {
  try {
    const response = await axiosInstance.delete<ApiResponse<null>>(
      `/api/admin/users/${encodeURIComponent(userId)}`,
      {
        data: { reason },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(getSafeAdminErrorMessage(error, "Unable to delete this user right now."));
  }
}

export async function revokeAdminUserSessions(userId: string, reason: string) {
  try {
    const response = await axiosInstance.post<ApiResponse<null>>(
      `/api/admin/users/${encodeURIComponent(userId)}/revoke-sessions`,
      { reason }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      getSafeAdminErrorMessage(error, "Unable to revoke this user's sessions right now.")
    );
  }
}

export async function hideAdminPost(postId: string, reason: string) {
  try {
    const response = await axiosInstance.post<ApiResponse<null>>(
      `/api/admin/posts/${encodeURIComponent(postId)}/hide`,
      { reason }
    );
    return response.data;
  } catch (error) {
    throw new Error(getSafeAdminErrorMessage(error, "Unable to hide this post right now."));
  }
}

export async function deleteAdminPost(postId: string, reason: string) {
  try {
    const response = await axiosInstance.delete<ApiResponse<null>>(
      `/api/admin/posts/${encodeURIComponent(postId)}`,
      {
        data: { reason },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(getSafeAdminErrorMessage(error, "Unable to delete this post right now."));
  }
}

export async function hideAdminComment(commentId: string, reason: string) {
  try {
    const response = await axiosInstance.post<ApiResponse<null>>(
      `/api/admin/comments/${encodeURIComponent(commentId)}/hide`,
      { reason }
    );
    return response.data;
  } catch (error) {
    throw new Error(getSafeAdminErrorMessage(error, "Unable to hide this comment right now."));
  }
}

export async function deleteAdminComment(commentId: string, reason: string) {
  try {
    const response = await axiosInstance.delete<ApiResponse<null>>(
      `/api/admin/comments/${encodeURIComponent(commentId)}`,
      {
        data: { reason },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(getSafeAdminErrorMessage(error, "Unable to delete this comment right now."));
  }
}
