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
    <header className="w-full border-b border-[#ee8e64] bg-[linear-gradient(135deg,#f68155_0%,#f3714d_100%)] text-white shadow-[0_12px_26px_rgba(241,111,56,0.14)] backdrop-blur">
      <div className="mx-auto flex h-[80px] w-full max-w-[1600px] items-center gap-4 px-2 sm:px-3 lg:grid lg:grid-cols-[auto_minmax(320px,1fr)_auto_auto] lg:gap-5 lg:px-4">
        <div className="topbar-left flex h-full min-w-0 items-center gap-2 self-center">
          <div className="topbar-menu flex items-center justify-start">
            <button
              type="button"
              onClick={onMenuClick}
              aria-label={sidebarOpen ? "Close menu" : "Open menu"}
              aria-expanded={sidebarOpen}
              className="inline-flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-1.5 rounded-[12px] border border-white/16 bg-white/10 transition hover:bg-white/14"
            >
              <span className="block h-0.5 w-3.5 rounded-full bg-white" />
              <span className="block h-0.5 w-3.5 rounded-full bg-white" />
              <span className="block h-0.5 w-3.5 rounded-full bg-white" />
            </button>
          </div>

          <div className="topbar-head-logo flex shrink-0 items-center justify-center">
            <Link
              href="/user/home"
              aria-label="SajhaKuraKani home"
              className="relative flex h-14 w-14 items-center justify-center"
            >
              <span className="relative flex h-14 w-14 items-center justify-center overflow-visible">
                <Image
                  src="/brand/headLOGO.svg"
                  alt="SajhaKuraKani mark"
                  width={50}
                  height={50}
                  className="absolute left-1/2 top-[80%] h-12 w-12 -translate-x-1/2 -translate-y-1/2 scale-[1.5] object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.75)]"
                  priority
                />
              </span>
            </Link>
          </div>
        </div>

        <form
          action="/user/search"
          ref={searchContainerRef}
          className="topbar-search relative flex h-11 items-center self-center gap-2.5 rounded-[14px] border border-white/16 bg-white/12 px-3.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        >
          <span className="text-sm text-white/75">⌕</span>
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
            className="w-full bg-transparent text-[0.92rem] text-white outline-none placeholder:text-white/68"
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
          <nav className="flex flex-wrap items-center gap-1.5 rounded-[14px] border border-white/14 bg-white/10 p-1">
            {topNavItems.map((item) => {
              const isActive = currentPath === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-[10px] px-3.5 py-1.5 text-[0.88rem] font-semibold transition ${
                    isActive
                      ? "bg-white text-[#ef744b] shadow-[0_8px_20px_rgba(79,37,18,0.12)]"
                      : "text-white/82 hover:bg-white/12 hover:text-white"
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
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/16 bg-white/10 text-base text-white transition hover:bg-white/14"
          >
            ◔
          </Link>
        </div>
      </div>
    </header>
  );
}
