import { getCurrentUser } from "@/lib/api/auth";
import ProfileHeroCard from "../_components/ProfileHeroCard";
import ProfilePostsCard from "../_components/ProfilePostsCard";
import ProfileSidebarCard from "../_components/ProfileSidebarCard";

const bioText =
  "Building a calmer social identity space focused on trust, safety, and real connections.";

const profilePosts = [
  {
    title: "Shaping a simpler profile experience.",
    body: "This profile page now starts with a familiar social layout: large cover area, overlapping avatar, and a clear content structure under it.",
    meta: "Pinned update",
  },
  {
    title: "Trust signals should feel natural.",
    body: "Profile identity, account details, and social actions should be visible without making the screen feel heavy or complicated.",
    meta: "Design note",
  },
] as const;

export default async function UserProfilePage() {
  let user = null;

  try {
    const response = await getCurrentUser();
    user = response.data;
  } catch {
    user = null;
  }

  const fullName = user ? `${user.firstName} ${user.lastName}` : "Secure user";
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
        initials={initials}
        joinedLabel={joinedLabel}
      />

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <ProfileSidebarCard bioText={bioText} />
        </aside>

        <ProfilePostsCard
          user={user}
          fullName={fullName}
          initials={initials}
          posts={profilePosts}
        />
      </section>
    </div>
  );
}
