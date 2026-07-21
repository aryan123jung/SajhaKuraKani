"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import HomePostComposer from "./HomePostComposer";

type HomeComposerLauncherProps = {
  csrfToken: string;
  firstName: string;
  fullName: string;
  initials: string;
  profileUrl?: string | null;
};

export default function HomeComposerLauncher({
  csrfToken,
  firstName,
  fullName,
  initials,
  profileUrl,
}: HomeComposerLauncherProps) {
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

      {isComposerOpen ? (
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
