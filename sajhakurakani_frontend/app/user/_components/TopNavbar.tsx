"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { primaryNavItems } from "./schema";
import type { SearchableUserProfile } from "@/lib/api/auth";

type TopNavbarProps = {
  currentPath: string;
  onMenuClick: () => void;
  sidebarOpen: boolean;
};

const topNavItems = primaryNavItems.filter((item) =>
  ["/user/home", "/user/message", "/user/friends"].includes(item.href),
);

export default function TopNavbar({
  currentPath,
  onMenuClick,
  sidebarOpen,
}: TopNavbarProps) {
  const searchParams = useSearchParams();
  const currentSearch = currentPath === "/user/search" ? searchParams.get("search") ?? "" : "";
  const [query, setQuery] = useState(currentSearch);
  const [results, setResults] = useState<SearchableUserProfile[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const searchContainerRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 1) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setFetchError("");

        const response = await fetch(
          `/api/users/search?search=${encodeURIComponent(trimmedQuery)}&size=6`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          }
        );
        const payload = (await response.json()) as {
          success: boolean;
          data?: SearchableUserProfile[];
          message?: string;
        };

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Unable to search users right now.");
        }

        setResults(payload.data ?? []);
        setIsOpen(true);
      } catch (error) {
        setResults([]);
        setIsOpen(true);
        setFetchError(
          error instanceof Error ? error.message : "Unable to search users right now."
        );
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const visibleResults = query.trim().length > 0 ? results : [];
  const visibleFetchError = query.trim().length > 0 ? fetchError : "";
  const showDropdown = isOpen && query.trim().length > 0;

  return (
    <header className="w-full border-b border-[#efd8c8] bg-[radial-gradient(circle_at_top_left,rgba(255,145,77,0.2),transparent_26rem),radial-gradient(circle_at_bottom_right,rgba(255,110,69,0.12),transparent_30rem),linear-gradient(180deg,#fffdfa_0%,#fff6ee_52%,#fffaf6_100%)] text-[#1d243f] shadow-[0_14px_30px_rgba(128,84,53,0.08)] backdrop-blur">
      <div className="mx-auto grid h-[80px] w-full max-w-[1600px] grid-cols-[auto_360px_1fr_auto_auto] items-center gap-4 px-2 sm:px-3 lg:gap-4 lg:px-4">
        <div className="topbar-menu flex items-center justify-start self-center">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
            aria-expanded={sidebarOpen}
            className="inline-flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-1.5 rounded-[12px] border border-[#ecd7ca] bg-white/80 transition hover:bg-white"
          >
            <span className="block h-0.5 w-3.5 rounded-full bg-[#1d243f]" />
            <span className="block h-0.5 w-3.5 rounded-full bg-[#1d243f]" />
            <span className="block h-0.5 w-3.5 rounded-full bg-[#1d243f]" />
          </button>
        </div>

        <div className="topbar-head-logo relative h-full shrink-0 self-center">
          <Link
            href="/user/home"
            aria-label="SajhaKuraKani home"
            className="absolute left-1/2 top-0 flex -translate-x-1/2 items-start pt-0"
          >
            <span className="relative h-[64px] w-[320px]">
              <Image
                src="/brand/bodyLOGO.svg"
                alt="SajhaKuraKani"
                fill
                sizes="320px"
                className="object-contain object-left-top"
                priority
              />
            </span>
          </Link>
        </div>

        <form
          action="/user/search"
          ref={searchContainerRef}
          className="topbar-search relative col-start-3 flex h-11 w-full max-w-[720px] justify-self-center items-center self-center gap-2.5 rounded-[14px] border border-[#ead9ce] bg-white/88 px-3.5 py-2 shadow-[0_10px_22px_rgba(128,84,53,0.05)]"
        >
          <span className="text-sm text-[#9a93a0]">⌕</span>
          <input
            type="search"
            name="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => {
              if (query.trim().length > 0) {
                setIsOpen(true);
              }
            }}
            placeholder="Search people..."
            className="w-full bg-transparent text-[0.92rem] text-[#1d243f] outline-none placeholder:text-[#b6adb5]"
          />

          {showDropdown ? (
            <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-40 overflow-hidden rounded-[18px] border border-[#f1c8b5] bg-white text-[#1d243f] shadow-[0_20px_50px_rgba(84,43,21,0.16)]">
              {isLoading ? (
                <div className="px-4 py-3 text-sm text-[#6e7687]">Searching...</div>
              ) : visibleFetchError ? (
                <div className="px-4 py-3 text-sm text-[#b14f3f]">{visibleFetchError}</div>
              ) : visibleResults.length > 0 ? (
                <div className="py-1.5">
                  {visibleResults.map((user) => (
                    <Link
                      key={user._id}
                      href={`/user/profile/${user._id}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-[#fff5ef]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-xs font-semibold text-white">
                        {user.profileUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.profileUrl}
                            alt={`${user.firstName} ${user.lastName}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() ||
                          user.username.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1d243f]">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="truncate text-xs text-[#70788a]">@{user.username}</p>
                      </div>
                    </Link>
                  ))}
                  <Link
                    href={`/user/search?search=${encodeURIComponent(query.trim())}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center border-t border-[#f3e2d8] px-4 py-3 text-sm font-semibold text-[#ef744b] transition hover:bg-[#fff5ef]"
                  >
                    See all results
                  </Link>
                </div>
              ) : query.trim().length > 0 ? (
                <div className="px-4 py-3 text-sm text-[#6e7687]">No matching people found.</div>
              ) : null}
            </div>
          ) : null}
        </form>

        <div className="topbar-nav flex items-center self-center justify-start lg:justify-end">
          <nav className="flex flex-wrap items-center gap-1.5 rounded-[14px] border border-[#ecd8cc] bg-white/76 p-1 shadow-[0_10px_22px_rgba(128,84,53,0.04)]">
            {topNavItems.map((item) => {
              const isActive = currentPath === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-[10px] px-3.5 py-1.5 text-[0.88rem] font-semibold transition ${
                    isActive
                      ? "bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] text-white shadow-[0_8px_20px_rgba(241,111,56,0.16)]"
                      : "text-[#687385] hover:bg-[#fff5ef] hover:text-[#1d243f]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="topbar-bell flex items-center self-center justify-end">
          <Link
            href="/user/notifications"
            aria-label="Notifications"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#ecd7ca] bg-white/80 text-base text-[#1d243f] transition hover:bg-white"
          >
            ◔
          </Link>
        </div>
      </div>
    </header>
  );
}
