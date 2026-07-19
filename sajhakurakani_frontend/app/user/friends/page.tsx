import {
  acceptFriendRequestAction,
  cancelFriendRequestAction,
  rejectFriendRequestAction,
  removeFriendAction,
  sendFriendRequestAction,
} from "@/lib/actions/friends";
import { type FriendOverview, getFriendOverview } from "@/lib/api/friends";
import { getCsrfToken } from "@/lib/csrf";
import Link from "next/link";
/* eslint-disable @next/next/no-img-element */

type FriendsPageProps = {
  searchParams?: Promise<{
    search?: string;
    notice?: string;
    error?: string;
  }>;
};

const sectionCardClass =
  "rounded-[24px] border border-[#edd8cb] bg-white/84 p-5 shadow-[0_18px_42px_rgba(128,84,53,0.07)]";

const formatRequestDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const getUserInitials = (firstName: string, lastName: string, username: string) =>
  `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() ||
  username.slice(0, 2).toUpperCase();

export default async function UserFriendsPage({ searchParams }: FriendsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const search = params?.search?.trim() || "";
  const notice = params?.notice?.trim() || "";
  const error = params?.error?.trim() || "";
  const redirectTo = search
    ? `/user/friends?search=${encodeURIComponent(search)}`
    : "/user/friends";

  const csrfToken = await getCsrfToken();

  let data: FriendOverview = {
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    discoverUsers: [],
  };
  let loadError = "";

  try {
    const response = await getFriendOverview(search || undefined);
    data = response.data;
  } catch (friendError) {
    loadError =
      friendError instanceof Error
        ? friendError.message
        : "Unable to load your friends right now.";
  }

  return (
    <div className="space-y-4">
      <section className={sectionCardClass}>
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ef744b]">
          Friends
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#1d243f] sm:text-4xl">
              Manage trusted connections.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6b7080] sm:text-base">
              Search for people, review incoming requests, and keep your contact list
              limited to accounts you explicitly approve.
            </p>
          </div>

          <form action="/user/friends" className="flex w-full max-w-xl gap-2">
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Search by first name, last name, or username"
              className="w-full rounded-[14px] border border-[#ecd9cf] bg-[#fffaf7] px-4 py-3 text-[0.92rem] text-[#1d243f] outline-none transition focus:border-[#ef744b]"
            />
            <button
              type="submit"
              className="rounded-[14px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-5 py-3 text-[0.9rem] font-semibold text-white shadow-[0_8px_18px_rgba(241,111,56,0.16)]"
            >
              Search
            </button>
          </form>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[18px] border border-[#efe0d6] bg-[#fff8f3] p-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#a98974]">
              Friends
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#1d243f]">
              {data.friends.length}
            </p>
          </div>
          <div className="rounded-[18px] border border-[#efe0d6] bg-[#fff8f3] p-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#a98974]">
              Incoming
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#1d243f]">
              {data.incomingRequests.length}
            </p>
          </div>
          <div className="rounded-[18px] border border-[#efe0d6] bg-[#fff8f3] p-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#a98974]">
              Outgoing
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#1d243f]">
              {data.outgoingRequests.length}
            </p>
          </div>
        </div>

        {notice ? (
          <div className="mt-4 rounded-[14px] border border-[#cfe7df] bg-[#eefaf5] px-4 py-3 text-sm text-[#2f8f77]">
            {notice}
          </div>
        ) : null}

        {error || loadError ? (
          <div className="mt-4 rounded-[14px] border border-[#f2c5bb] bg-[#fff1ec] px-4 py-3 text-sm text-[#b14f3f]">
            {error || loadError}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-4">
          <div className={sectionCardClass}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ef744b]">
                  Discover
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#1d243f]">
                  Send new friend requests
                </h2>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {data.discoverUsers.length === 0 ? (
                <p className="rounded-[16px] border border-[#efe0d6] bg-[#fff8f3] px-4 py-4 text-sm leading-7 text-[#6b7080]">
                  No matching users are available right now.
                </p>
              ) : (
                data.discoverUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col gap-3 rounded-[16px] border border-[#efe0d6] bg-[#fffaf7] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <Link
                      href={`/user/profile/${user.id}`}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-xs font-semibold text-white">
                        {user.profileUrl ? (
                          <img
                            src={user.profileUrl}
                            alt={`${user.firstName} ${user.lastName}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getUserInitials(user.firstName, user.lastName, user.username)
                        )}
                      </div>
                      <div>
                        <p className="text-[1rem] font-semibold text-[#1d243f]">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="mt-1 text-[0.84rem] text-[#7b7580]">@{user.username}</p>
                      </div>
                    </Link>

                    <form action={sendFriendRequestAction}>
                      <input type="hidden" name="_csrf" value={csrfToken} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <input type="hidden" name="recipientUserId" value={user.id} />
                      <button
                        type="submit"
                        className="rounded-[12px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-4 py-2.5 text-[0.88rem] font-semibold text-white shadow-[0_8px_18px_rgba(241,111,56,0.16)]"
                      >
                        Send request
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={sectionCardClass}>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ef744b]">
              Current friends
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#1d243f]">
              Approved connections
            </h2>

            <div className="mt-4 space-y-3">
              {data.friends.length === 0 ? (
                <p className="rounded-[16px] border border-[#efe0d6] bg-[#fff8f3] px-4 py-4 text-sm leading-7 text-[#6b7080]">
                  You have not approved any friend connections yet.
                </p>
              ) : (
                data.friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex flex-col gap-3 rounded-[16px] border border-[#efe0d6] bg-[#fffaf7] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <Link
                      href={`/user/profile/${friend.id}`}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-xs font-semibold text-white">
                        {friend.profileUrl ? (
                          <img
                            src={friend.profileUrl}
                            alt={`${friend.firstName} ${friend.lastName}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getUserInitials(friend.firstName, friend.lastName, friend.username)
                        )}
                      </div>
                      <div>
                        <p className="text-[1rem] font-semibold text-[#1d243f]">
                          {friend.firstName} {friend.lastName}
                        </p>
                        <p className="mt-1 text-[0.84rem] text-[#7b7580]">@{friend.username}</p>
                      </div>
                    </Link>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/user/message?friend=${encodeURIComponent(friend.id)}`}
                        className="rounded-[12px] border border-[#edd8cb] bg-white px-4 py-2.5 text-[0.88rem] font-semibold text-[#546178] transition hover:bg-[#fff4ef]"
                      >
                        Message
                      </Link>
                      <form action={removeFriendAction}>
                        <input type="hidden" name="_csrf" value={csrfToken} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <input type="hidden" name="friendUserId" value={friend.id} />
                        <button
                          type="submit"
                          className="rounded-[12px] border border-[#f0c8bb] bg-white px-4 py-2.5 text-[0.88rem] font-semibold text-[#b14f3f] transition hover:bg-[#fff4ef]"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={sectionCardClass}>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ef744b]">
              Incoming
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#1d243f]">
              Requests to review
            </h2>

            <div className="mt-4 space-y-3">
              {data.incomingRequests.length === 0 ? (
                <p className="rounded-[16px] border border-[#efe0d6] bg-[#fff8f3] px-4 py-4 text-sm leading-7 text-[#6b7080]">
                  No incoming friend requests right now.
                </p>
              ) : (
                data.incomingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-[16px] border border-[#efe0d6] bg-[#fffaf7] p-4"
                  >
                    <Link
                      href={`/user/profile/${request.user.id}`}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-xs font-semibold text-white">
                        {request.user.profileUrl ? (
                          <img
                            src={request.user.profileUrl}
                            alt={`${request.user.firstName} ${request.user.lastName}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getUserInitials(
                            request.user.firstName,
                            request.user.lastName,
                            request.user.username
                          )
                        )}
                      </div>
                      <div>
                        <p className="text-[1rem] font-semibold text-[#1d243f]">
                          {request.user.firstName} {request.user.lastName}
                        </p>
                        <p className="mt-1 text-[0.84rem] text-[#7b7580]">
                          @{request.user.username}
                        </p>
                        <p className="mt-1 text-[0.74rem] text-[#9a9198]">
                          Sent {formatRequestDate(request.createdAt)}
                        </p>
                      </div>
                    </Link>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={acceptFriendRequestAction}>
                        <input type="hidden" name="_csrf" value={csrfToken} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <input type="hidden" name="requestId" value={request.id} />
                        <button
                          type="submit"
                          className="rounded-[12px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-4 py-2.5 text-[0.88rem] font-semibold text-white shadow-[0_8px_18px_rgba(241,111,56,0.16)]"
                        >
                          Accept
                        </button>
                      </form>
                      <form action={rejectFriendRequestAction}>
                        <input type="hidden" name="_csrf" value={csrfToken} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <input type="hidden" name="requestId" value={request.id} />
                        <button
                          type="submit"
                          className="rounded-[12px] border border-[#e8d8cf] bg-white px-4 py-2.5 text-[0.88rem] font-semibold text-[#6b7080] transition hover:bg-[#fff8f3]"
                        >
                          Decline
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={sectionCardClass}>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ef744b]">
              Outgoing
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#1d243f]">
              Waiting for approval
            </h2>

            <div className="mt-4 space-y-3">
              {data.outgoingRequests.length === 0 ? (
                <p className="rounded-[16px] border border-[#efe0d6] bg-[#fff8f3] px-4 py-4 text-sm leading-7 text-[#6b7080]">
                  You do not have any pending outgoing requests.
                </p>
              ) : (
                data.outgoingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col gap-3 rounded-[16px] border border-[#efe0d6] bg-[#fffaf7] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <Link
                      href={`/user/profile/${request.user.id}`}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-xs font-semibold text-white">
                        {request.user.profileUrl ? (
                          <img
                            src={request.user.profileUrl}
                            alt={`${request.user.firstName} ${request.user.lastName}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getUserInitials(
                            request.user.firstName,
                            request.user.lastName,
                            request.user.username
                          )
                        )}
                      </div>
                      <div>
                        <p className="text-[1rem] font-semibold text-[#1d243f]">
                          {request.user.firstName} {request.user.lastName}
                        </p>
                        <p className="mt-1 text-[0.84rem] text-[#7b7580]">@{request.user.username}</p>
                        <p className="mt-1 text-[0.74rem] text-[#9a9198]">
                          Sent {formatRequestDate(request.createdAt)}
                        </p>
                      </div>
                    </Link>

                    <form action={cancelFriendRequestAction}>
                      <input type="hidden" name="_csrf" value={csrfToken} />
                      <input type="hidden" name="redirectTo" value={redirectTo} />
                      <input type="hidden" name="requestId" value={request.id} />
                      <button
                        type="submit"
                        className="rounded-[12px] border border-[#e8d8cf] bg-white px-4 py-2.5 text-[0.88rem] font-semibold text-[#6b7080] transition hover:bg-[#fff8f3]"
                      >
                        Cancel request
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
