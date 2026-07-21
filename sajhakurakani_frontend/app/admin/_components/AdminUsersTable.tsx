"use client";

import { useState, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [durationById, setDurationById] = useState<Record<string, string>>({});
  const [confirmations, setConfirmations] = useState<ConfirmationState>({});
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
          setConfirmations((current) => ({
            ...current,
            [params.id]: {
              confirmationId: payload.data!.confirmationId!,
              expiresAt: payload.data!.expiresAt!,
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

  return (
    <div className="space-y-4">
      {users.length === 0 ? (
        <article className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-6 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
          <p className="text-lg font-semibold text-[#1d243f]">No users matched</p>
          <p className="mt-2 text-sm leading-6 text-[#6a7282]">
            Try a different search term or widen the current admin query.
          </p>
        </article>
      ) : (
        users.map((user) => {
          const reason = reasonById[user._id] || "";
          const duration = durationById[user._id] || "24";
          const confirmation = confirmations[user._id];
          const isSuspended = getSuspendedState(user.suspendedUntil);

          return (
            <article
              key={user._id}
              className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-[#1d243f]">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="mt-1 text-sm text-[#6a7282]">@{user.username}</p>
                  <p className="mt-1 text-sm text-[#6a7282]">{user.email}</p>
                </div>
                <div className="rounded-[16px] border border-[#efe2d9] bg-[#fffaf6] px-4 py-3 text-right">
                  <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[#8c8690]">
                    State
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#1d243f]">
                    {user.isBanned ? "Banned" : isSuspended ? "Suspended" : "Active"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_140px]">
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

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isPending}
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
                  Suspend
                </button>

                {user.isBanned ? (
                  <button
                    type="button"
                    disabled={isPending}
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
                    disabled={isPending}
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
                    disabled={isPending}
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
                  disabled={isPending}
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
                  disabled={isPending}
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
            </article>
          );
        })
      )}
    </div>
  );
}
