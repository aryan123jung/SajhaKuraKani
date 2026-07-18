/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ProfilePost, ProfileViewUser } from "./profileTypes";

type ProfilePostsCardProps = {
  user: ProfileViewUser;
  fullName: string;
  initials: string;
  posts: ProfilePost[];
};

export default function ProfilePostsCard({
  user,
  fullName,
  initials,
  posts,
}: ProfilePostsCardProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-[18px] border border-[#e6d8d0] bg-white/88 p-4 shadow-[0_14px_32px_rgba(128,84,53,0.06)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-sm font-semibold text-white">
            {user?.profileUrl ? (
              <img
                src={user.profileUrl}
                alt={fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <button
            type="button"
            className="flex-1 rounded-full bg-[#f5f2ef] px-4 py-3 text-left text-[0.92rem] text-[#8a8290]"
          >
            What&apos;s on your mind?
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#eee3dc] pt-4">
          {["Photo", "Video", "Life Event"].map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-[10px] bg-[#faf7f4] px-3.5 py-2 text-[0.85rem] font-semibold text-[#556278]"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {posts.map((post, index) => (
        <article
          key={post.title}
          className="rounded-[18px] border border-[#e6d8d0] bg-white/88 p-4 shadow-[0_14px_32px_rgba(128,84,53,0.06)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-sm font-semibold text-white">
              {user?.profileUrl ? (
                <img
                  src={user.profileUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div>
              <p className="text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-[#8a8290]">
                User
              </p>
              <p className="text-[0.95rem] font-semibold text-[#1d243f]">
                {fullName}
              </p>
              <p className="text-[0.76rem] text-[#798092]">
                {post.meta} · {index === 0 ? "Now" : "2h"}
              </p>
            </div>
          </div>

          <p className="mt-4 text-[1.4rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
            {post.title}
          </p>
          <p className="mt-2.5 text-[0.94rem] leading-7 text-[#636c7e]">
            {post.body}
          </p>

          <div className="mt-4 overflow-hidden rounded-[14px] bg-[linear-gradient(135deg,#fff1e8_0%,#ffe4d4_28%,#fce7dc_52%,#f4f7ff_100%)] p-5">
            <div className="flex h-[180px] items-end rounded-[12px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.68),rgba(255,255,255,0.24))] p-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#ef744b]">
                  Profile update
                </p>
                <p className="mt-2 text-[1.3rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
                  A calmer social identity page.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-[#eee3dc] pt-4">
            {["Like", "Comment", "Share"].map((action) => (
              <button
                key={action}
                type="button"
                className="rounded-[10px] px-3.5 py-2 text-[0.86rem] font-semibold text-[#6b7282] transition hover:bg-[#f7f3ef]"
              >
                {action}
              </button>
            ))}
          </div>
        </article>
      ))}

      <div className="rounded-[18px] border border-[#e6d8d0] bg-white/88 p-4 text-center shadow-[0_14px_32px_rgba(128,84,53,0.06)]">
        <Link
          href="/user/home"
          className="inline-flex rounded-[12px] bg-[#f7f3ef] px-4 py-2.5 text-[0.9rem] font-semibold text-[#556278]"
        >
          Return to home feed
        </Link>
      </div>
    </div>
  );
}
