/* eslint-disable @next/next/no-img-element */

import type { PostMedia } from "@/lib/api/posts";

type ProfilePhotosCardProps = {
  media: PostMedia[];
  emptyMessage: string;
};

export default function ProfilePhotosCard({
  media,
  emptyMessage,
}: ProfilePhotosCardProps) {
  const imageMedia = media.filter((item) => item.type === "image");

  return (
    <section
      id="photos"
      className="rounded-[18px] border border-[#e6d8d0] bg-white/88 p-5 shadow-[0_14px_32px_rgba(128,84,53,0.06)]"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ef744b]">
            Photos
          </p>
          <h2 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.05em] text-[#1d243f]">
            Shared media
          </h2>
        </div>
        <span className="rounded-full bg-[#f7f3ef] px-3 py-1 text-[0.78rem] font-semibold text-[#7b7580]">
          {imageMedia.length}
        </span>
      </div>

      {imageMedia.length === 0 ? (
        <p className="mt-4 rounded-[14px] border border-[#efe0d6] bg-[#fff8f3] px-4 py-4 text-[0.9rem] leading-7 text-[#6b7080]">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {imageMedia.map((item, index) => (
            <div
              key={`${item.url}-${index}`}
              className="overflow-hidden rounded-[16px] border border-[#efe0d6] bg-[#f8f3ef]"
            >
              <img
                src={item.url}
                alt="Profile photo"
                className="aspect-square h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
