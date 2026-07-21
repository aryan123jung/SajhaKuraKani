"use client";

import { useState, type ReactNode } from "react";

type FriendTabKey = "current" | "incoming" | "outgoing";

type FriendsTabbedSectionProps = {
  currentFriendsSlot: ReactNode;
  incomingRequestsSlot: ReactNode;
  outgoingRequestsSlot: ReactNode;
};

const tabs: Array<{ key: FriendTabKey; label: string }> = [
  { key: "current", label: "Current" },
  { key: "incoming", label: "Incoming" },
  { key: "outgoing", label: "Outgoing" },
];

export default function FriendsTabbedSection({
  currentFriendsSlot,
  incomingRequestsSlot,
  outgoingRequestsSlot,
}: FriendsTabbedSectionProps) {
  const [activeTab, setActiveTab] = useState<FriendTabKey>("current");

  const activeContent =
    activeTab === "incoming"
      ? incomingRequestsSlot
      : activeTab === "outgoing"
        ? outgoingRequestsSlot
        : currentFriendsSlot;

  return (
    <section className="space-y-4">
      <div className="rounded-[24px] border border-[#edd8cb] bg-white/84 p-4 shadow-[0_18px_42px_rgba(128,84,53,0.07)]">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-[12px] px-4 py-2.5 text-[0.9rem] font-semibold transition ${
                activeTab === tab.key
                  ? "bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] text-white shadow-[0_8px_18px_rgba(241,111,56,0.16)]"
                  : "bg-[#fff8f3] text-[#6b7080] hover:bg-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div key={activeTab} className="profile-tab-panel min-w-0">
        {activeContent}
      </div>
    </section>
  );
}
