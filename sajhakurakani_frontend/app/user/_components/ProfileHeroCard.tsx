"use client";
/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";
import { ProfileViewUser } from "./profileTypes";

export type ProfileTabKey = "posts" | "friends" | "photos";

const profileTabs: Array<{ label: string; value: ProfileTabKey }> = [
  { label: "Posts", value: "posts" },
  { label: "Friends", value: "friends" },
  { label: "Photos", value: "photos" },
] as const;

type ProfileHeroCardProps = {
  user: ProfileViewUser;
  fullName: string;
  username: string;
  initials: string;
  joinedLabel: string;
  showEditButton?: boolean;
  actionSlot?: ReactNode;
  activeTab?: ProfileTabKey;
  onTabChange?: (tab: ProfileTabKey) => void;
};

export default function ProfileHeroCard({
  user,
  fullName,
  username,
  initials,
  joinedLabel,
  showEditButton = true,
  actionSlot,
  activeTab = "posts",
  onTabChange,
}: ProfileHeroCardProps) {
  return (
    <section className="overflow-hidden rounded-[22px] border border-[#e6d8d0] bg-white/90 shadow-[0_18px_42px_rgba(128,84,53,0.08)]">
      <div
        className="relative h-[220px] w-full bg-[linear-gradient(135deg,#ff8d63_0%,#f5b18d_28%,#f7d9c9_58%,#f5f8ff_100%)]"
        style={
          user?.coverUrl
            ? {
                backgroundImage: `linear-gradient(rgba(23,33,58,0.12), rgba(23,33,58,0.12)), url(${user.coverUrl})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }
            : undefined
        }
      >
        <div className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,0.18)_50%,rgba(255,255,255,0.92)_100%)]" />
      </div>

      <div className="relative px-5 pb-5 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="-mt-16 flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#1d243f] shadow-[0_16px_36px_rgba(29,36,63,0.18)]">
              {user?.profileUrl ? (
                <img
                  src={user.profileUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-3xl font-semibold text-white">
                  {initials}
                </span>
              )}
            </div>

            <div className="pb-1">
              <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-[#1d243f] sm:text-[2.35rem]">
                {fullName}
              </h1>
              <p className="mt-1 text-[0.95rem] text-[#6d7484]">{username}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.82rem] text-[#7b7580]">
                <span className="rounded-full bg-[#f7f3ef] px-3 py-1">
                  Joined {joinedLabel}
                </span>
              </div>
            </div>
          </div>

          {showEditButton || actionSlot ? (
            <div className="flex flex-wrap items-center gap-2 md:self-center">
              {showEditButton ? (
                <button
                  type="button"
                  className="rounded-[12px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-4 py-2.5 text-[0.9rem] font-semibold text-white shadow-[0_10px_22px_rgba(241,111,56,0.18)]"
                >
                  Edit profile
                </button>
              ) : null}
              {actionSlot}
            </div>
          ) : null}
        </div>

        <div className="mt-5 border-t border-[#eee3dc] pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {profileTabs.map((tab, index) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => onTabChange?.(tab.value)}
                className={`rounded-[10px] px-4 py-2 text-[0.9rem] font-semibold transition ${
                  activeTab === tab.value
                    ? "bg-[#fff1e8] text-[#ef744b]"
                    : "text-[#6c7383] hover:bg-[#f7f3ef]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
