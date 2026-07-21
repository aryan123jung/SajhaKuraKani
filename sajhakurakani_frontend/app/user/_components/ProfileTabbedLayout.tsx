"use client";

import { useState, type ReactNode } from "react";
import ProfileHeroCard, { type ProfileTabKey } from "./ProfileHeroCard";
import type { ProfileViewUser } from "./profileTypes";

type ProfileTabbedLayoutProps = {
  user: ProfileViewUser;
  fullName: string;
  username: string;
  initials: string;
  joinedLabel: string;
  showEditButton?: boolean;
  actionSlot?: ReactNode;
  sidebarSlot: ReactNode;
  postsSlot: ReactNode;
  friendsSlot: ReactNode;
  photosSlot: ReactNode;
};

export default function ProfileTabbedLayout({
  user,
  fullName,
  username,
  initials,
  joinedLabel,
  showEditButton = false,
  actionSlot,
  sidebarSlot,
  postsSlot,
  friendsSlot,
  photosSlot,
}: ProfileTabbedLayoutProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabKey>("posts");

  const activeContent =
    activeTab === "friends"
      ? friendsSlot
      : activeTab === "photos"
        ? photosSlot
        : postsSlot;

  return (
    <div className="space-y-4">
      <ProfileHeroCard
        user={user}
        fullName={fullName}
        username={username}
        initials={initials}
        joinedLabel={joinedLabel}
        showEditButton={showEditButton}
        actionSlot={actionSlot}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          {sidebarSlot}
        </aside>

        <div key={activeTab} className="profile-tab-panel min-w-0">
          {activeContent}
        </div>
      </section>
    </div>
  );
}
