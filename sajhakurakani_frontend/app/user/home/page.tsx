import { getCurrentUser } from "@/lib/api/auth";
import { getMessageConversations, type MessageConversationSummary } from "@/lib/api/messages";
import { getCurrentUserPosts, getPostEngagement, type PostMedia } from "@/lib/api/posts";
import { getCsrfToken } from "@/lib/csrf";
import HomeAssistantCard from "./_components/HomeAssistantCard";
import HomeComposerLauncher from "../_components/HomeComposerLauncher";
import HomeMessagesCard from "./_components/HomeMessagesCard";
import HomeProfileCard from "./_components/HomeProfileCard";
import PostEngagementPanel from "../_components/PostEngagementPanel";
import PostMediaGallery from "../_components/PostMediaGallery";

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
    <div className="grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)_340px] 2xl:grid-cols-[320px_minmax(0,1.08fr)_360px]">
      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <HomeMessagesCard conversations={conversations} currentUserId={user?._id} />
      </aside>

      <section className="space-y-4">
        <HomeComposerLauncher
          csrfToken={csrfToken}
          firstName={firstName}
          fullName={fullName}
          initials={initials}
          profileUrl={user?.profileUrl ?? null}
        />

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
        <HomeProfileCard
          initials={initials}
          fullName={fullName}
          username={username}
          email={email}
          profileUrl={user?.profileUrl ?? null}
        />
        <HomeAssistantCard firstName={firstName} />
      </aside>
    </div>
  );
}
