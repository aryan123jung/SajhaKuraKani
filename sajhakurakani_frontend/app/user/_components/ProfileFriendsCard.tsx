/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type { FriendProfile } from "@/lib/api/friends";

type ProfileFriendsCardProps = {
  friends: FriendProfile[];
  emptyMessage: string;
};

const getUserInitials = (firstName: string, lastName: string, username: string) =>
  `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() ||
  username.slice(0, 2).toUpperCase();

export default function ProfileFriendsCard({
  friends,
  emptyMessage,
}: ProfileFriendsCardProps) {
  return (
    <section
      id="friends"
      className="rounded-[18px] border border-[#e6d8d0] bg-white/88 p-5 shadow-[0_14px_32px_rgba(128,84,53,0.06)]"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ef744b]">
            Friends
          </p>
          <h2 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.05em] text-[#1d243f]">
            Connections
          </h2>
        </div>
        <span className="rounded-full bg-[#f7f3ef] px-3 py-1 text-[0.78rem] font-semibold text-[#7b7580]">
          {friends.length}
        </span>
      </div>

      {friends.length === 0 ? (
        <p className="mt-4 rounded-[14px] border border-[#efe0d6] bg-[#fff8f3] px-4 py-4 text-[0.9rem] leading-7 text-[#6b7080]">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {friends.map((friend) => (
            <Link
              key={friend.id}
              href={`/user/profile/${friend.id}`}
              className="flex items-center gap-3 rounded-[16px] border border-[#efe0d6] bg-[#fffaf7] p-4 transition hover:border-[#efcdbd] hover:bg-white"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-xs font-semibold text-white">
                {friend.profileUrl ? (
                  <img
                    src={friend.profileUrl}
                    alt={`${friend.firstName} ${friend.lastName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getUserInitials(friend.firstName, friend.lastName, friend.username)
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[0.98rem] font-semibold text-[#1d243f]">
                  {friend.firstName} {friend.lastName}
                </p>
                <p className="mt-1 truncate text-[0.84rem] text-[#7b7580]">
                  @{friend.username}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
