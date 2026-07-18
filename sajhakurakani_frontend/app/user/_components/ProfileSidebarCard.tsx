type ProfileSidebarCardProps = {
  bioText: string;
};

export default function ProfileSidebarCard({
  bioText,
}: ProfileSidebarCardProps) {
  return (
    <div className="rounded-[18px] border border-[#e6d8d0] bg-white/88 p-4 shadow-[0_14px_32px_rgba(128,84,53,0.06)]">
      <p className="text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-[#8a8290]">
        User
      </p>
      <h2 className="mt-2 text-[1.25rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
        Bio
      </h2>
      <div className="mt-4 rounded-[12px] bg-[#faf7f4] px-3.5 py-3 text-[0.9rem] leading-7 text-[#616a7b]">
        {bioText}
      </div>
    </div>
  );
}
