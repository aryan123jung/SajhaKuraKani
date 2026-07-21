import { getCurrentUser } from "@/lib/api/auth";
import { getCurrentUserPosts, getPostEngagement } from "@/lib/api/posts";
import { getCsrfToken } from "@/lib/csrf";
import ProfileEditLauncher from "../_components/ProfileEditLauncher";
import ProfileHeroCard from "../_components/ProfileHeroCard";
import ProfilePostsCard from "../_components/ProfilePostsCard";
import ProfileSidebarCard from "../_components/ProfileSidebarCard";
import type { ProfilePost } from "../_components/profileTypes";

export default async function UserProfilePage() {
  let user = null;
  let profilePosts: ProfilePost[] = [];

  try {
    const [userResponse, postsResponse] = await Promise.all([
      getCurrentUser(),
      getCurrentUserPosts(),
    ]);

    user = userResponse.data;
    const engagementList = await Promise.all(
      postsResponse.data.map((post) => getPostEngagement(post._id))
    );
    profilePosts = postsResponse.data.map((post, index) => ({
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
    profilePosts = [];
  }

  const csrfToken = await getCsrfToken();

  const fullName = user ? `${user.firstName} ${user.lastName}` : "Secure user";
  const username = user?.username ? `@${user.username}` : "@sajhakurakani";
  const firstName = user?.firstName ?? "there";
  const lastName = user?.lastName ?? "";
  const initials = user
    ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()
    : "SK";
  const bioText = user?.bio?.trim() || "";
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
        showEditButton={false}
        actionSlot={
          user ? (
            <ProfileEditLauncher
              csrfToken={csrfToken}
              firstName={firstName}
              lastName={lastName}
              username={user.username}
              bio={bioText}
              profileUrl={user.profileUrl ?? null}
              coverUrl={user.coverUrl ?? null}
            />
          ) : null
        }
      />

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <ProfileSidebarCard
            csrfToken={csrfToken}
            firstName={firstName}
            fullName={fullName}
            initials={initials}
            profileUrl={user?.profileUrl ?? null}
            bioText={bioText}
            allowComposer={true}
          />
        </aside>

        <ProfilePostsCard
          csrfToken={csrfToken}
          user={user}
          fullName={fullName}
          initials={initials}
          posts={profilePosts}
          canManagePosts={true}
        />
      </section>
    </div>
  );
}
