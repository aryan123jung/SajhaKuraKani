"use client";

import { useState } from "react";

export default function ReportModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-2xl border border-[#f3c6ae]/55 bg-white/65 px-4 py-2.5 text-sm font-semibold text-[#402822] shadow-[0_16px_30px_rgba(120,74,48,0.08)] transition hover:bg-white"
      >
        Report issue
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#120d10]/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-[#f0c7b2]/65 bg-[#fff9f4] p-6 shadow-[0_35px_90px_rgba(38,22,15,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#d9713d]">
                  Report issue
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#1d243f]">
                  Capture feedback while we build.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ebcfbe] text-[#7b5f58] transition hover:bg-white"
                aria-label="Close report dialog"
              >
                x
              </button>
            </div>

            <p className="mt-4 text-sm leading-7 text-[#6a6f81]">
              This is a UI placeholder for now. Later we can wire it to the
              backend or an admin queue without changing the home layout.
            </p>

            <textarea
              rows={5}
              placeholder="Describe the issue you noticed..."
              className="mt-5 w-full rounded-[22px] border border-[#ebd6c9] bg-white px-4 py-3 text-sm text-[#1d243f] outline-none placeholder:text-[#aaa1a0]"
            />

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-[#ead3c4] px-4 py-2.5 text-sm font-semibold text-[#684d45] transition hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl bg-[linear-gradient(135deg,#ff8f5a_0%,#f16f38_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(241,111,56,0.22)]"
              >
                Save draft
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
