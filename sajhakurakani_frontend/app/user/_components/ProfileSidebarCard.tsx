/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import HomePostComposer from "./HomePostComposer";

type ProfileSidebarCardProps = {
  csrfToken: string;
  firstName: string;
  fullName: string;
  initials: string;
  profileUrl?: string | null;
  bioText: string;
  allowComposer?: boolean;
  messageHref?: string | null;
};

export default function ProfileSidebarCard({
  csrfToken,
  firstName,
  fullName,
  initials,
  profileUrl,
  bioText,
  allowComposer = true,
  messageHref = null,
}: ProfileSidebarCardProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  useEffect(() => {
    if (!isComposerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsComposerOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isComposerOpen]);

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-[18px] border border-[#e6d8d0] bg-white/88 p-4 shadow-[0_14px_32px_rgba(128,84,53,0.06)]">
          <h2 className="mt-2 text-[1.25rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
            Bio
          </h2>
          <div className="mt-4 rounded-[12px] bg-[#faf7f4] px-3.5 py-3 text-[0.9rem] leading-7 text-[#616a7b]">
            {bioText}
          </div>

          {messageHref ? (
            <Link
              href={messageHref}
              className="mt-4 inline-flex w-full items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-4 py-2.5 text-[0.88rem] font-semibold text-white shadow-[0_10px_22px_rgba(241,111,56,0.16)]"
            >
              Message
            </Link>
          ) : null}
        </div>

        {allowComposer ? (
          <div className="rounded-[18px] border border-[#e6d8d0] bg-white/88 p-4 shadow-[0_14px_32px_rgba(128,84,53,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-sm font-semibold text-white">
                {profileUrl ? (
                  <img
                    src={profileUrl}
                    alt={fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(true)}
                className="flex-1 rounded-full bg-[#f5f2ef] px-4 py-3 text-left text-[0.92rem] text-[#8a8290] transition hover:bg-[#f0ebe7]"
              >
                What&apos;s on your mind, {firstName}?
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#eee3dc] pt-4">
              {["Photo", "Video", "Life Event"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setIsComposerOpen(true)}
                  className="rounded-[10px] bg-[#faf7f4] px-3.5 py-2 text-[0.85rem] font-semibold text-[#556278] transition hover:bg-[#f3eeea]"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {allowComposer && isComposerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1d243f]/22 px-4 py-6 backdrop-blur-md"
          onClick={() => setIsComposerOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsComposerOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ecd7ca] bg-white/92 text-[#7d665b] shadow-[0_12px_26px_rgba(75,46,28,0.08)] transition hover:bg-white"
              aria-label="Close create post dialog"
            >
              x
            </button>

            <HomePostComposer
              csrfToken={csrfToken}
              onSuccess={() => setIsComposerOpen(false)}
              className="max-h-[85vh] overflow-y-auto rounded-[26px] border-[#e8d5c7] bg-[#fffaf6] p-5 shadow-[0_36px_90px_rgba(38,22,15,0.18)] sm:p-6"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
