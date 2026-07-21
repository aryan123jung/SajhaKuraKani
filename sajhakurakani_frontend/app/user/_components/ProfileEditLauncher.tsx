/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/lib/actions/profile";
import { initialUpdateProfileActionState } from "@/lib/actions/profile-state";

const PROFILE_MEDIA_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type ProfileEditLauncherProps = {
  csrfToken: string;
  firstName: string;
  lastName: string;
  username: string;
  bio: string;
  profileUrl?: string | null;
  coverUrl?: string | null;
};

export default function ProfileEditLauncher({
  csrfToken,
  firstName,
  lastName,
  username,
  bio,
  profileUrl,
  coverUrl,
}: ProfileEditLauncherProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(profileUrl ?? null);
  const [coverPreview, setCoverPreview] = useState<string | null>(coverUrl ?? null);
  const [localMessage, setLocalMessage] = useState("");
  const [state, setState] = useState({
    ...initialUpdateProfileActionState,
    fields: {
      firstName,
      lastName,
      username,
      bio,
    },
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setState({
      ...initialUpdateProfileActionState,
      fields: {
        firstName,
        lastName,
        username,
        bio,
      },
    });
  }, [firstName, lastName, username, bio]);

  useEffect(() => {
    setProfilePreview(profileUrl ?? null);
  }, [profileUrl]);

  useEffect(() => {
    setCoverPreview(coverUrl ?? null);
  }, [coverUrl]);

  useEffect(() => {
    return () => {
      if (profilePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(profilePreview);
      }

      if (coverPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [profilePreview, coverPreview]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleAction = (formData: FormData) => {
    setLocalMessage("");

    const profileFile = formData.get("profileUrl");
    const coverFile = formData.get("coverUrl");

    if (profileFile instanceof File && profileFile.size > PROFILE_MEDIA_MAX_FILE_SIZE_BYTES) {
      setLocalMessage("Profile image must be 10 MB or smaller.");
      return;
    }

    if (coverFile instanceof File && coverFile.size > PROFILE_MEDIA_MAX_FILE_SIZE_BYTES) {
      setLocalMessage("Cover image must be 10 MB or smaller.");
      return;
    }

    startTransition(async () => {
      const nextState = await updateProfileAction(state, formData);
      setState(nextState);

      if (nextState.success) {
        formRef.current?.reset();
        if (profileInputRef.current) {
          profileInputRef.current.value = "";
        }
        if (coverInputRef.current) {
          coverInputRef.current.value = "";
        }
        setLocalMessage("");
        setProfilePreview(profileUrl ?? null);
        setCoverPreview(coverUrl ?? null);
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setLocalMessage("");
          setIsOpen(true);
        }}
        className="rounded-[12px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-4 py-2.5 text-[0.9rem] font-semibold text-white shadow-[0_10px_22px_rgba(241,111,56,0.18)]"
      >
        Edit profile
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1d243f]/22 px-4 py-6 backdrop-blur-md"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ecd7ca] bg-white/92 text-[#7d665b] shadow-[0_12px_26px_rgba(75,46,28,0.08)] transition hover:bg-white"
              aria-label="Close edit profile dialog"
            >
              x
            </button>

            <section className="max-h-[85vh] overflow-y-auto rounded-[26px] border border-[#e8d5c7] bg-[#fffaf6] p-5 shadow-[0_36px_90px_rgba(38,22,15,0.18)] sm:p-6">
              <div>
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[#ef744b]">
                  Edit profile
                </p>
              </div>

              <form ref={formRef} action={handleAction} className="mt-4 space-y-4">
                <input type="hidden" name="_csrf" value={csrfToken} />

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8a8791]">
                      First name
                    </span>
                    <input
                      name="firstName"
                      defaultValue={state.fields.firstName}
                      className="w-full rounded-[14px] border border-[#ead8cd] bg-[#fffaf7] px-4 py-3 text-[0.95rem] text-[#1d243f] outline-none transition focus:border-[#ef744b]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8a8791]">
                      Last name
                    </span>
                    <input
                      name="lastName"
                      defaultValue={state.fields.lastName}
                      className="w-full rounded-[14px] border border-[#ead8cd] bg-[#fffaf7] px-4 py-3 text-[0.95rem] text-[#1d243f] outline-none transition focus:border-[#ef744b]"
                    />
                  </label>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8a8791]">
                    Username
                  </span>
                  <input
                    name="username"
                    defaultValue={state.fields.username}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    onInput={(event) => {
                      event.currentTarget.value = event.currentTarget.value.toLowerCase();
                    }}
                    className="w-full rounded-[14px] border border-[#ead8cd] bg-[#fffaf7] px-4 py-3 text-[0.95rem] text-[#1d243f] outline-none transition focus:border-[#ef744b]"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8a8791]">
                    Bio
                  </span>
                  <textarea
                    name="bio"
                    rows={4}
                    defaultValue={state.fields.bio}
                    placeholder="Tell people a little about yourself."
                    className="w-full rounded-[14px] border border-[#ead8cd] bg-[#fffaf7] px-4 py-3 text-[0.95rem] leading-6 text-[#1d243f] outline-none transition focus:border-[#ef744b]"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block rounded-[14px] border border-dashed border-[#ebd6c8] bg-[#fffaf7] px-4 py-4">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8a8791]">
                      Profile image
                    </span>
                    {profilePreview ? (
                      <div className="mt-3 h-24 w-24 overflow-hidden rounded-full border border-[#ead8cd] bg-white">
                        <img src={profilePreview} alt="Current profile" className="h-full w-full object-cover" />
                      </div>
                    ) : null}
                    <input
                      ref={profileInputRef}
                      name="profileUrl"
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (!file) {
                          setProfilePreview(profileUrl ?? null);
                          return;
                        }

                        if (file.size > PROFILE_MEDIA_MAX_FILE_SIZE_BYTES) {
                          setLocalMessage("Profile image must be 10 MB or smaller.");
                          event.currentTarget.value = "";
                          setProfilePreview(profileUrl ?? null);
                          return;
                        }

                        const objectUrl = URL.createObjectURL(file);
                        setLocalMessage("");
                        setProfilePreview((currentPreview) => {
                          if (currentPreview?.startsWith("blob:")) {
                            URL.revokeObjectURL(currentPreview);
                          }
                          return objectUrl;
                        });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => profileInputRef.current?.click()}
                      className="mt-3 rounded-full bg-[#ef744b] px-4 py-2 text-[0.82rem] font-semibold text-white"
                    >
                      Choose profile photo
                    </button>
                  </label>

                  <label className="block rounded-[14px] border border-dashed border-[#ebd6c8] bg-[#fffaf7] px-4 py-4">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8a8791]">
                      Cover image
                    </span>
                    {coverPreview ? (
                      <div className="mt-3 h-24 overflow-hidden rounded-[12px] border border-[#ead8cd] bg-white">
                        <img src={coverPreview} alt="Current cover" className="h-full w-full object-cover" />
                      </div>
                    ) : null}
                    <input
                      ref={coverInputRef}
                      name="coverUrl"
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (!file) {
                          setCoverPreview(coverUrl ?? null);
                          return;
                        }

                        if (file.size > PROFILE_MEDIA_MAX_FILE_SIZE_BYTES) {
                          setLocalMessage("Cover image must be 10 MB or smaller.");
                          event.currentTarget.value = "";
                          setCoverPreview(coverUrl ?? null);
                          return;
                        }

                        const objectUrl = URL.createObjectURL(file);
                        setLocalMessage("");
                        setCoverPreview((currentPreview) => {
                          if (currentPreview?.startsWith("blob:")) {
                            URL.revokeObjectURL(currentPreview);
                          }
                          return objectUrl;
                        });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="mt-3 rounded-full bg-[#ef744b] px-4 py-2 text-[0.82rem] font-semibold text-white"
                    >
                      Choose cover photo
                    </button>
                  </label>
                </div>

                {localMessage ? (
                  <div className="rounded-[14px] border border-[#f1d2c7] bg-[#fff1ec] px-4 py-3 text-[0.88rem] leading-6 text-[#b14f3f]">
                    {localMessage}
                  </div>
                ) : null}

                {!localMessage && state.message ? (
                  <div
                    className={`rounded-[14px] px-4 py-3 text-[0.88rem] leading-6 ${
                      state.success
                        ? "border border-[#d8ebe4] bg-[#f3fbf8] text-[#2f8f77]"
                        : "border border-[#f1d2c7] bg-[#fff1ec] text-[#b14f3f]"
                    }`}
                  >
                    {state.message}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-[12px] border border-[#e6d8d0] bg-white px-5 py-2.5 text-[0.9rem] font-semibold text-[#5f6678]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-[12px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-5 py-2.5 text-[0.9rem] font-semibold text-white shadow-[0_8px_18px_rgba(241,111,56,0.16)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isPending ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}
