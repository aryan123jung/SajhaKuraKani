import Image from "next/image";
import Link from "next/link";
import { primaryNavItems } from "./schema";

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
                  width={72}
                  height={72}
                  className="absolute left-1/2 top-[70%] h-12 w-12 -translate-x-1/2 -translate-y-1/2 scale-[2.5] object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.75)]"
                  priority
                />
              </span>
            </Link>
          </div>
        </div>

        <div className="topbar-search flex h-11 items-center self-center gap-2.5 rounded-[14px] border border-white/16 bg-white/12 px-3.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <span className="text-sm text-white/75">⌕</span>
          <input
            type="search"
            placeholder="Search people, spaces, or messages..."
            className="w-full bg-transparent text-[0.92rem] text-white outline-none placeholder:text-white/68"
          />
        </div>

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
