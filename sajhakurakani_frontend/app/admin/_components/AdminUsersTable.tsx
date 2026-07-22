"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import type { AdminUserRecord } from "@/lib/api/admin";

type AdminUsersTableProps = {
  csrfToken: string;
  users: AdminUserRecord[];
};

type ConfirmationState = Record<
  string,
  {
    confirmationId: string;
    expiresAt: string;
  }
>;

export default function AdminUsersTable({
  csrfToken,
  users,
}: AdminUsersTableProps) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [durationById, setDurationById] = useState<Record<string, string>>({});
  const [confirmations, setConfirmations] = useState<ConfirmationState>({});

  const selectedUser = useMemo(
    () => users.find((user) => user._id === selectedUserId) ?? null,
    [selectedUserId, users]
  );

  const getSuspendedState = (value?: string | null) =>
    Boolean(value) && new Date(value as string).getTime() > Date.now();

  const runCommand = (params: Record<string, string>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("_csrf", csrfToken);
        Object.entries(params).forEach(([key, value]) => {
          formData.set(key, value);
        });

        const response = await fetch("/api/admin/command", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json()) as {
          success: boolean;
          message?: string;
          data?: { confirmationId?: string; expiresAt?: string };
        };

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Unable to complete that admin action right now.");
        }

        if (
          params.command === "user.ban.start" &&
          payload.data?.confirmationId &&
          payload.data?.expiresAt
        ) {
          const confirmationId = payload.data.confirmationId;
          const expiresAt = payload.data.expiresAt;

          setConfirmations((current) => ({
            ...current,
            [params.id]: {
              confirmationId,
              expiresAt,
            },
          }));
          toast.success("Ban confirmation started. Confirm it within 10 seconds.");
          return;
        }

        setConfirmations((current) => {
          const next = { ...current };
          delete next[params.id];
          return next;
        });
        toast.success(payload.message || "Admin action completed.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to complete that admin action right now."
        );
      }
    });
  };

  const renderActionPanel = (user: AdminUserRecord) => {
    const reason = reasonById[user._id] || "";
    const duration = durationById[user._id] || "24";
    const confirmation = confirmations[user._id];
    const isSuspended = getSuspendedState(user.suspendedUntil);
    const hasReason = reason.trim().length > 0;

    return (
      <div className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_140px]">
          <input
            type="text"
            value={reason}
            onChange={(event) =>
              setReasonById((current) => ({
                ...current,
                [user._id]: event.target.value,
              }))
            }
            placeholder="Reason for admin action"
            className="rounded-[14px] border border-[#ead9ce] bg-[#fffdfa] px-4 py-3 text-sm text-[#1d243f] outline-none placeholder:text-[#ada4ad]"
          />
          <input
            type="number"
            min={1}
            max={720}
            value={duration}
            onChange={(event) =>
              setDurationById((current) => ({
                ...current,
                [user._id]: event.target.value,
              }))
            }
            placeholder="Hours"
            className="rounded-[14px] border border-[#ead9ce] bg-[#fffdfa] px-4 py-3 text-sm text-[#1d243f] outline-none placeholder:text-[#ada4ad]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending || !hasReason}
            onClick={() =>
              runCommand({
                command: "user.suspend",
                id: user._id,
                reason,
                durationHours: duration,
              })
            }
            className="rounded-[12px] border border-[#f1d1b8] bg-[#fff0e6] px-4 py-2 text-sm font-semibold text-[#9c4f2e]"
          >
            {isSuspended ? "Suspend again" : "Suspend"}
          </button>

          {user.isBanned ? (
            <button
              type="button"
              disabled={isPending || !hasReason}
              onClick={() =>
                runCommand({
                  command: "user.unban",
                  id: user._id,
                  reason,
                })
              }
              className="rounded-[12px] border border-[#ead6ca] bg-[#fff8f3] px-4 py-2 text-sm font-semibold text-[#526077]"
            >
              Unban
            </button>
          ) : !confirmation ? (
            <button
              type="button"
              disabled={isPending || !hasReason}
              onClick={() =>
                runCommand({
                  command: "user.ban.start",
                  id: user._id,
                  reason,
                })
              }
              className="rounded-[12px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-4 py-2 text-sm font-semibold text-white"
            >
              Start ban
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending || !hasReason}
              onClick={() =>
                runCommand({
                  command: "user.ban.confirm",
                  id: user._id,
                  reason,
                  confirmationId: confirmation.confirmationId,
                })
              }
              className="rounded-[12px] bg-[#1d243f] px-4 py-2 text-sm font-semibold text-white"
            >
              Confirm ban
            </button>
          )}

          <button
            type="button"
            disabled={isPending || !hasReason}
            onClick={() =>
              runCommand({
                command: "user.revoke-sessions",
                id: user._id,
                reason,
              })
            }
            className="rounded-[12px] border border-[#ead6ca] bg-[#fff8f3] px-4 py-2 text-sm font-semibold text-[#526077]"
          >
            Revoke sessions
          </button>

          <button
            type="button"
            disabled={isPending || !hasReason}
            onClick={() =>
              runCommand({
                command: "user.delete",
                id: user._id,
                reason,
              })
            }
            className="rounded-[12px] border border-[#f2c3b7] bg-[#fff1ed] px-4 py-2 text-sm font-semibold text-[#b14f3f]"
          >
            Delete account
          </button>
        </div>

        {!hasReason ? (
          <p className="text-xs text-[#a35a42]">
            Add a reason first so the admin action is stored in the audit trail.
          </p>
        ) : null}
      </div>
    );
  };

  if (users.length === 0) {
    return (
      <article className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-6 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
        <p className="text-lg font-semibold text-[#1d243f]">No users matched</p>
        <p className="mt-2 text-sm leading-6 text-[#6a7282]">
          Try a different search term or widen the current admin query.
        </p>
      </article>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {users.map((user) => {
          const isSuspended = getSuspendedState(user.suspendedUntil);
          const stateLabel = user.isBanned ? "Banned" : isSuspended ? "Suspended" : "Active";
          const fullName = `${user.firstName} ${user.lastName}`.trim();
          const initials =
            `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "US";

          return (
            <button
              key={user._id}
              type="button"
              onClick={() => setSelectedUserId(user._id)}
              className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 text-left shadow-[0_18px_42px_rgba(88,57,38,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_46px_rgba(88,57,38,0.11)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-base font-semibold text-white">
                    {user.profileUrl ? (
                      <img
                        src={user.profileUrl}
                        alt={fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[1rem] font-semibold text-[#1d243f]">{fullName}</p>
                    <p className="mt-1 truncate text-sm text-[#6a7282]">@{user.username}</p>
                  </div>
                </div>

                <span className="rounded-full border border-[#efe2d9] bg-[#fffaf6] px-3 py-1 text-xs font-semibold text-[#526077]">
                  {stateLabel}
                </span>
              </div>

              <p className="mt-4 truncate text-sm text-[#6a7282]">{user.email}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.22em] text-[#a0939b]">
                Click to inspect and act
              </p>
            </button>
          );
        })}
      </div>

      {selectedUser ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1d243f]/35 px-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-[1280px] overflow-hidden rounded-[28px] border border-[#ead6ca] bg-[#fffdfa] shadow-[0_26px_60px_rgba(48,27,16,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div className="px-6 py-5">
                <p className="text-[1.5rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
                  {selectedUser.firstName} {selectedUser.lastName}
                </p>
                <p className="mt-1 text-sm text-[#6a7282]">
                  @{selectedUser.username} • {selectedUser.email}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserId(null)}
                className="mr-6 mt-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ead6ca] bg-white text-xl text-[#6a7282]"
                aria-label="Close user details"
              >
                ×
              </button>
            </div>

            <div className="grid max-h-[calc(92vh-92px)] gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="border-t border-[#efe2d9] bg-white">
                <iframe
                  src={`/user/profile/${selectedUser._id}`}
                  title={`${selectedUser.firstName} ${selectedUser.lastName} profile`}
                  className="h-[76vh] w-full bg-white"
                />
              </div>

              <div className="border-t border-l border-[#efe2d9] bg-[#fffdfa] p-5">
                <div className="grid gap-4 md:grid-cols-1">
                  <div className="rounded-[18px] border border-[#efe2d9] bg-white px-4 py-4">
                    <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[#8c8690]">Role</p>
                    <p className="mt-2 text-sm font-semibold text-[#1d243f]">{selectedUser.role}</p>
                  </div>
                  <div className="rounded-[18px] border border-[#efe2d9] bg-white px-4 py-4">
                    <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[#8c8690]">Status</p>
                    <p className="mt-2 text-sm font-semibold text-[#1d243f]">
                      {selectedUser.isBanned
                        ? "Banned"
                        : getSuspendedState(selectedUser.suspendedUntil)
                          ? "Suspended"
                          : "Active"}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-[#efe2d9] bg-white px-4 py-4">
                    <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[#8c8690]">Joined</p>
                    <p className="mt-2 text-sm font-semibold text-[#1d243f]">
                      {selectedUser.createdAt
                        ? new Date(selectedUser.createdAt).toLocaleDateString()
                        : "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[20px] border border-[#efe2d9] bg-white p-4">
                  <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[#8c8690]">
                    Bio
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#677086]">
                    {selectedUser.bio?.trim() || "No bio added yet."}
                  </p>
                </div>

                <div className="mt-5 rounded-[20px] border border-[#efe2d9] bg-white p-4">
                  <div className="mb-4 flex flex-wrap gap-2">
                    <a
                      href={`/admin/posts?search=${encodeURIComponent(selectedUser.username)}`}
                      className="rounded-[12px] border border-[#ead6ca] bg-[#fff8f3] px-4 py-2 text-sm font-semibold text-[#526077]"
                    >
                      Open this user's posts
                    </a>
                  </div>
                  {renderActionPanel(selectedUser)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
