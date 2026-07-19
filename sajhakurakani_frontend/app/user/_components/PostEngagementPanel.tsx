"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PostComment } from "@/lib/api/posts";
import {
  createCommentAction,
  deleteCommentAction,
  likePostAction,
  loadPostCommentsAction,
  unlikePostAction,
} from "@/lib/actions/posts";

type PostEngagementPanelProps = {
  csrfToken: string;
  postId: string;
  currentUserId: string;
  postOwnerId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  initialCommentCount: number | null;
  commentsAvailable: boolean;
  canComment: boolean;
};

const formatCommentDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const getInitials = (comment: PostComment) =>
  `${comment.author?.firstName?.[0] ?? ""}${comment.author?.lastName?.[0] ?? ""}`.toUpperCase() ||
  comment.author?.username?.slice(0, 2).toUpperCase() ||
  "SK";

export default function PostEngagementPanel({
  csrfToken,
  postId,
  currentUserId,
  postOwnerId,
  initialLiked,
  initialLikeCount,
  initialCommentCount,
  commentsAvailable,
  canComment,
}: PostEngagementPanelProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [commentCount, setCommentCount] = useState<number | null>(initialCommentCount);
  const [commentList, setCommentList] = useState<PostComment[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentMessage, setCommentMessage] = useState("");
  const [likeMessage, setLikeMessage] = useState("");
  const [isLikePending, startLikeTransition] = useTransition();
  const [isCommentsPending, startCommentsTransition] = useTransition();

  const openComments = () => {
    const nextOpen = !commentsOpen;
    setCommentsOpen(nextOpen);
    setCommentMessage("");

    if (!nextOpen || commentsLoaded || !commentsAvailable) {
      return;
    }

    startCommentsTransition(async () => {
      const result = await loadPostCommentsAction(postId);

      if (!result.success) {
        setCommentMessage(result.message);
        return;
      }

      setCommentList(result.comments);
      setCommentCount(result.commentCount);
      setCommentsLoaded(true);
    });
  };

  const toggleLike = () => {
    setLikeMessage("");

    startLikeTransition(async () => {
      const result = liked
        ? await unlikePostAction(postId)
        : await likePostAction(postId);

      if (!result.success) {
        setLikeMessage(result.message);
        return;
      }

      setLiked(result.liked);
      setLikeCount(result.likeCount);
      setCommentCount(result.commentCount);
      router.refresh();
    });
  };

  const handleCommentCreate = (formData: FormData) => {
    setCommentMessage("");

    startCommentsTransition(async () => {
      const result = await createCommentAction(formData);

      if (!result.success) {
        setCommentMessage(result.message);
        return;
      }

      setCommentList(result.comments);
      setCommentCount(result.commentCount);
      setCommentsLoaded(true);
      setCommentsOpen(true);
      setCommentMessage("Comment posted.");
      const form = document.getElementById(`comment-form-${postId}`) as HTMLFormElement | null;
      form?.reset();
      router.refresh();
    });
  };

  const handleCommentDelete = (formData: FormData) => {
    setCommentMessage("");

    startCommentsTransition(async () => {
      const result = await deleteCommentAction(formData);

      if (!result.success) {
        setCommentMessage(result.message);
        return;
      }

      setCommentList(result.comments);
      setCommentCount(result.commentCount);
      setCommentsLoaded(true);
      setCommentMessage("Comment removed.");
      router.refresh();
    });
  };

  return (
    <div className="mt-4 rounded-[16px] border border-[#eee3dc] bg-[#fffdfa] p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={toggleLike}
          disabled={isLikePending}
          className={`rounded-full px-3.5 py-2 text-[0.84rem] font-semibold transition ${
            liked
              ? "bg-[#ef744b] text-white shadow-[0_8px_18px_rgba(241,111,56,0.16)]"
              : "border border-[#ead8cd] bg-white text-[#586273] hover:bg-[#fff8f3]"
          }`}
        >
          {isLikePending ? "Working..." : liked ? `Liked · ${likeCount}` : `Like · ${likeCount}`}
        </button>

        <button
          type="button"
          onClick={openComments}
          disabled={isCommentsPending && !commentsLoaded}
          className="rounded-full border border-[#ead8cd] bg-white px-3.5 py-2 text-[0.84rem] font-semibold text-[#586273] transition hover:bg-[#fff8f3]"
        >
          {commentsAvailable
            ? `Comments · ${commentCount ?? 0}`
            : "Comments unavailable"}
        </button>

        {likeMessage ? (
          <span className="text-[0.8rem] text-[#b14f3f]">{likeMessage}</span>
        ) : null}
      </div>

      {commentsOpen ? (
        <div className="mt-4 space-y-3 border-t border-[#f1e6de] pt-4">
          {commentsAvailable ? (
            <>
              <form
                id={`comment-form-${postId}`}
                action={handleCommentCreate}
                className="space-y-3"
              >
                <input type="hidden" name="_csrf" value={csrfToken} />
                <input type="hidden" name="postId" value={postId} />
                <textarea
                  name="content"
                  rows={3}
                  placeholder={
                    canComment
                      ? "Write a thoughtful comment..."
                      : "Comments are disabled for this post."
                  }
                  disabled={!canComment || isCommentsPending}
                  className="w-full rounded-[12px] border border-[#ead8cd] bg-white px-4 py-3 text-[0.9rem] leading-6 text-[#1d243f] outline-none transition focus:border-[#ef744b] disabled:cursor-not-allowed disabled:bg-[#f8f4f1]"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[0.76rem] leading-5 text-[#8a8791]">
                    Keep comments respectful. Unsafe text and spam are blocked by the backend.
                  </p>
                  <button
                    type="submit"
                    disabled={!canComment || isCommentsPending}
                    className="rounded-[10px] bg-[#ef744b] px-4 py-2 text-[0.84rem] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isCommentsPending ? "Sending..." : "Comment"}
                  </button>
                </div>
              </form>

              {commentMessage ? (
                <div
                  className={`rounded-[12px] px-3.5 py-3 text-[0.84rem] ${
                    commentMessage.toLowerCase().includes("unable") ||
                    commentMessage.toLowerCase().includes("failed") ||
                    commentMessage.toLowerCase().includes("security")
                      ? "border border-[#f1d2c7] bg-[#fff1ec] text-[#b14f3f]"
                      : "border border-[#d8ebe4] bg-[#f3fbf8] text-[#2f8f77]"
                  }`}
                >
                  {commentMessage}
                </div>
              ) : null}

              <div className="space-y-3">
                {commentList.length === 0 ? (
                  <div className="rounded-[12px] border border-[#ead8cd] bg-white px-4 py-3 text-[0.86rem] text-[#667086]">
                    No comments yet.
                  </div>
                ) : (
                  commentList.map((comment) => {
                    const canDelete =
                      comment.author?._id === currentUserId || postOwnerId === currentUserId;

                    return (
                      <div
                        key={comment._id}
                        className="rounded-[14px] border border-[#ead8cd] bg-white px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d243f] text-[0.72rem] font-semibold text-white">
                              {getInitials(comment)}
                            </span>
                            <div>
                              <p className="text-[0.88rem] font-semibold text-[#1d243f]">
                                {`${comment.author?.firstName ?? ""} ${comment.author?.lastName ?? ""}`.trim() ||
                                  comment.author?.username ||
                                  "Secure user"}
                              </p>
                              <p className="text-[0.72rem] text-[#8a8791]">
                                {formatCommentDate(comment.createdAt)}
                              </p>
                            </div>
                          </div>

                          {canDelete ? (
                            <form action={handleCommentDelete}>
                              <input type="hidden" name="_csrf" value={csrfToken} />
                              <input type="hidden" name="postId" value={postId} />
                              <input type="hidden" name="commentId" value={comment._id} />
                              <button
                                type="submit"
                                disabled={isCommentsPending}
                                className="rounded-[10px] px-3 py-1.5 text-[0.78rem] font-semibold text-[#b14f3f] transition hover:bg-[#fff1ec]"
                              >
                                Delete
                              </button>
                            </form>
                          ) : null}
                        </div>

                        <p className="mt-3 text-[0.88rem] leading-6 text-[#586273]">
                          {comment.content || "[deleted]"}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="rounded-[12px] border border-[#ead8cd] bg-white px-4 py-3 text-[0.86rem] text-[#667086]">
              Comments are not available for this post.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
