// import Link from "next/link";

// type HomeProfileCardProps = {
//   initials: string;
//   fullName: string;
//   username: string;
//   email: string;
// };

// export default function HomeProfileCard({
//   initials,
//   fullName,
//   username,
//   email,
// }: HomeProfileCardProps) {
//   return (
//     <section className="rounded-[18px] border border-[#edd8cb] bg-white/84 p-4 shadow-[0_14px_32px_rgba(128,84,53,0.06)]">
//       {/* <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#38a89d]">
//         Your corner
//       </p> */}
//       <div className="mt-3.5 flex items-center gap-3">
//         <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1d243f] text-sm font-semibold text-white">
//           {initials}
//         </span>
//         <div className="min-w-0">
//           <p className="truncate text-[1.05rem] font-semibold tracking-[-0.04em] text-[#1d243f]">
//             {fullName}
//           </p>
//           <p className="truncate text-[0.84rem] text-[#7b7580]">{username}</p>
//           <p className="mt-0.5 truncate text-[0.74rem] text-[#7b7580]">{email}</p>
//         </div>
//       </div>

//       <div className="mt-4 flex gap-2.5">
//         <Link
//           href="/user/profile"
//           className="flex-1 rounded-[12px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-3.5 py-2 text-center text-[0.88rem] font-semibold text-white shadow-[0_8px_18px_rgba(241,111,56,0.16)]"
//         >
//           View profile
//         </Link>
//         <Link
//           href="/settings"
//           className="rounded-[12px] border border-[#edd8cb] bg-[#fff8f3] px-3.5 py-2 text-[0.88rem] font-semibold text-[#526077] transition hover:bg-white"
//         >
//           Settings
//         </Link>
//       </div>
//     </section>
//   );
// }
import Link from "next/link";

type HomeProfileCardProps = {
  initials: string;
  fullName: string;
  username: string;
  email: string;
};

export default function HomeProfileCard({
  initials,
  fullName,
  username,
  email,
}: HomeProfileCardProps) {
  return (
    <section className="w-full rounded-2xl border border-[#edd8cb] bg-white/95 p-4 shadow-md">
      {/* Top Section - Avatar & Info */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1d243f] text-sm font-bold text-white">
          {initials}
        </span>

        {/* Profile Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#1d243f]">
            {fullName}
          </p>
          <p className="truncate text-xs text-[#8b8590]">@{username}</p>
          <p className="truncate text-xs text-[#a89fa6]">{email}</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <Link
          href="/user/profile"
          className="flex-1 rounded-lg bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-3 py-2 text-center text-xs font-semibold text-white shadow-md hover:shadow-lg transition-shadow"
        >
          View profile
        </Link>
        <Link
          href="/user/settings"
          className="flex-1 rounded-lg border border-[#edd8cb] bg-[#fff8f3] px-3 py-2 text-center text-xs font-semibold text-[#526077] hover:bg-white transition-colors"
        >
          Settings
        </Link>
      </div>
    </section>
  );
}
