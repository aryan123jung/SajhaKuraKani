import { getUserProfileById } from "@/lib/api/auth";
import { getPostEngagement, getUserPostsByUserId } from "@/lib/api/posts";
import { getCsrfToken } from "@/lib/csrf";
import FriendRelationshipActions from "../../_components/FriendRelationshipActions";
import ProfileFriendsCard from "../../_components/ProfileFriendsCard";
import ProfilePhotosCard from "../../_components/ProfilePhotosCard";
import ProfilePostsCard from "../../_components/ProfilePostsCard";
import ProfileSidebarCard from "../../_components/ProfileSidebarCard";
import ProfileTabbedLayout from "../../_components/ProfileTabbedLayout";
import type { ProfilePost } from "../../_components/profileTypes";

type UserProfileByIdPageProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function UserProfileByIdPage({ params }: UserProfileByIdPageProps) {
  const { userId } = await params;

  let user = null;
  let profilePosts: ProfilePost[] = [];

  try {
    const [userResponse, postsResponse] = await Promise.all([
      getUserProfileById(userId),
      getUserPostsByUserId(userId),
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

  const fullName = user ? `${user.firstName} ${user.lastName}` : "User profile";
  const username = user?.username ? `@${user.username}` : "@user";
  const firstName = user?.firstName ?? "there";
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
  const profilePhotos = profilePosts.flatMap((post) => post.media);

  return (
    <ProfileTabbedLayout
        user={user}
        fullName={fullName}
        username={username}
        initials={initials}
        joinedLabel={joinedLabel}
        showEditButton={false}
        actionSlot={
          user?._id ? (
            <FriendRelationshipActions
              csrfToken={csrfToken}
              userId={user._id}
              redirectTo={`/user/profile/${user._id}`}
              relationshipStatus={user.relationshipStatus}
              pendingRequestId={user.pendingRequestId}
              compact
            />
          ) : null
        }
        sidebarSlot={
          <ProfileSidebarCard
            csrfToken={csrfToken}
            firstName={firstName}
            fullName={fullName}
            initials={initials}
            profileUrl={user?.profileUrl ?? null}
            bioText={bioText}
            allowComposer={false}
          />
        }
        postsSlot={
          <ProfilePostsCard
          csrfToken={csrfToken}
          user={user}
          fullName={fullName}
          initials={initials}
          posts={profilePosts}
          canManagePosts={false}
        />
        }
        friendsSlot={
          <ProfileFriendsCard
          friends={[]}
          emptyMessage="Friend connections are not shown on this profile yet."
        />
        }
        photosSlot={
          <ProfilePhotosCard
          media={profilePhotos}
          emptyMessage="No shared photos are available on this profile yet."
        />
        }
      />
  );
}
