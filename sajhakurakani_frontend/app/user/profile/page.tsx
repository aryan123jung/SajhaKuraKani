import { getCurrentUser } from "@/lib/api/auth";
import { getCurrentUserPosts } from "@/lib/api/posts";
import { getCsrfToken } from "@/lib/csrf";
import ProfileHeroCard from "../_components/ProfileHeroCard";
import ProfilePostsCard from "../_components/ProfilePostsCard";
import ProfileSidebarCard from "../_components/ProfileSidebarCard";

const bioText =
  "Building a calmer social identity space focused on trust, safety, and real connections.";

export default async function UserProfilePage() {
  let user = null;
  let profilePosts: Array<{
    id: string;
    title: string;
    body: string;
    meta: string;
    visibility: "public" | "private" | "friends-only";
    mediaCount: number;
  }> = [];

  try {
    const [userResponse, postsResponse] = await Promise.all([
      getCurrentUser(),
      getCurrentUserPosts(),
    ]);

    user = userResponse.data;
    profilePosts = postsResponse.data.map((post) => ({
      id: post._id,
      title: post.title?.trim() || "Untitled post",
      body: post.content?.trim() || "This post does not include any text yet.",
      meta: new Date(post.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      visibility: post.visibility,
      mediaCount: post.media.length,
    }));
  } catch {
    user = null;
    profilePosts = [];
  }

  const csrfToken = await getCsrfToken();

  const fullName = user ? `${user.firstName} ${user.lastName}` : "Secure user";
  const username = user?.username ? `@${user.username}` : "@sajhakurakani";
  const firstName = user?.firstName ?? "there";
  const initials = user
    ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()
    : "SK";
  const joinedLabel = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "July 2026";

  return (
    <div className="space-y-4">
      <ProfileHeroCard
        user={user}
        fullName={fullName}
        username={username}
        initials={initials}
        joinedLabel={joinedLabel}
      />

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <ProfileSidebarCard
            firstName={firstName}
            fullName={fullName}
            initials={initials}
            profileUrl={user?.profileUrl ?? null}
            bioText={bioText}
          />
        </aside>

        <ProfilePostsCard
          csrfToken={csrfToken}
          user={user}
          fullName={fullName}
          initials={initials}
          posts={profilePosts}
        />
      </section>
    </div>
  );
}
