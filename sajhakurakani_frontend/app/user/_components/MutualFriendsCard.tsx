/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type { CompactFriendProfile } from "@/lib/api/auth";

type MutualFriendsCardProps = {
  mutualFriends: CompactFriendProfile[];
  mutualFriendsCount: number;
};

const getUserInitials = (firstName: string, lastName: string, username: string) =>
  `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() ||
  username.slice(0, 2).toUpperCase();

export default function MutualFriendsCard({
  mutualFriends,
  mutualFriendsCount,
}: MutualFriendsCardProps) {
  return (
    <div className="rounded-[16px] border border-[#efe0d6] bg-[#fffaf7] p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ef744b]">
            Mutuals
          </p>
          <h3 className="mt-2 text-[1.05rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
            Mutual friends
          </h3>
        </div>
        <span className="rounded-full bg-[#f7f3ef] px-3 py-1 text-[0.76rem] font-semibold text-[#7b7580]">
          {mutualFriendsCount}
        </span>
      </div>

      {mutualFriendsCount === 0 ? (
        <p className="mt-3 text-[0.88rem] leading-6 text-[#6b7080]">
          No mutual friends yet.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {mutualFriends.map((friend) => (
            <Link
              key={friend.id}
              href={`/user/profile/${friend.id}`}
              className="flex items-center gap-3 rounded-[12px] border border-[#efe0d6] bg-white px-3 py-3 transition hover:bg-[#fff8f3]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-[0.72rem] font-semibold text-white">
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
                <p className="truncate text-[0.9rem] font-semibold text-[#1d243f]">
                  {friend.firstName} {friend.lastName}
                </p>
                <p className="mt-0.5 truncate text-[0.8rem] text-[#7b7580]">
                  @{friend.username}
                </p>
              </div>
            </Link>
          ))}

          {mutualFriendsCount > mutualFriends.length ? (
            <p className="text-[0.8rem] text-[#7b7580]">
              And {mutualFriendsCount - mutualFriends.length} more mutual
              {mutualFriendsCount - mutualFriends.length === 1 ? " friend" : " friends"}.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
