"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";

type AdminReauthPanelProps = {
  csrfToken: string;
};

export default function AdminReauthPanel({ csrfToken }: AdminReauthPanelProps) {
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("_csrf", csrfToken);
        formData.set("password", password);
        formData.set("totpCode", totpCode);

        const response = await fetch("/api/admin/re-auth", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json()) as { success: boolean; message: string };

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Unable to unlock admin actions right now.");
        }

        setPassword("");
        setTotpCode("");
        toast.success(payload.message);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to unlock admin actions right now."
        );
      }
    });
  };

  return (
    <section className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#ef744b]">
            Sensitive Actions
          </p>
          <p className="mt-2 text-sm leading-6 text-[#6a7282]">
            Re-verify with your password and authenticator code before bans, deletions, and account enforcement.
          </p>
        </div>
        <div className="grid flex-[1.3] gap-3 sm:grid-cols-[1fr_170px_auto]">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Admin password"
            className="rounded-[14px] border border-[#ead9ce] bg-[#fffdfa] px-4 py-3 text-sm text-[#1d243f] outline-none placeholder:text-[#ada4ad]"
          />
          <input
            type="text"
            inputMode="numeric"
            value={totpCode}
            onChange={(event) => setTotpCode(event.target.value)}
            placeholder="6-digit code"
            className="rounded-[14px] border border-[#ead9ce] bg-[#fffdfa] px-4 py-3 text-sm text-[#1d243f] outline-none placeholder:text-[#ada4ad]"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-[14px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(241,111,56,0.18)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Verifying..." : "Unlock"}
          </button>
        </div>
      </div>
    </section>
  );
}
