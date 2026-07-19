"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPostAction } from "@/lib/actions/posts";
import {
  initialCreatePostActionState,
} from "@/lib/actions/post-state";

type HomePostComposerProps = {
  csrfToken: string;
  className?: string;
  onSuccess?: () => void;
};

export default function HomePostComposer({
  csrfToken,
  className,
  onSuccess,
}: HomePostComposerProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [createState, setCreateState] = useState(initialCreatePostActionState);
  const [isPending, startTransition] = useTransition();

  const handleCreateAction = (formData: FormData) => {
    startTransition(async () => {
      const nextState = await createPostAction(
        initialCreatePostActionState,
        formData
      );

      setCreateState(nextState);

      if (nextState.success) {
        formRef.current?.reset();

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        onSuccess?.();
        router.refresh();
      }
    });
  };

  return (
    <section
      className={`rounded-[18px] border border-[#edd8cb] bg-white/88 p-4 shadow-[0_14px_32px_rgba(128,84,53,0.06)] ${
        className ?? ""
      }`}
    >
      <div>
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[#ef744b]">
          Create post
        </p>
      </div>

      <form ref={formRef} action={handleCreateAction} className="mt-4 space-y-3">
        <input type="hidden" name="_csrf" value={csrfToken} />

        <input
          name="title"
          placeholder="Optional title"
          className="w-full rounded-[14px] border border-[#ead8cd] bg-[#fffaf7] px-4 py-3 text-[0.95rem] text-[#1d243f] outline-none transition focus:border-[#ef744b]"
        />

        <textarea
          name="content"
          rows={5}
          placeholder="What would you like to share today?"
          className="w-full rounded-[14px] border border-[#ead8cd] bg-[#fffaf7] px-4 py-3 text-[0.95rem] leading-6 text-[#1d243f] outline-none transition focus:border-[#ef744b]"
        />

        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8a8791]">
              Visibility
            </span>
            <select
              name="visibility"
              defaultValue="public"
              className="w-full rounded-[14px] border border-[#ead8cd] bg-[#fffaf7] px-4 py-3 text-[0.92rem] text-[#1d243f] outline-none transition focus:border-[#ef744b]"
            >
              <option value="public">Public</option>
              <option value="friends-only">Friends only</option>
              <option value="private">Private</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8a8791]">
              Comments
            </span>
            <select
              name="commentPrivacy"
              defaultValue="everyone"
              className="w-full rounded-[14px] border border-[#ead8cd] bg-[#fffaf7] px-4 py-3 text-[0.92rem] text-[#1d243f] outline-none transition focus:border-[#ef744b]"
            >
              <option value="everyone">Everyone</option>
              <option value="friends-only">Friends only</option>
              <option value="no-one">Disabled</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8a8791]">
              Sharing
            </span>
            <select
              name="sharePrivacy"
              defaultValue="everyone"
              className="w-full rounded-[14px] border border-[#ead8cd] bg-[#fffaf7] px-4 py-3 text-[0.92rem] text-[#1d243f] outline-none transition focus:border-[#ef744b]"
            >
              <option value="everyone">Everyone</option>
              <option value="friends-only">Friends only</option>
              <option value="no-one">Disabled</option>
            </select>
          </label>
        </div>

        <label className="block rounded-[14px] border border-dashed border-[#ebd6c8] bg-[#fffaf7] px-4 py-4">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8a8791]">
            Media
          </span>
          <input
            ref={fileInputRef}
            name="media"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.mp4,.mov,.webm,.mkv,image/jpeg,image/png,video/mp4,video/quicktime,video/webm,video/x-matroska"
            className="mt-3 block w-full text-[0.88rem] text-[#5f6678] file:mr-3 file:rounded-full file:border-0 file:bg-[#ef744b] file:px-4 file:py-2 file:text-[0.82rem] file:font-semibold file:text-white"
          />
        </label>

        {createState.message ? (
          <div
            className={`rounded-[14px] px-4 py-3 text-[0.88rem] leading-6 ${
              createState.success
                ? "border border-[#d8ebe4] bg-[#f3fbf8] text-[#2f8f77]"
                : "border border-[#f1d2c7] bg-[#fff1ec] text-[#b14f3f]"
            }`}
          >
            {createState.message}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-[12px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-5 py-2.5 text-[0.9rem] font-semibold text-white shadow-[0_8px_18px_rgba(241,111,56,0.16)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Publishing..." : "Publish post"}
          </button>
        </div>
      </form>
    </section>
  );
}
