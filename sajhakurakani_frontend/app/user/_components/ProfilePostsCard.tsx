/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  deletePostAction,
  updatePostAction,
} from "@/lib/actions/posts";
import PostEngagementPanel from "./PostEngagementPanel";
import {
  initialDeletePostActionState,
  initialUpdatePostActionState,
} from "@/lib/actions/post-state";
import PostMediaGallery from "./PostMediaGallery";
import { ProfilePost, ProfileViewUser } from "./profileTypes";

type ProfilePostsCardProps = {
  csrfToken: string;
  user: ProfileViewUser;
  fullName: string;
  initials: string;
  posts: ProfilePost[];
};

export default function ProfilePostsCard({
  csrfToken,
  user,
  fullName,
  initials,
  posts,
}: ProfilePostsCardProps) {
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [updateState, setUpdateState] = useState(initialUpdatePostActionState);
  const [deleteState, setDeleteState] = useState(initialDeletePostActionState);
  const [isUpdatePending, startUpdateTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const handleUpdateAction = (formData: FormData) => {
    startUpdateTransition(async () => {
      const nextState = await updatePostAction(initialUpdatePostActionState, formData);
      setUpdateState(nextState);

      if (nextState.success) {
        setEditingPostId(null);
      }
    });
  };

  const handleDeleteAction = (formData: FormData) => {
    startDeleteTransition(async () => {
      const nextState = await deletePostAction(initialDeletePostActionState, formData);
      setDeleteState(nextState);
    });
  };

  return (
    <div className="space-y-4">
      {posts.length === 0 ? (
        <div className="rounded-[18px] border border-[#e6d8d0] bg-white/88 p-5 shadow-[0_14px_32px_rgba(128,84,53,0.06)]">
          <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-[#1d243f]">
            No posts yet
          </p>
          <p className="mt-2 text-[0.92rem] leading-6 text-[#636c7e]">
            Your secure posts will appear here once you start sharing updates.
          </p>
        </div>
      ) : null}

      {posts.map((post) => (
        <article
          key={post.id}
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
              <p className="text-[0.95rem] font-semibold text-[#1d243f]">
                {fullName}
              </p>
              <p className="text-[0.76rem] text-[#798092]">
                {post.meta} · {post.visibility}
              </p>
            </div>
          </div>

          {editingPostId === post.id ? (
            <form action={handleUpdateAction} className="mt-4 space-y-3">
              <input type="hidden" name="_csrf" value={csrfToken} />
              <input type="hidden" name="postId" value={post.id} />

              <input
                name="title"
                defaultValue={post.title === "Untitled post" ? "" : post.title}
                placeholder="Post title"
                className="w-full rounded-[12px] border border-[#ead8cd] bg-[#fffaf7] px-4 py-3 text-[0.92rem] text-[#1d243f] outline-none transition focus:border-[#ef744b]"
              />
              <textarea
                name="content"
                defaultValue={
                  post.body === "This post does not include any text yet."
                    ? ""
                    : post.body
                }
                placeholder="Write your update"
                rows={5}
                className="w-full rounded-[12px] border border-[#ead8cd] bg-[#fffaf7] px-4 py-3 text-[0.92rem] leading-6 text-[#1d243f] outline-none transition focus:border-[#ef744b]"
              />
              <select
                name="visibility"
                defaultValue={post.visibility}
                className="w-full rounded-[12px] border border-[#ead8cd] bg-[#fffaf7] px-4 py-3 text-[0.92rem] text-[#1d243f] outline-none transition focus:border-[#ef744b]"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="friends-only">Friends only</option>
              </select>

              {updateState.message && updateState.activePostId === post.id ? (
                <div
                  className="rounded-[12px] px-3.5 py-3 text-[0.86rem]"
                  data-tone={updateState.success ? "success" : "error"}
                >
                  {updateState.message}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={isUpdatePending}
                  className="rounded-[10px] bg-[#ef744b] px-4 py-2 text-[0.86rem] font-semibold text-white"
                >
                  {isUpdatePending ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPostId(null)}
                  className="rounded-[10px] bg-[#f7f3ef] px-4 py-2 text-[0.86rem] font-semibold text-[#6b7282]"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="mt-4 text-[1.4rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
                {post.title}
              </p>
              <p className="mt-2.5 text-[0.94rem] leading-7 text-[#636c7e]">
                {post.body}
              </p>
              <PostMediaGallery media={post.media} />
            </>
          )}

          <PostEngagementPanel
            csrfToken={csrfToken}
            postId={post.id}
            currentUserId={user?._id ?? ""}
            postOwnerId={post.authorId}
            initialLiked={post.liked}
            initialLikeCount={post.likeCount}
            initialCommentCount={post.commentCount}
            commentsAvailable={post.commentsAvailable}
            canComment={post.canComment}
          />
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#eee3dc] pt-4">
            <button
              type="button"
              onClick={() => setEditingPostId(post.id)}
              className="rounded-[10px] px-3.5 py-2 text-[0.86rem] font-semibold text-[#6b7282] transition hover:bg-[#f7f3ef]"
            >
              Edit
            </button>
            <form action={handleDeleteAction}>
              <input type="hidden" name="_csrf" value={csrfToken} />
              <input type="hidden" name="postId" value={post.id} />
              <button
                type="submit"
                disabled={isDeletePending}
                className="rounded-[10px] px-3.5 py-2 text-[0.86rem] font-semibold text-[#b14f3f] transition hover:bg-[#fff1ec]"
              >
                {isDeletePending ? "Deleting..." : "Delete"}
              </button>
            </form>
            {deleteState.message && deleteState.activePostId === post.id ? (
              <span
                className={`text-[0.82rem] ${
                  deleteState.success ? "text-[#2f8f77]" : "text-[#b14f3f]"
                }`}
              >
                {deleteState.message}
              </span>
            ) : null}
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
