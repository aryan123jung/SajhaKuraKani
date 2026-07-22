"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import type { AdminManagedPost } from "@/lib/api/admin";

type AdminPostsTableProps = {
  csrfToken: string;
  posts: AdminManagedPost[];
};

const formatAuthorName = (post: AdminManagedPost) => {
  const firstName = post.author?.firstName?.trim() || "";
  const lastName = post.author?.lastName?.trim() || "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || post.author?.username || "Unknown author";
};

const formatVisibility = (value: AdminManagedPost["visibility"]) =>
  value === "friends-only" ? "Friends only" : value.charAt(0).toUpperCase() + value.slice(1);

export default function AdminPostsTable({ csrfToken, posts }: AdminPostsTableProps) {
  const router = useRouter();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [reasonById, setReasonById] = useState<Record<string, string>>({});

  const selectedPost = useMemo(
    () => posts.find((post) => post._id === selectedPostId) ?? null,
    [selectedPostId, posts]
  );

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
        };

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Unable to complete that post action right now.");
        }

        toast.success(payload.message || "Post action completed.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to complete that post action right now."
        );
      }
    });
  };

  const renderActionPanel = (post: AdminManagedPost) => {
    const reason = reasonById[post._id] || "";
    const hasReason = reason.trim().length > 0;

    return (
      <div className="space-y-3">
        <textarea
          value={reason}
          onChange={(event) =>
            setReasonById((current) => ({
              ...current,
              [post._id]: event.target.value,
            }))
          }
          rows={3}
          placeholder="Reason for hide or delete action"
          className="w-full rounded-[16px] border border-[#ead9ce] bg-[#fffdfa] px-4 py-3 text-sm text-[#1d243f] outline-none placeholder:text-[#ada4ad]"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending || !hasReason}
            onClick={() =>
              runCommand({
                command: "post.hide",
                id: post._id,
                reason,
              })
            }
            className="rounded-[12px] border border-[#f1d1b8] bg-[#fff0e6] px-4 py-2 text-sm font-semibold text-[#9c4f2e]"
          >
            {post.hiddenByAdmin ? "Hide again" : "Hide post"}
          </button>

          <button
            type="button"
            disabled={isPending || !hasReason}
            onClick={() =>
              runCommand({
                command: "post.delete",
                id: post._id,
                reason,
              })
            }
            className="rounded-[12px] border border-[#f2c3b7] bg-[#fff1ed] px-4 py-2 text-sm font-semibold text-[#b14f3f]"
          >
            Delete post
          </button>
        </div>

        {!hasReason ? (
          <p className="text-xs text-[#a35a42]">
            Add a reason first so the moderation action can be audited properly.
          </p>
        ) : null}
      </div>
    );
  };

  if (posts.length === 0) {
    return (
      <article className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-6 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
        <p className="text-lg font-semibold text-[#1d243f]">No posts matched</p>
        <p className="mt-2 text-sm leading-6 text-[#6a7282]">
          Try a broader search or move to another admin page to inspect users and reports.
        </p>
      </article>
    );
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        {posts.map((post) => {
          const authorName = formatAuthorName(post);
          const previewMedia = post.media[0];
          const previewText = post.content?.trim() || "No post text";

          return (
            <button
              key={post._id}
              type="button"
              onClick={() => setSelectedPostId(post._id)}
              className="overflow-hidden rounded-[24px] border border-[#ead6ca] bg-white/92 text-left shadow-[0_18px_42px_rgba(88,57,38,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_46px_rgba(88,57,38,0.11)]"
            >
              {previewMedia ? (
                <div className="h-[220px] w-full overflow-hidden bg-[#f5eee9]">
                  {previewMedia.type === "image" ? (
                    <img
                      src={previewMedia.url}
                      alt={post.title || "Post media"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <video
                      src={previewMedia.url}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
                  )}
                </div>
              ) : null}

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-[#1d243f]">
                      {post.title?.trim() || "Untitled post"}
                    </p>
                    <p className="mt-1 truncate text-sm text-[#6a7282]">{authorName}</p>
                  </div>

                  <span className="rounded-full border border-[#efe2d9] bg-[#fffaf6] px-3 py-1 text-xs font-semibold text-[#526077]">
                    {formatVisibility(post.visibility)}
                  </span>
                </div>

                <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#677086]">{previewText}</p>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-[#9d9096]">
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  <span>{post.media.length} media</span>
                  <span>{post.commentCount ?? 0} comments</span>
                  {post.hiddenByAdmin ? <span>Hidden</span> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedPost ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1d243f]/35 px-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-[980px] overflow-y-auto rounded-[28px] border border-[#ead6ca] bg-[#fffdfa] p-6 shadow-[0_26px_60px_rgba(48,27,16,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[1.5rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
                  {selectedPost.title?.trim() || "Untitled post"}
                </p>
                <p className="mt-2 text-sm text-[#6a7282]">
                  {formatAuthorName(selectedPost)}
                  {selectedPost.author?.username ? ` • @${selectedPost.author.username}` : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPostId(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ead6ca] bg-white text-xl text-[#6a7282]"
                aria-label="Close post details"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-[18px] border border-[#efe2d9] bg-white px-4 py-4">
                <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[#8c8690]">Visibility</p>
                <p className="mt-2 text-sm font-semibold text-[#1d243f]">
                  {formatVisibility(selectedPost.visibility)}
                </p>
              </div>
              <div className="rounded-[18px] border border-[#efe2d9] bg-white px-4 py-4">
                <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[#8c8690]">State</p>
                <p className="mt-2 text-sm font-semibold text-[#1d243f]">
                  {selectedPost.softDeletedAt
                    ? "Deleted"
                    : selectedPost.hiddenByAdmin
                      ? "Hidden"
                      : "Visible"}
                </p>
              </div>
              <div className="rounded-[18px] border border-[#efe2d9] bg-white px-4 py-4">
                <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[#8c8690]">Published</p>
                <p className="mt-2 text-sm font-semibold text-[#1d243f]">
                  {new Date(selectedPost.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {selectedPost.content ? (
              <div className="mt-5 rounded-[20px] border border-[#efe2d9] bg-white p-4">
                <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[#8c8690]">Content</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#677086]">
                  {selectedPost.content}
                </p>
              </div>
            ) : null}

            {selectedPost.media.length > 0 ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {selectedPost.media.map((media, index) => (
                  <div
                    key={`${selectedPost._id}-${media.url}-${index}`}
                    className="overflow-hidden rounded-[20px] border border-[#efe2d9] bg-white"
                  >
                    {media.type === "image" ? (
                      <img
                        src={media.url}
                        alt={`Post media ${index + 1}`}
                        className="h-[280px] w-full object-cover"
                      />
                    ) : (
                      <video
                        src={media.url}
                        className="h-[280px] w-full object-cover"
                        controls
                        playsInline
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-5 rounded-[20px] border border-[#efe2d9] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[#8c8690]">
                  Recent comments
                </p>
                <p className="text-sm font-semibold text-[#526077]">
                  {selectedPost.commentCount ?? 0}
                </p>
              </div>

              {selectedPost.recentComments && selectedPost.recentComments.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {selectedPost.recentComments.map((comment) => {
                    const commentAuthor =
                      `${comment.author?.firstName ?? ""} ${comment.author?.lastName ?? ""}`.trim() ||
                      comment.author?.username ||
                      "Unknown";

                    return (
                      <div
                        key={comment._id}
                        className="rounded-[16px] border border-[#f1e5dd] bg-[#fffaf6] px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[#1d243f]">{commentAuthor}</p>
                          <p className="text-xs text-[#8f8790]">
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#677086]">
                          {comment.content?.trim() || "No comment text available."}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[#6a7282]">
                  No visible comments were found for this post.
                </p>
              )}
            </div>

            <div className="mt-5 rounded-[20px] border border-[#efe2d9] bg-white p-4">
              {renderActionPanel(selectedPost)}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
