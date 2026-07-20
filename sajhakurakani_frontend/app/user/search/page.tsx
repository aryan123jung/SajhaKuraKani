import Link from "next/link";
import FriendRelationshipActions from "../_components/FriendRelationshipActions";
import { getCsrfToken } from "@/lib/csrf";
import { searchUsers, type SearchableUserProfile } from "@/lib/api/auth";

/* eslint-disable @next/next/no-img-element */

type UserSearchPageProps = {
  searchParams?: Promise<{
    search?: string;
    notice?: string;
    error?: string;
  }>;
};

const pageCardClass =
  "rounded-[24px] border border-[#edd8cb] bg-white/84 p-5 shadow-[0_18px_42px_rgba(128,84,53,0.07)]";

const getUserInitials = (firstName: string, lastName: string, username: string) =>
  `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() ||
  username.slice(0, 2).toUpperCase();

export default async function UserSearchPage({ searchParams }: UserSearchPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const search = params?.search?.trim() || "";
  const notice = params?.notice?.trim() || "";
  const error = params?.error?.trim() || "";
  const redirectTo = search ? `/user/search?search=${encodeURIComponent(search)}` : "/user/search";
  const csrfToken = await getCsrfToken();

  let users: SearchableUserProfile[] = [];
  let loadError = "";

  try {
    const response = await searchUsers(search || undefined, 1, 18);
    users = response.data;
  } catch (searchError) {
    loadError =
      searchError instanceof Error
        ? searchError.message
        : "Unable to search users right now.";
  }

  return (
    <div className="space-y-4">
      <section className={pageCardClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ef744b]">
              Search
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#1d243f] sm:text-[2.4rem]">
              Find people
            </h1>
            <p className="mt-2 text-sm leading-7 text-[#6b7080]">
              {search
                ? `Showing people related to "${search}".`
                : "Browse people and send requests from clean profile cards."}
            </p>
          </div>
          <Link
            href="/user/friends"
            className="inline-flex items-center justify-center rounded-[12px] border border-[#e8d8cf] bg-white px-4 py-2.5 text-[0.88rem] font-semibold text-[#6b7080] transition hover:bg-[#fff8f3]"
          >
            Go to friends
          </Link>
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {users.length === 0 ? (
          <div className={`${pageCardClass} sm:col-span-2 xl:col-span-3`}>
            <p className="text-[1rem] font-semibold text-[#1d243f]">No people found</p>
            <p className="mt-2 text-sm leading-7 text-[#6b7080]">
              Try a different name or username in the search bar above.
            </p>
          </div>
        ) : (
          users.map((user) => (
            <article
              key={user._id}
              className="rounded-[22px] border border-[#edd8cb] bg-white/88 p-5 shadow-[0_16px_34px_rgba(128,84,53,0.07)]"
            >
              <Link href={`/user/profile/${user._id}`} className="block">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-sm font-semibold text-white">
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
                  <div className="min-w-0">
                    <p className="truncate text-[1rem] font-semibold text-[#1d243f]">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="mt-1 truncate text-[0.84rem] text-[#7b7580]">
                      @{user.username}
                    </p>
                  </div>
                </div>
              </Link>

              <div className="mt-4 border-t border-[#efe2d8] pt-4">
                <FriendRelationshipActions
                  csrfToken={csrfToken}
                  userId={user._id}
                  redirectTo={redirectTo}
                  relationshipStatus={user.relationshipStatus}
                  pendingRequestId={user.pendingRequestId}
                  compact
                />
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
