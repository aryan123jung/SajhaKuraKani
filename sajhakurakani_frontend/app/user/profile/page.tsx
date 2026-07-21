import { getCurrentUser } from "@/lib/api/auth";
import { type FriendProfile, getFriendOverview } from "@/lib/api/friends";
import { getCurrentUserPosts, getPostEngagement } from "@/lib/api/posts";
import { getCsrfToken } from "@/lib/csrf";
import ProfileEditLauncher from "../_components/ProfileEditLauncher";
import ProfileFriendsCard from "../_components/ProfileFriendsCard";
import ProfilePhotosCard from "../_components/ProfilePhotosCard";
import ProfilePostsCard from "../_components/ProfilePostsCard";
import ProfileSidebarCard from "../_components/ProfileSidebarCard";
import ProfileTabbedLayout from "../_components/ProfileTabbedLayout";
import type { ProfilePost } from "../_components/profileTypes";

export default async function UserProfilePage() {
  let user = null;
  let profilePosts: ProfilePost[] = [];
  let friends: FriendProfile[] = [];

  try {
    const [userResponse, postsResponse, friendResponse] = await Promise.all([
      getCurrentUser(),
      getCurrentUserPosts(),
      getFriendOverview(),
    ]);

    user = userResponse.data;
    friends = friendResponse.data.friends;
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
    friends = [];
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
        sidebarSlot={
          <ProfileSidebarCard
            csrfToken={csrfToken}
            firstName={firstName}
            fullName={fullName}
            initials={initials}
            profileUrl={user?.profileUrl ?? null}
            bioText={bioText}
            allowComposer={true}
          />
        }
        postsSlot={
          <ProfilePostsCard
          csrfToken={csrfToken}
          user={user}
          fullName={fullName}
          initials={initials}
          posts={profilePosts}
          canManagePosts={true}
        />
        }
        friendsSlot={
          <ProfileFriendsCard
          friends={friends}
          emptyMessage="You have not added any friends yet."
        />
        }
        photosSlot={
          <ProfilePhotosCard
          media={profilePhotos}
          emptyMessage="Your shared photos will appear here once you upload them in a post."
        />
        }
      />
  );
}
