"use client";

import { useEffect, useRef, useState } from "react";
import {
  acceptFriendRequestAction,
  cancelFriendRequestAction,
  rejectFriendRequestAction,
  removeFriendAction,
  sendFriendRequestAction,
} from "@/lib/actions/friends";

type FriendRelationshipActionsProps = {
  csrfToken: string;
  userId: string;
  redirectTo: string;
  relationshipStatus?:
    | "none"
    | "friends"
    | "incoming_request"
    | "outgoing_request";
  pendingRequestId?: string | null;
  compact?: boolean;
};

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-4 py-2.5 text-[0.88rem] font-semibold text-white shadow-[0_8px_18px_rgba(241,111,56,0.16)]";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-[12px] border border-[#e8d8cf] bg-white px-4 py-2.5 text-[0.88rem] font-semibold text-[#6b7080] transition hover:bg-[#fff8f3]";
const menuClass =
  "absolute right-0 top-full z-20 mt-2 min-w-[180px] rounded-[14px] border border-[#eadad1] bg-white p-2 shadow-[0_18px_40px_rgba(67,35,18,0.14)]";
const menuButtonClass =
  "flex w-full items-center justify-start rounded-[10px] px-3 py-2 text-left text-[0.86rem] font-medium text-[#5f6676] transition hover:bg-[#fff6f0]";

export default function FriendRelationshipActions({
  csrfToken,
  userId,
  redirectTo,
  relationshipStatus = "none",
  pendingRequestId = null,
  compact = false,
}: FriendRelationshipActionsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const wrapperClass = compact ? "relative" : "relative mt-4";

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  if (relationshipStatus === "friends") {
    return (
      <div ref={wrapperRef} className={wrapperClass}>
        <button
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
          className={secondaryButtonClass}
        >
          Friend
          <span className="ml-2 text-[0.72rem]">▼</span>
        </button>

        {isMenuOpen ? (
          <div className={menuClass}>
            <form action={removeFriendAction}>
              <input type="hidden" name="_csrf" value={csrfToken} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <input type="hidden" name="friendUserId" value={userId} />
              <button
                type="submit"
                className={`${menuButtonClass} text-[#b14f3f] hover:bg-[#fff2ec]`}
              >
                Unfriend
              </button>
            </form>
          </div>
        ) : null}
      </div>
    );
  }

  if (relationshipStatus === "incoming_request" && pendingRequestId) {
    return (
      <div ref={wrapperRef} className={wrapperClass}>
        <button
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
          className={secondaryButtonClass}
        >
          Respond
          <span className="ml-2 text-[0.72rem]">▼</span>
        </button>

        {isMenuOpen ? (
          <div className={menuClass}>
            <form action={acceptFriendRequestAction}>
              <input type="hidden" name="_csrf" value={csrfToken} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <input type="hidden" name="requestId" value={pendingRequestId} />
              <button type="submit" className={menuButtonClass}>
                Accept request
              </button>
            </form>
            <form action={rejectFriendRequestAction}>
              <input type="hidden" name="_csrf" value={csrfToken} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <input type="hidden" name="requestId" value={pendingRequestId} />
              <button
                type="submit"
                className={`${menuButtonClass} text-[#b14f3f] hover:bg-[#fff2ec]`}
              >
                Decline request
              </button>
            </form>
          </div>
        ) : null}
      </div>
    );
  }

  if (relationshipStatus === "outgoing_request" && pendingRequestId) {
    return (
      <form action={cancelFriendRequestAction} className={wrapperClass}>
        <input type="hidden" name="_csrf" value={csrfToken} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <input type="hidden" name="requestId" value={pendingRequestId} />
        <button type="submit" className={secondaryButtonClass}>
          Cancel request
        </button>
      </form>
    );
  }

  return (
    <form action={sendFriendRequestAction} className={wrapperClass}>
      <input type="hidden" name="_csrf" value={csrfToken} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <input type="hidden" name="recipientUserId" value={userId} />
      <button type="submit" className={primaryButtonClass}>
        Add friend
      </button>
    </form>
  );
}
