/* eslint-disable @next/next/no-img-element */

type ProfileSidebarCardProps = {
  firstName: string;
  fullName: string;
  initials: string;
  profileUrl?: string | null;
  bioText: string;
};

export default function ProfileSidebarCard({
  firstName,
  fullName,
  initials,
  profileUrl,
  bioText,
}: ProfileSidebarCardProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-[18px] border border-[#e6d8d0] bg-white/88 p-4 shadow-[0_14px_32px_rgba(128,84,53,0.06)]">
        <h2 className="mt-2 text-[1.25rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
          Bio
        </h2>
        <div className="mt-4 rounded-[12px] bg-[#faf7f4] px-3.5 py-3 text-[0.9rem] leading-7 text-[#616a7b]">
          {bioText}
        </div>
      </div>

      <div className="rounded-[18px] border border-[#e6d8d0] bg-white/88 p-4 shadow-[0_14px_32px_rgba(128,84,53,0.06)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1d243f] text-sm font-semibold text-white">
            {profileUrl ? (
              <img
                src={profileUrl}
                alt={fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <button
            type="button"
            className="flex-1 rounded-full bg-[#f5f2ef] px-4 py-3 text-left text-[0.92rem] text-[#8a8290]"
          >
            What&apos;s on your mind, {firstName}?
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#eee3dc] pt-4">
          {["Photo", "Video", "Life Event"].map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-[10px] bg-[#faf7f4] px-3.5 py-2 text-[0.85rem] font-semibold text-[#556278]"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
