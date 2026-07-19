/* eslint-disable @next/next/no-img-element */

import type { PostMedia } from "@/lib/api/posts";

type PostMediaGalleryProps = {
  media: PostMedia[];
  className?: string;
};

const resolvePostMediaUrl = (url: string) => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return url;
};

export default function PostMediaGallery({
  media,
  className,
}: PostMediaGalleryProps) {
  if (media.length === 0) {
    return null;
  }

  const gridClassName =
    media.length === 1
      ? "grid-cols-1"
      : media.length === 2
        ? "grid-cols-2"
        : "grid-cols-2";

  return (
    <div className={`mt-4 grid gap-0 ${gridClassName} ${className ?? ""}`}>
      {media.map((item, index) => {
        const resolvedUrl = resolvePostMediaUrl(item.url);

        return (
          <div
            key={`${item.url}-${index}`}
            className="overflow-hidden bg-[#f8f3ef]"
          >
            {item.type === "video" ? (
              <video
                controls
                preload="metadata"
                className="h-full max-h-[560px] w-full bg-black object-cover"
              >
                <source src={resolvedUrl} type={item.mimeType} />
              </video>
            ) : (
              <img
                src={resolvedUrl}
                alt="Post media"
                className="h-full max-h-[560px] w-full object-cover"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
