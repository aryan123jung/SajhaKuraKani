import Link from "next/link";
import { getCurrentUser } from "@/lib/api/auth";
import { getMessageConversations, type MessageConversationSummary } from "@/lib/api/messages";
import { getCurrentUserPosts, getPostEngagement, type PostMedia } from "@/lib/api/posts";
import { getCsrfToken } from "@/lib/csrf";
import HomePostComposer from "../_components/HomePostComposer";
import PostEngagementPanel from "../_components/PostEngagementPanel";
import PostMediaGallery from "../_components/PostMediaGallery";

const quickActions = [
  {
    label: "Create post",
    href: "/user/home",
  },
] as const;

export default async function UserHomePage() {
  let conversations: MessageConversationSummary[] = [];
  let user = null;
  let posts: Array<{
    id: string;
    authorId: string;
    title: string;
    body: string;
    meta: string;
    visibility: "public" | "private" | "friends-only";
    liked: boolean;
    likeCount: number;
    commentCount: number | null;
    commentsAvailable: boolean;
    canComment: boolean;
    media: PostMedia[];
    mediaCount: number;
  }> = [];

  try {
    const [userResponse, postsResponse, conversationsResponse] = await Promise.all([
      getCurrentUser(),
      getCurrentUserPosts(),
      getMessageConversations(undefined, 1, 3),
    ]);
    user = userResponse.data;
    conversations = conversationsResponse.data;
    const engagementList = await Promise.all(
      postsResponse.data.map((post) => getPostEngagement(post._id))
    );
    posts = postsResponse.data.map((post, index) => ({
      id: post._id,
      authorId: userResponse.data._id,
      title: post.title?.trim() || "Untitled post",
      body: post.content?.trim() || "This post does not include any text yet.",
      meta: new Date(post.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      visibility: post.visibility,
      liked: engagementList[index]?.data.liked ?? false,
      likeCount: engagementList[index]?.data.likeCount ?? 0,
      commentCount: engagementList[index]?.data.commentCount ?? 0,
      commentsAvailable: engagementList[index]?.data.commentsAvailable ?? false,
      canComment: engagementList[index]?.data.canComment ?? false,
      media: post.media,
      mediaCount: post.media.length,
    }));
  } catch {
    user = null;
    posts = [];
  }

  const csrfToken = await getCsrfToken();

  const firstName = user?.firstName ?? "there";
  const fullName = user ? `${user.firstName} ${user.lastName}` : "Secure user";
  const username = user?.username ? `@${user.username}` : "@sajhakurakani";
  const email = user?.email ?? "Protected email";
  const initials = user
    ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()
    : "SK";

  return (
    <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_280px]">
      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <section className="rounded-[18px] border border-[#edd8cb] bg-white/84 p-4 shadow-[0_14px_32px_rgba(128,84,53,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#38a89d]">
                Messages
              </p>
              <h2 className="mt-1.5 text-[1.6rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
                Keep in touch
              </h2>
            </div>
            <Link
              href="/user/message"
              className="rounded-full border border-[#edd8cb] bg-[#fff8f3] px-3 py-1 text-[0.85rem] font-semibold text-[#526077] transition hover:bg-white"
            >
              Open
            </Link>
          </div>

          <div className="mt-4 space-y-2.5">
            {conversations.length === 0 ? (
              <div className="rounded-[14px] border border-[#e9ecef] bg-[#fbfcfd] px-3 py-4 text-[0.82rem] leading-6 text-[#6b7080]">
                No conversations yet. Open your friends list to start a chat.
              </div>
            ) : (
              conversations.map((conversation) => (
                <Link
                  key={conversation.pairKey}
                  href={`/user/message?friend=${encodeURIComponent(conversation.otherUser.id)}`}
                  className="block rounded-[14px] border border-[#e9ecef] bg-[#fbfcfd] px-3 py-3 transition hover:bg-white"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d243f] text-xs font-semibold text-white">
                      {`${conversation.otherUser.firstName[0] ?? ""}${conversation.otherUser.lastName[0] ?? ""}`.toUpperCase() ||
                        conversation.otherUser.username.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[0.92rem] font-semibold text-[#1d243f]">
                        {conversation.otherUser.firstName} {conversation.otherUser.lastName}
                      </p>
                      <p className="truncate text-[0.72rem] text-[#7b7580]">
                        @{conversation.otherUser.username}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2.5 line-clamp-2 text-[0.76rem] leading-5 text-[#6b7080]">
                    {conversation.latestMessage.sender === user?._id ? "You: " : ""}
                    {conversation.latestMessage.content}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>
      </aside>

      <section className="space-y-4">
        <div className="rounded-[18px] border border-[#edd8cb] bg-white/84 p-4 shadow-[0_14px_32px_rgba(128,84,53,0.06)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 rounded-full border border-[#edd8cb] bg-[#fff8f3] p-1">
              <button
                type="button"
                className="rounded-full bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-3.5 py-1.5 text-[0.88rem] font-semibold text-white shadow-[0_6px_16px_rgba(241,111,56,0.16)]"
              >
                Feed
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="rounded-full border border-[#edd8cb] bg-[#fff8f3] px-3.5 py-1.5 text-[0.88rem] font-semibold text-[#526077] transition hover:bg-white"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-[16px] border border-[#f0ddd1] bg-[linear-gradient(135deg,rgba(255,247,240,0.96),rgba(255,252,248,0.92))] p-4">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[#ef744b]">
              Feed overview
            </p>
            <h1 className="mt-2.5 max-w-2xl text-[1.9rem] font-semibold tracking-[-0.05em] text-[#1d243f] sm:text-[2.25rem] xl:text-[2.4rem] xl:leading-[0.98]">
              {firstName}, your home feed is cleaner and easier to scan.
            </h1>
            <p className="mt-3 max-w-2xl text-[0.9rem] leading-6 text-[#6b7080]">
              Messages sit on the left, posts stay centered, and profile tools remain on the right for a more balanced reading flow.
            </p>
          </div>
        </div>

        <HomePostComposer csrfToken={csrfToken} />

        <div className="space-y-3">
          {posts.length === 0 ? (
            <article
              className="rounded-[18px] border border-[#edd8cb] bg-white/86 p-5 shadow-[0_12px_28px_rgba(128,84,53,0.05)]"
            >
              <p className="text-[1.08rem] font-semibold tracking-[-0.03em] text-[#1d243f]">
                No posts yet
              </p>
              <p className="mt-2.5 text-[0.92rem] leading-6 text-[#667086]">
                Your newly published posts will appear here as soon as you share your first secure update.
              </p>
            </article>
          ) : (
            posts.map((post) => (
            <article
              key={post.id}
              className="overflow-hidden rounded-[18px] border border-[#edd8cb] bg-white/92 shadow-[0_12px_28px_rgba(128,84,53,0.05)]"
            >
              <div className="px-4 pt-4">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] text-xs font-semibold text-white">
                    {initials}
                  </span>
                  <div>
                    <p className="text-[0.95rem] font-semibold text-[#1d243f]">{fullName}</p>
                    <p className="text-[0.78rem] text-[#7b7580]">{post.meta} · {post.visibility}</p>
                  </div>
                </div>
              </div>

              <h2 className="mt-4 px-4 text-[1.45rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
                {post.title}
              </h2>
              <p className="mt-2.5 px-4 text-[0.92rem] leading-6 text-[#667086]">
                {post.body}
              </p>
              <PostMediaGallery media={post.media} className="mx-0 mt-4" />

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
            </article>
          )))}
        </div>
      </section>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <section className="rounded-[18px] border border-[#edd8cb] bg-white/84 p-4 shadow-[0_14px_32px_rgba(128,84,53,0.06)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#38a89d]">
            Your corner
          </p>
          <div className="mt-3.5 flex items-center gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1d243f] text-sm font-semibold text-white">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[1.05rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
                {fullName}
              </p>
              <p className="truncate text-[0.84rem] text-[#7b7580]">{username}</p>
              <p className="mt-0.5 truncate text-[0.74rem] text-[#7b7580]">{email}</p>
            </div>
          </div>

          <div className="mt-4 flex gap-2.5">
            <Link
              href="/user/profile"
              className="flex-1 rounded-[12px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-3.5 py-2 text-center text-[0.88rem] font-semibold text-white shadow-[0_8px_18px_rgba(241,111,56,0.16)]"
            >
              View profile
            </Link>
            <Link
              href="/settings"
              className="rounded-[12px] border border-[#edd8cb] bg-[#fff8f3] px-3.5 py-2 text-[0.88rem] font-semibold text-[#526077] transition hover:bg-white"
            >
              Settings
            </Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-[18px] border border-[#e5d8d2] bg-white/84 shadow-[0_14px_32px_rgba(128,84,53,0.06)]">
          <div className="bg-[linear-gradient(135deg,#e78763_0%,#4ab1a0_100%)] px-4 py-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-white/78">
                  Assistant
                </p>
                <h2 className="mt-1.5 text-[1.75rem] font-semibold tracking-[-0.04em]">
                  AI Chat Bot
                </h2>
              </div>
              <span className="text-lg">✦</span>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="rounded-[14px] border border-[#f0ddd1] bg-[#fff4ec] px-3.5 py-3.5 text-[0.9rem] leading-6 text-[#5f6678]">
              Hi {firstName}! How can I help you today?
            </div>

            <div className="rounded-[14px] border border-[#e9ecef] bg-[#fbfcfd] px-3.5 py-3.5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#a0a4ae]">
                Suggested
              </p>
              <ul className="mt-2.5 space-y-1.5 text-[0.88rem] text-[#5f6678]">
                <li>Find new friends with shared interests.</li>
                <li>Review your security settings.</li>
                <li>Check your latest messages.</li>
              </ul>
            </div>

            <div className="flex items-center gap-2.5 rounded-[14px] border border-[#e9ecef] bg-white px-3 py-2.5">
              <input
                type="text"
                placeholder="Ask me anything..."
                className="w-full bg-transparent text-[0.88rem] text-[#1d243f] outline-none placeholder:text-[#adb1bb]"
              />
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#1d243f] text-sm text-white"
              >
                &gt;
              </button>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
